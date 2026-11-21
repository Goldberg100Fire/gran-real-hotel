import Image from "next/image";
import { SiteHeader } from "@/components/hotel/site-header";

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
    <div className="relative h-56 overflow-hidden md:h-72">
      <Image
        src={imageSrc}
        alt=""
        fill
        className="object-cover scale-105"
        sizes="100vw"
        priority
      />
      <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(28,22,18,0.94)_0%,rgba(44,36,30,0.72)_58%,rgba(28,22,18,0.45)_100%)]" />
      <SiteHeader />
      <div className="relative mx-auto flex h-full max-w-6xl items-end px-6 pb-9">
        <div className="animate-reveal max-w-2xl">
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
