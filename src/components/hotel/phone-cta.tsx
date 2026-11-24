import { HOTEL } from "@/lib/hotel-info";

type PhoneCtaProps = {
  className?: string;
  label?: string;
  phone?: string;
};

export function PhoneCta({
  className = "",
  label = "Llamar para reservar",
  phone = HOTEL.phoneMobile,
}: PhoneCtaProps) {
  return (
    <a
      href={`tel:${phone}`}
      className={
        className ||
        "inline-flex items-center justify-center rounded-full bg-[var(--brand-gold)] px-7 py-3.5 text-sm font-bold text-[var(--brand-deep)] shadow-lg transition hover:brightness-110"
      }
    >
      {label}
    </a>
  );
}
