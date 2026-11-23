import { ConsultarChat } from "@/components/hotel/consultar-chat";
import { PageHero } from "@/components/hotel/page-hero";

export const metadata = {
  title: "Consultas",
};

export default function ConsultarPage() {
  return (
    <main>
      <PageHero
        title="Consultas"
        subtitle="Pregunta por precios, habitaciones u ofertas. Sin registro."
        imageSrc="/hotel/simple.png"
      />
      <section className="mx-auto max-w-2xl px-6 py-10">
        <ConsultarChat />
      </section>
    </main>
  );
}
