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
}

/** Perfil de huésped: un documento ↔ un correo. */
export interface GuestProfile {
  document: string;
  email: string;
  name: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface RoomType {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  maxGuests: number;
  bedType: string;
  imageGradient: string;
  imagePath?: string;
  serviceIds: string[];
}

export interface Room {
  id: string;
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

export interface HotelStore {
  services: Service[];
  roomTypes: RoomType[];
  rooms: Room[];
  reservations: Reservation[];
  mailOutbox: MailMessage[];
  loginCodes: LoginCode[];
  staffMembers: StaffMember[];
  guests: GuestProfile[];
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
