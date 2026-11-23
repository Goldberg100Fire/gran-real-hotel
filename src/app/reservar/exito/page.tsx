import { redirect } from "next/navigation";

export const metadata = {
  title: "Reserva",
};

export default function ReservaExitoPage() {
  redirect("/reservar");
}
