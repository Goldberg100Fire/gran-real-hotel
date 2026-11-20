import type { Metadata } from "next";
import { Manrope, Nunito } from "next/font/google";
import { SiteFooter } from "@/components/hotel/site-footer";
import { HOTEL } from "@/lib/hotel-info";
import "./globals.css";

const display = Nunito({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: HOTEL.name,
    template: `%s · ${HOTEL.name}`,
  },
  description: `${HOTEL.tagline}. ${HOTEL.fullAddress}`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
