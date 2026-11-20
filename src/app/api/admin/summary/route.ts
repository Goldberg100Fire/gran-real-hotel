import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminSnapshot } from "@/lib/store";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const snapshot = await getAdminSnapshot();
  return NextResponse.json(snapshot);
}
