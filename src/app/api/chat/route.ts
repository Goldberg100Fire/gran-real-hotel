import { NextResponse } from "next/server";
import { answerHotelQuestion } from "@/lib/chat-bot";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { getCatalog } from "@/lib/store";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 400;

export async function POST(request: Request) {
  const limited = checkRateLimit(clientKey(request, "chat"), 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Demasiadas consultas. Intenta en un momento." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const message =
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
      ? (body as { message: string }).message.trim()
      : "";

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: "El mensaje es demasiado largo" },
      { status: 400 },
    );
  }

  const branchId =
    typeof body === "object" &&
    body !== null &&
    "branchId" in body &&
    typeof (body as { branchId: unknown }).branchId === "string"
      ? (body as { branchId: string }).branchId.trim()
      : undefined;

  const catalog = await getCatalog(branchId || undefined);
  const result = answerHotelQuestion(message, {
    roomTypes: catalog.roomTypes,
    priceOffers: catalog.priceOffers,
    services: catalog.services,
    branch: catalog.branch,
  });
  return NextResponse.json(result);
}
