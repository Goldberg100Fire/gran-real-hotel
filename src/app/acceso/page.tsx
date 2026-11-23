import { redirect } from "next/navigation";

export const metadata = {
  title: "Acceso",
};

/** El público ya no inicia sesión; las consultas van por el bot o por teléfono. */
export default function AccesoPage() {
  redirect("/");
}
