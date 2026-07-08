import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "NEFELI — your astrology companion",
    template: "%s · NEFELI",
  },
  description:
    "A warm, emotionally intelligent astrology companion that reads the sky through your life — your healing, your work, your relationships — and remembers what you share.",
  applicationName: "NEFELI",
  openGraph: {
    title: "NEFELI — your astrology companion",
    description:
      "An astrology companion that reads the sky through your life, remembers what you tell it, and meets you where you are — day after day.",
    siteName: "NEFELI",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#08080b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
