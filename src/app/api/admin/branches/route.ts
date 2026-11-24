import { NextResponse } from "next/server";
import { canManageStaff, requireStaff } from "@/lib/auth";
import { assertCsrf, csrfErrorResponse } from "@/lib/csrf";
import {
  createBranch,
  listBranches,
  setBranchHeroFromUpload,
  updateBranch,
} from "@/lib/store";
import type { RoomTypeImageBlob } from "@/lib/types";
import {
  ROOM_IMAGE_MAX_BYTES,
  ROOM_IMAGE_MIME,
} from "@/lib/hotel-images";

export async function GET() {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const branches = await listBranches();
  return NextResponse.json({ branches });
}

export async function POST(request: Request) {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canManageStaff(user.role)) {
    return NextResponse.json(
      { error: "Solo el dueño puede crear sucursales" },
      { status: 403 },
    );
  }

  try {
    await assertCsrf(request);
  } catch (error) {
    const { error: message, status } = csrfErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }

  try {
    const body = await request.json();
    const branch = await createBranch({
      name: String(body.name ?? ""),
      city: String(body.city ?? ""),
      region: String(body.region ?? ""),
      country: String(body.country ?? ""),
      address: String(body.address ?? ""),
      phoneMobile: String(body.phoneMobile ?? ""),
      phoneLandline: String(body.phoneLandline ?? ""),
      tagline: String(body.tagline ?? ""),
      heroImagePath: body.heroImagePath
        ? String(body.heroImagePath)
        : undefined,
      coverImagePath: body.coverImagePath
        ? String(body.coverImagePath)
        : undefined,
      slug: body.slug ? String(body.slug) : undefined,
    });

    // Foto propia de la nueva sede (fachada / edificio).
    if (body.heroPhoto?.data && body.heroPhoto?.contentType) {
      const contentType = String(body.heroPhoto.contentType);
      if (!ROOM_IMAGE_MIME.has(contentType)) {
        return NextResponse.json(
          { error: "Formato de foto no permitido", branch },
          { status: 400 },
        );
      }
      const data = String(body.heroPhoto.data);
      const bytes = Buffer.from(data, "base64");
      if (bytes.length > ROOM_IMAGE_MAX_BYTES) {
        return NextResponse.json(
          { error: "La foto es demasiado grande", branch },
          { status: 400 },
        );
      }
      const blob: RoomTypeImageBlob = {
        contentType: contentType as RoomTypeImageBlob["contentType"],
        data,
        updatedAt: new Date().toISOString(),
      };
      const withHero = await setBranchHeroFromUpload(
        branch.id,
        blob,
        `Fachada ${branch.city}`,
      );
      return NextResponse.json({ branch: withHero }, { status: 201 });
    }

    return NextResponse.json({ branch }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo crear la sucursal";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireStaff();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canManageStaff(user.role)) {
    return NextResponse.json(
      { error: "Solo el dueño puede editar sucursales" },
      { status: 403 },
    );
  }

  try {
    await assertCsrf(request);
  } catch (error) {
    const { error: message, status } = csrfErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }

  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "Falta el id" }, { status: 400 });
    }

    let branch = await updateBranch(id, {
      name: typeof body.name === "string" ? body.name : undefined,
      tagline: typeof body.tagline === "string" ? body.tagline : undefined,
      city: typeof body.city === "string" ? body.city : undefined,
      region: typeof body.region === "string" ? body.region : undefined,
      country: typeof body.country === "string" ? body.country : undefined,
      address: typeof body.address === "string" ? body.address : undefined,
      phoneMobile:
        typeof body.phoneMobile === "string" ? body.phoneMobile : undefined,
      phoneLandline:
        typeof body.phoneLandline === "string" ? body.phoneLandline : undefined,
      heroImagePath:
        typeof body.heroImagePath === "string" ? body.heroImagePath : undefined,
      coverImagePath:
        typeof body.coverImagePath === "string" ? body.coverImagePath : undefined,
      active: typeof body.active === "boolean" ? body.active : undefined,
      slug: typeof body.slug === "string" ? body.slug : undefined,
    });

    if (body.heroPhoto?.data && body.heroPhoto?.contentType) {
      const contentType = String(body.heroPhoto.contentType);
      if (!ROOM_IMAGE_MIME.has(contentType)) {
        return NextResponse.json(
          { error: "Formato de foto no permitido" },
          { status: 400 },
        );
      }
      const data = String(body.heroPhoto.data);
      const bytes = Buffer.from(data, "base64");
      if (bytes.length > ROOM_IMAGE_MAX_BYTES) {
        return NextResponse.json(
          { error: "La foto es demasiado grande" },
          { status: 400 },
        );
      }
      const blob: RoomTypeImageBlob = {
        contentType: contentType as RoomTypeImageBlob["contentType"],
        data,
        updatedAt: new Date().toISOString(),
      };
      branch = await setBranchHeroFromUpload(
        id,
        blob,
        `Fachada ${branch.city}`,
      );
    }

    return NextResponse.json({ branch });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
