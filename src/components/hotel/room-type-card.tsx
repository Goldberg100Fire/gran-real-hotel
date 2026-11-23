import Image from "next/image";
import { formatMoney } from "@/lib/format";
import { HOTEL } from "@/lib/hotel-info";
import type { RoomType, Service } from "@/lib/types";

interface RoomTypeCardProps {
  roomType: RoomType;
  services: Service[];
}

export function RoomTypeCard({ roomType, services }: RoomTypeCardProps) {
  const serviceLine = services.map((service) => service.name).join(" · ");

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
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/75">
            Desde
          </p>
          <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold">
            {formatMoney(roomType.basePrice)}
            <span className="ml-1 text-sm font-sans font-normal text-white/80">
              / noche
            </span>
          </p>
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
        {serviceLine && (
          <p className="text-xs leading-relaxed text-[var(--brand-muted)]">
            {serviceLine}
          </p>
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
