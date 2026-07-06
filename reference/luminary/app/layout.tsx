import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Luminary — Your AI Astrology Companion",
  description:
    "A deeply personal AI astrologer that knows your chart and your life story, and interprets every transit through the lens of your healing journey.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} dark`}>
      <body className="starfield">
        <Providers>
          <div className="relative z-10">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
