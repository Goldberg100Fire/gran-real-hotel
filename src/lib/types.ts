export type RoomStatus = "disponible" | "ocupada" | "mantenimiento" | "limpieza";

export type PaymentMethod =
  | "pagoefectivo"
  | "pago_en_hotel"
  | "tarjeta"
  | "yape"
  | "plin"
  | "transferencia";

export type ReservationStatus =
  | "pendiente"
  | "confirmada"
  | "cancelada"
  | "completada";

export type PaymentStatus = "pendiente" | "pagado" | "fallido" | "reembolsado";

/** Roles del sistema: clientes vs personal autorizado del hotel. */
export type UserRole = "cliente" | "empleado" | "jefe";

export type StaffRole = "empleado" | "jefe";

export interface StaffMember {
  email: string;
  name: string;
  role: StaffRole;
  active: boolean;
  createdAt: string;
  createdBy: string;
  /** Hash scrypt; nunca se envía al cliente. */
  passwordHash?: string;
  passwordSetAt?: string;
  /** Empleado pidió recuperar contraseña. */
  resetRequestedAt?: string | null;
  /** Hasta cuándo el jefe autorizó un cambio sin la contraseña actual. */
  resetAuthorizedUntil?: string | null;
}

/** Vista segura del personal para el panel (sin hash). */
export type StaffMemberPublic = Omit<StaffMember, "passwordHash"> & {
  hasPassword: boolean;
  resetPending: boolean;
  resetAuthorized: boolean;
};

/** Perfil de huésped: un documento ↔ un correo. */
export interface GuestProfile {
  document: string;
  email: string;
  name: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

/** Una sede del hotel: dirección, teléfonos y fotos propias. */
export interface HotelBranch {
  id: string;
  /** URL pública: /sede/[slug] */
  slug: string;
  name: string;
  tagline: string;
  city: string;
  region: string;
  country: string;
  address: string;
  fullAddress: string;
  phoneMobile: string;
  phoneLandline: string;
  /** Foto principal / fachada de esta sede */
  heroImagePath: string;
  /** Foto secundaria (contacto, bloques) */
  coverImagePath?: string;
  active: boolean;
  /** La sede original (Otuzco) */
  isPrimary?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface RoomTypeImageBlob {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  /** Base64 sin prefijo data: */
  data: string;
  updatedAt: string;
}

export interface RoomType {
  id: string;
  /** Sucursal a la que pertenece este tipo */
  branchId: string;
  name: string;
  description: string;
  basePrice: number;
  maxGuests: number;
  bedType: string;
  imageGradient: string;
  /** Ruta pública: stock /hotel/... o /api/media/room/{id} */
  imagePath?: string;
  /** Foto subida por el jefe (persistida en el catálogo). */
  imageBlob?: RoomTypeImageBlob;
  /** Para cache-bust de fotos subidas (sin enviar el blob). */
  imageUpdatedAt?: string;
  serviceIds: string[];
}

/**
 * Ofertas públicas:
 * - oferta: descuento por cantidad de noches
 * - fiesta: paquete (días fijos + costo total por tipo)
 * - temporada_alta / otro: compatibilidad (precio por noche)
 */
export type PriceOfferKind = "fiesta" | "oferta" | "temporada_alta" | "otro";

export interface PriceOffer {
  id: string;
  /** Sucursal donde aplica la oferta */
  branchId: string;
  title: string;
  description: string;
  kind: PriceOfferKind;
  /** YYYY-MM-DD inclusive (vigencia / fechas de la fiesta) */
  startDate: string;
  /** YYYY-MM-DD inclusive */
  endDate: string;
  active: boolean;
  /** Si hay solape, gana el de mayor prioridad. */
  priority: number;
  /**
   * Precio por noche (S/) por tipo.
   * Usado en temporada/legacy; en fiesta puede ir vacío.
   */
  prices: Record<string, number>;
  /** oferta: noches mínimas para aplicar el descuento */
  minNights?: number;
  /** oferta: porcentaje de descuento sobre la tarifa habitual (1–90) */
  discountPercent?: number;
  /** fiesta: noches del paquete de hospedaje */
  packageNights?: number;
  /** fiesta: costo total del paquete (S/) por tipo de habitación */
  packagePrices?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  branchId: string;
  number: string;
  floor: number;
  roomTypeId: string;
  status: RoomStatus;
  notes: string;
}

export interface Reservation {
  id: string;
  code: string;
  roomTypeId: string;
  roomId: string | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestDocument: string;
  specialRequests: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: ReservationStatus;
  nights: number;
  totalAmount: number;
  createdAt: string;
  /** Código CIP único de PagoEfectivo */
  cipCode?: string;
  cipUrl?: string | null;
  cipExpiresAt?: string | null;
  cipMode?: "live" | "demo";
}

export interface MailMessage {
  id: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  mode: "resend" | "demo";
  delivered: boolean;
  createdAt: string;
}

export interface LoginCode {
  email: string;
  code: string;
  expiresAt: string;
  createdAt: string;
}

/** Foto del catálogo: de una sede y, opcionalmente, de un tipo de habitación. */
export interface GalleryImage {
  id: string;
  label: string;
  /** Sucursal dueña de la foto (fachada o habitaciones de esa sede). */
  branchId: string;
  /** /hotel/... o /api/media/gallery/{id} */
  path: string;
  /** Si está definido, solo se usa en ese tipo (ej. type-doble). */
  roomTypeId?: string | null;
  imageBlob?: RoomTypeImageBlob;
  imageUpdatedAt?: string;
  createdAt: string;
}

export type GalleryImagePublic = Omit<GalleryImage, "imageBlob">;

/** Dominio Resend verificado / en proceso para enviar a cualquier correo. */
export interface MailSettings {
  domain: string;
  domainId: string;
  status: string;
  fromAddress: string;
  updatedAt: string;
}

export interface HotelStore {
  branches: HotelBranch[];
  services: Service[];
  roomTypes: RoomType[];
  rooms: Room[];
  reservations: Reservation[];
  mailOutbox: MailMessage[];
  loginCodes: LoginCode[];
  staffMembers: StaffMember[];
  guests: GuestProfile[];
  priceOffers: PriceOffer[];
  galleryImages: GalleryImage[];
  mailSettings?: MailSettings | null;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pagoefectivo: "PagoEfectivo (código CIP)",
  pago_en_hotel: "Pago en el hotel",
  tarjeta: "Tarjeta",
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia bancaria",
};

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  disponible: "Disponible",
  ocupada: "Ocupada",
  mantenimiento: "Mantenimiento",
  limpieza: "Limpieza",
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  completada: "Completada",
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  cliente: "Cliente",
  empleado: "Empleado",
  jefe: "Jefe / dueño",
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  empleado: "Empleado",
  jefe: "Jefe / dueño",
};

export const PRICE_OFFER_KIND_LABELS: Record<PriceOfferKind, string> = {
  oferta: "Oferta (descuento por noches)",
  fiesta: "Fiesta / paquete",
  temporada_alta: "Temporada alta",
  otro: "Otro",
};
