import type { Metadata, Viewport } from "next";
import { Google_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";
import { shareImage } from "@/lib/site/images";
import { SITE_URL, indexingAllowed } from "@/lib/site/seo";
import "./globals.css";

// Police des maquettes, auto-hébergée par next/font (aucun appel à Google côté visiteur).
const googleSans = Google_Sans({
  subsets: ["latin"],
  variable: "--font-google-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: fr.meta.title,
  description: fr.meta.description,
  // Aperçu des liens partagés (WhatsApp, réseaux sociaux, SMS) : image MENAO par défaut.
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: fr.meta.name,
    title: fr.meta.title,
    description: fr.meta.description,
    images: [shareImage()],
  },
  twitter: { card: "summary_large_image", images: [shareImage().url] },
  // Staging et aperçus : jamais indexés (voir lib/site/seo.ts).
  robots: indexingAllowed ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#4869f6" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={googleSans.variable}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
