import Image from "next/image";
import { formatMoney } from "@/lib/format";
import { HOTEL } from "@/lib/hotel-info";
import type { RoomType, Service } from "@/lib/types";

interface RoomTypeCardProps {
  roomType: RoomType;
  services: Service[];
  displayPrice?: number;
  offerLabel?: string | null;
  basePriceLabel?: boolean;
}

export function RoomTypeCard({
  roomType,
  services,
  displayPrice,
  offerLabel,
  basePriceLabel = false,
}: RoomTypeCardProps) {
  const price = displayPrice ?? roomType.basePrice;
  const showBase =
    basePriceLabel && displayPrice != null && displayPrice !== roomType.basePrice;

  return (
    <article className="group flex h-full flex-col overflow-hidden bg-white shadow-[0_22px_50px_-34px_rgba(44,36,30,0.55)] ring-1 ring-[var(--brand-line)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--brand-mist)]">
        {roomType.imagePath ? (
          <Image
            src={roomType.imagePath}
            alt={roomType.name}
            fill
            className="object-cover transition duration-700 group-hover:scale-[1.04]"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${roomType.imageGradient}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
        {offerLabel && (
          <p className="absolute left-4 top-4 rounded-full bg-[var(--brand-gold)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--brand-deep)]">
            {offerLabel}
          </p>
        )}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/75">
            {offerLabel ? "Tarifa del periodo" : "Desde"}
          </p>
          <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold">
            {formatMoney(price)}
            <span className="ml-1 text-sm font-sans font-normal text-white/80">
              / noche
            </span>
          </p>
          {showBase && (
            <p className="mt-1 text-xs text-white/75">
              Habitual {formatMoney(roomType.basePrice)}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col space-y-4 p-6">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--brand-ink)]">
            {roomType.name}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--brand-muted)]">
            {roomType.description}
          </p>
        </div>
        <p className="text-sm text-[var(--brand-ink)]">
          {roomType.bedType} · hasta {roomType.maxGuests} huésped
          {roomType.maxGuests === 1 ? "" : "es"}
        </p>
        {services.length > 0 && (
          <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-[var(--brand-muted)]">
            {services.map((service) => (
              <li key={service.id} className="flex items-center gap-1.5">
                <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--brand-gold)]" />
                {service.name}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto pt-2">
          <a
            href={`tel:${HOTEL.phoneMobile}`}
            className="inline-flex w-full items-center justify-center rounded-full bg-[var(--brand-deep)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)]"
          >
            Llamar para reservar
          </a>
        </div>
      </div>
    </article>
  );
}
