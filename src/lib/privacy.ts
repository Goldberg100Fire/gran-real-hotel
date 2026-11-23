import type { GuestProfile, Reservation } from "@/lib/types";

export function maskDocument(document: string): string {
  const value = document.trim();
  if (value.length <= 4) return "****";
  return `${"*".repeat(value.length - 4)}${value.slice(-4)}`;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}***@${domain}`;
}

export function redactReservationForStaff(
  reservation: Reservation,
  fullAccess: boolean,
): Reservation {
  if (fullAccess) return reservation;
  return {
    ...reservation,
    guestDocument: maskDocument(reservation.guestDocument),
    guestEmail: maskEmail(reservation.guestEmail),
    guestPhone:
      reservation.guestPhone.length > 3
        ? `***${reservation.guestPhone.slice(-3)}`
        : "***",
  };
}

export function redactGuestForStaff(
  guest: GuestProfile,
  fullAccess: boolean,
): GuestProfile | null {
  if (!fullAccess) return null;
  return guest;
}
