import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { fr } from "@/i18n/fr";
import "./globals.css";

export const metadata: Metadata = {
  title: fr.meta.title,
  description: fr.meta.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh">
        <header className="border-b border-border bg-surface">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="text-xl font-bold text-primary">
              {fr.nav.home}
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/mon-espace" className="font-medium">
                {fr.nav.mySpace}
              </Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
