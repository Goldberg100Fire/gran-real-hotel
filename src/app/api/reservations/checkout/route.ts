import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { validateGuestDocument } from "@/lib/document";
import { HOTEL } from "@/lib/hotel-info";
import { sendReservationReceipt } from "@/lib/mail";
import { createPagoEfectivoCip } from "@/lib/pagoefectivo";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import {
  createReservation,
  getCatalog,
  updateReservationCip,
} from "@/lib/store";

/** Genera reserva + código CIP único de PagoEfectivo. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json(
        { error: "Inicia sesión con tu correo para reservar" },
        { status: 401 },
      );
    }

    const limit = checkRateLimit(
      clientKey(request, `checkout:${user.email}`),
      5,
      30 * 60 * 1000,
    );
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Demasiados intentos. Espera ${limit.retryAfterSec}s.` },
        { status: 429 },
      );
    }

    const body = await request.json();
    const {
      roomTypeId,
      checkIn,
      checkOut,
      guests,
      guestName,
      guestPhone,
      guestDocument,
      specialRequests,
    } = body ?? {};

    if (
      !roomTypeId ||
      !checkIn ||
      !checkOut ||
      !guestName ||
      !guestPhone ||
      !guestDocument
    ) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios de la reserva" },
        { status: 400 },
      );
    }

    const docCheck = validateGuestDocument(String(guestDocument));
    if (!docCheck.ok) {
      return NextResponse.json({ error: docCheck.error }, { status: 400 });
    }
    if (user.role === "cliente" && !user.document) {
      return NextResponse.json(
        { error: "Completa tu documento de identidad antes de pagar" },
        { status: 400 },
      );
    }
    if (
      user.role === "cliente" &&
      user.document &&
      user.document !== docCheck.document
    ) {
      return NextResponse.json(
        {
          error:
            "El documento no coincide con el de tu cuenta. Un cliente = un documento.",
        },
        { status: 400 },
      );
    }

    const reservation = await createReservation({
      roomTypeId: String(roomTypeId),
      checkIn: String(checkIn),
      checkOut: String(checkOut),
      guests: Number(guests) || 1,
      guestName: String(guestName),
      guestEmail: user.email,
      guestPhone: String(guestPhone),
      guestDocument: docCheck.document,
      specialRequests: specialRequests ? String(specialRequests) : "",
      paymentMethod: "pagoefectivo",
      paymentStatus: "pendiente",
      status: "pendiente",
    });

    const { roomTypes } = await getCatalog();
    const roomType = roomTypes.find((type) => type.id === reservation.roomTypeId);
    if (!roomType) {
      return NextResponse.json(
        { error: "Tipo de habitación no encontrado" },
        { status: 400 },
      );
    }

    const cip = await createPagoEfectivoCip({
      amount: reservation.totalAmount,
      transactionCode: reservation.id,
      userEmail: user.email,
      userName: reservation.guestName,
      userPhone: reservation.guestPhone,
      userDocument: reservation.guestDocument,
      paymentConcept: `${HOTEL.name} · ${roomType.name} · ${reservation.code}`,
      expiryHours: 48,
    });

    const updated = await updateReservationCip(reservation.id, {
      cipCode: cip.cip,
      cipUrl: cip.cipUrl,
      cipExpiresAt: cip.expiresAt,
      cipMode: cip.mode,
    });

    try {
      await sendReservationReceipt({ reservation: updated, roomType });
    } catch (error) {
      console.error("No se pudo enviar correo de CIP:", error);
    }

    return NextResponse.json({
      reservation: updated,
      cip: {
        code: updated.cipCode,
        url: updated.cipUrl,
        expiresAt: updated.cipExpiresAt,
        mode: updated.cipMode,
        amount: updated.totalAmount,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo generar el CIP";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
