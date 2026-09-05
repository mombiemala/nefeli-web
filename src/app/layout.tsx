import type { Metadata, Viewport } from "next";
import { Cormorant, DM_Sans, Marcellus } from "next/font/google";
import "./globals.css";

// Brand type: Cormorant (ethereal display serif), DM Sans (clean body),
// Marcellus (classical, letter-spaced wordmark & eyebrows).
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const cormorant = Cormorant({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});
const marcellus = Marcellus({ variable: "--font-marcellus", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: {
    default: "NEFELI — your astrology companion",
    template: "%s · NEFELI",
  },
  description:
    "A personal astrology companion that reads the whole sky through your life — your healing, your work, your relationships — and remembers what you share.",
  applicationName: "NEFELI",
  openGraph: {
    title: "NEFELI — your astrology companion",
    description:
      "The sky, read through your life. NEFELI reads your whole chart through what's actually happening for you — and remembers.",
    siteName: "NEFELI",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#141024",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${cormorant.variable} ${marcellus.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
