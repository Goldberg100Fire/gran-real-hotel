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
    <article className="group overflow-hidden rounded-[1.5rem] bg-white/80 shadow-[0_20px_60px_-30px_rgba(11,61,74,0.45)] ring-1 ring-[var(--ocean-line)] backdrop-blur">
      <div
        className={`relative h-48 bg-gradient-to-br ${roomType.imageGradient} transition duration-700 group-hover:scale-[1.02]`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_45%)]" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">
              Desde
            </p>
            <p className="font-[family-name:var(--font-display)] text-3xl">
              {formatMoney(roomType.basePrice)}
              <span className="ml-1 text-sm font-sans font-normal text-white/80">
                / noche
              </span>
            </p>
          </div>
          <span className="rounded-full bg-black/25 px-3 py-1 text-xs backdrop-blur">
            {availableCount} de {totalRooms} libres
          </span>
        </div>
      </div>
      <div className="space-y-4 p-6">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ocean-ink)]">
            {roomType.name}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ocean-muted)]">
            {roomType.description}
          </p>
        </div>
        <p className="text-sm text-[var(--ocean-ink)]">
          {roomType.bedType} · hasta {roomType.maxGuests} huéspedes
        </p>
        <ul className="flex flex-wrap gap-2">
          {services.slice(0, 5).map((service) => (
            <li
              key={service.id}
              className="rounded-full bg-[var(--ocean-mist)] px-3 py-1 text-xs text-[var(--ocean-ink)]"
            >
              {service.name}
            </li>
          ))}
        </ul>
        {availableCount > 0 ? (
          <Link
            href={`/reservar?${query.toString()}`}
            className="inline-flex w-full items-center justify-center rounded-full bg-[var(--ocean-deep)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--ocean-ink)]"
          >
            Reservar ahora
          </Link>
        ) : (
          <span className="inline-flex w-full items-center justify-center rounded-full bg-slate-200 px-4 py-3 text-sm font-medium text-slate-500">
            Sin disponibilidad
          </span>
        )}
      </div>
    </article>
  );
}
