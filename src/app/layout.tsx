import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { SiteFooter } from "@/components/hotel/site-footer";
import { HOTEL_NAME, HOTEL_TAGLINE } from "@/lib/seed";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: HOTEL_NAME,
    template: `%s · ${HOTEL_NAME}`,
  },
  description: HOTEL_TAGLINE,
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
