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

  return (
    <article className="group overflow-hidden rounded-[1.5rem] bg-white/90 shadow-[0_20px_60px_-30px_rgba(45,36,30,0.45)] ring-1 ring-[var(--brand-line)]">
      <div className="relative h-52 overflow-hidden bg-[var(--brand-mist)]">
        {roomType.imagePath ? (
          <Image
            src={roomType.imagePath}
            alt={roomType.name}
            fill
            className="object-cover transition duration-700 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${roomType.imageGradient}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Desde</p>
            <p className="font-[family-name:var(--font-display)] text-3xl">
              {formatMoney(roomType.basePrice)}
              <span className="ml-1 text-sm font-sans font-normal text-white/80">
                / noche
              </span>
            </p>
          </div>
          <span className="rounded-full bg-black/30 px-3 py-1 text-xs backdrop-blur">
            {availableCount} de {totalRooms} libres
          </span>
        </div>
      </div>
      <div className="space-y-4 p-6">
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
        <ul className="flex flex-wrap gap-2">
          {services.map((service) => (
            <li
              key={service.id}
              className="rounded-full bg-[var(--brand-mist)] px-3 py-1 text-xs text-[var(--brand-ink)]"
            >
              {service.name}
            </li>
          ))}
        </ul>
        {availableCount > 0 ? (
          <Link
            href={`/reservar?${query.toString()}`}
            className="inline-flex w-full items-center justify-center rounded-full bg-[var(--brand-deep)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--brand-ink)]"
          >
            Reservar ahora
          </Link>
        ) : (
          <span className="inline-flex w-full items-center justify-center rounded-full bg-stone-200 px-4 py-3 text-sm font-medium text-stone-500">
            Sin disponibilidad
          </span>
        )}
      </div>
    </article>
  );
}
