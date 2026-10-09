import type { Metadata, Viewport } from "next";
import { Google_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { fr } from "@/i18n/fr";
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
  // Staging et aperçus : jamais indexés (voir lib/site/seo.ts).
  robots: indexingAllowed ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#4869f6" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={googleSans.variable}>
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
