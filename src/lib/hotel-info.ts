export const HOTEL = {
  name: "Gran Real Hotel",
  stars: 3,
  tagline: "Otuzco te espera",
  city: "Otuzco",
  region: "La Libertad",
  country: "Perú",
  address: "Calle Tacna Nº 542",
  fullAddress: "Calle Tacna Nº 542 · Otuzco · La Libertad",
  phoneMobile: "978113578",
  phoneLandline: "044 727074",
  logoPath: "/hotel/logo.png",
} as const;

/** Sede principal (Otuzco). Cada sucursal nueva tiene su propia dirección y fotos. */
export const DEFAULT_BRANCH_ID = "branch-otuzco";
export const DEFAULT_BRANCH_SLUG = "otuzco";

export function createPrimaryBranch(now = new Date().toISOString()) {
  return {
    id: DEFAULT_BRANCH_ID,
    slug: DEFAULT_BRANCH_SLUG,
    name: `${HOTEL.name} Otuzco`,
    tagline: HOTEL.tagline,
    city: HOTEL.city,
    region: HOTEL.region,
    country: HOTEL.country,
    address: HOTEL.address,
    fullAddress: HOTEL.fullAddress,
    phoneMobile: HOTEL.phoneMobile,
    phoneLandline: HOTEL.phoneLandline,
    heroImagePath: "/hotel/matrimonial-1.png",
    coverImagePath: "/hotel/matrimonial-2.png",
    active: true,
    isPrimary: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function slugifyBranchName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "sede";
}
