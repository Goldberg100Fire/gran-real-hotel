import { NextResponse } from "next/server";
import { canEditPricing, requireStaff } from "@/lib/auth";
import {
  createPriceOffer,
  deletePriceOffer,
  listPriceOffers,
  updatePriceOffer,
} from "@/lib/store";
import type { PriceOfferKind } from "@/lib/types";

const KINDS: PriceOfferKind[] = [
  "fiesta",
  "temporada_alta",
  "oferta",
  "otro",
];

function parseKind(value: unknown): PriceOfferKind | null {
  return typeof value === "string" && KINDS.includes(value as PriceOfferKind)
    ? (value as PriceOfferKind)
    : null;
}

export async function GET() {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canEditPricing(user.role)) {
    return NextResponse.json(
      { error: "Solo el jefe puede gestionar ofertas y temporadas" },
      { status: 403 },
    );
  }

  const offers = await listPriceOffers();
  return NextResponse.json({ offers });
}

export async function POST(request: Request) {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canEditPricing(user.role)) {
    return NextResponse.json(
      { error: "Solo el jefe puede crear ofertas y temporadas" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const kind = parseKind(body.kind) ?? "fiesta";
    const offer = await createPriceOffer({
      title: String(body.title ?? ""),
      description: String(body.description ?? ""),
      kind,
      startDate: String(body.startDate ?? ""),
      endDate: String(body.endDate ?? ""),
      active: body.active !== false,
      priority: Number(body.priority ?? 0),
      prices:
        body.prices && typeof body.prices === "object"
          ? (body.prices as Record<string, number>)
          : {},
    });
    return NextResponse.json({ offer }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo crear la oferta";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canEditPricing(user.role)) {
    return NextResponse.json(
      { error: "Solo el jefe puede editar ofertas y temporadas" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "Falta el id" }, { status: 400 });
    }

    const kind = body.kind !== undefined ? parseKind(body.kind) : undefined;
    if (body.kind !== undefined && !kind) {
      return NextResponse.json({ error: "Tipo de oferta inválido" }, { status: 400 });
    }

    const offer = await updatePriceOffer(id, {
      title: typeof body.title === "string" ? body.title : undefined,
      description:
        typeof body.description === "string" ? body.description : undefined,
      kind: kind ?? undefined,
      startDate: typeof body.startDate === "string" ? body.startDate : undefined,
      endDate: typeof body.endDate === "string" ? body.endDate : undefined,
      active: typeof body.active === "boolean" ? body.active : undefined,
      priority:
        typeof body.priority === "number" ? body.priority : undefined,
      prices:
        body.prices && typeof body.prices === "object"
          ? (body.prices as Record<string, number>)
          : undefined,
    });

    return NextResponse.json({ offer });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canEditPricing(user.role)) {
    return NextResponse.json(
      { error: "Solo el jefe puede eliminar ofertas" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "Falta el id" }, { status: 400 });
    }
    await deletePriceOffer(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
