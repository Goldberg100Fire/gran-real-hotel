import { redirect } from "next/navigation";

export const metadata = {
  title: "Mis reservas",
};

/** Las reservas públicas ya no se gestionan en línea. */
export default function MisReservasPage() {
  redirect("/reservar");
}
