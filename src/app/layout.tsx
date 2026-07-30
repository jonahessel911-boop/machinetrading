import type { Metadata } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { MetaPixel } from "@/components/MetaPixel";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "heftruckverkocht.nl | Je heftruck in 24 uur verkocht",
  description:
    "Verkoop je heftruck via betrouwbare kopers met een goed bod. Gratis aanmelden, vrijblijvend en snel geregeld.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${sans.variable} ${mono.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <MetaPixel />
        {children}
      </body>
    </html>
  );
}
