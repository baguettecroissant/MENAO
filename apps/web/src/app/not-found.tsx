import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { NotFoundView } from "@/components/site/not-found-view";
import { fr } from "@/i18n/fr";

export const metadata: Metadata = { title: `${fr.notFound.title} — MENAO` };

/** Page introuvable pour toute autre adresse : logo vers l'accueil, puis la page MENAO. */
export default function NotFound() {
  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" aria-label={fr.notFound.logo} className="rounded-md">
            <Logo />
          </Link>
        </div>
      </header>
      <NotFoundView />
    </>
  );
}
