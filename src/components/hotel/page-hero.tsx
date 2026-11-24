import Image from "next/image";
import { SiteHeader } from "@/components/hotel/site-header";
import { HOTEL } from "@/lib/hotel-info";

export function PageHero({
  title,
  subtitle,
  imageSrc = "/hotel/matrimonial-2.png",
}: {
  title: string;
  subtitle?: string;
  imageSrc?: string;
}) {
  return (
    <div className="relative isolate min-h-[18rem] overflow-hidden md:min-h-[22rem]">
      <Image
        src={imageSrc}
        alt=""
        fill
        className="object-cover scale-105"
        sizes="100vw"
        priority
        unoptimized={imageSrc.startsWith("/api/media/")}
      />
      <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(28,22,18,0.94)_0%,rgba(44,36,30,0.72)_58%,rgba(28,22,18,0.45)_100%)]" />
      <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[var(--brand-cream)] to-transparent" />
      <SiteHeader />
      <div className="relative mx-auto flex min-h-[18rem] max-w-6xl flex-col justify-end px-6 pb-10 pt-24 md:min-h-[22rem] md:pb-12">
        <div className="animate-reveal max-w-2xl">
          <Image
            src={HOTEL.logoPath}
            alt={HOTEL.name}
            width={200}
            height={86}
            className="mb-5 h-10 w-auto drop-shadow-md md:h-11"
          />
          <div className="mb-3 h-px w-12 bg-[var(--brand-gold)]" />
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-white md:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 md:text-base">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
