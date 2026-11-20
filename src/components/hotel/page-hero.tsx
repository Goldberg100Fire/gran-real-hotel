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
    <div className="relative h-52 overflow-hidden md:h-64">
      <Image
        src={imageSrc}
        alt=""
        fill
        className="object-cover"
        sizes="100vw"
        priority
      />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(44,36,30,0.92)_0%,rgba(61,49,41,0.75)_55%,rgba(44,36,30,0.55)_100%)]" />
      <SiteHeader />
      <div className="relative mx-auto flex h-full max-w-6xl items-end px-6 pb-8">
        <div className="animate-reveal">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-white md:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-xl text-sm text-white/80 md:text-base">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
