import { NextResponse } from "next/server";
import { getRoomTypeImageBlob } from "@/lib/store";

export const runtime = "nodejs";

/** Foto pública de un tipo de habitación (subida por el jefe). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const blob = await getRoomTypeImageBlob(id);
  if (!blob) {
    return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });
  }

  const bytes = Buffer.from(blob.data, "base64");
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": blob.contentType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      "Content-Length": String(bytes.length),
    },
  });
}
