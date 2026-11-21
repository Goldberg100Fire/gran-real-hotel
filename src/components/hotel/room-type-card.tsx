import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { RoomType, Service } from "@/lib/types";

interface RoomTypeCardProps {
  roomType: RoomType;
  services: Service[];
  availableCount: number;
  totalRooms: number;
  checkIn?: string;
  checkOut?: string;
}

export function RoomTypeCard({
  roomType,
  services,
  availableCount,
  totalRooms,
  checkIn,
  checkOut,
}: RoomTypeCardProps) {
  const query = new URLSearchParams({
    tipo: roomType.id,
    ...(checkIn ? { checkIn } : {}),
    ...(checkOut ? { checkOut } : {}),
  });

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
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--brand-ink)]">
              {roomType.name}
            </h3>
            <span className="shrink-0 text-xs text-[var(--brand-muted)]">
              {availableCount}/{totalRooms} libres
            </span>
          </div>
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
          {availableCount > 0 ? (
            <Link
              href={`/reservar?${query.toString()}`}
              className="inline-flex w-full items-center justify-center rounded-full bg-[var(--brand-deep)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)]"
            >
              Reservar ahora
            </Link>
          ) : (
            <span className="inline-flex w-full items-center justify-center rounded-full bg-[var(--brand-mist)] px-4 py-3 text-sm font-medium text-[var(--brand-muted)]">
              Sin disponibilidad
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
