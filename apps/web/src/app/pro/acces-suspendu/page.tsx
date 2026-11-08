import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { fr } from "@/i18n/fr";
import { teamContext } from "@/lib/artisan/space";
import { signOut } from "@/lib/auth/actions";

const t = fr.pro.team.suspended;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * Membre d'une équipe (F-89, ADR 0240) dont l'accès est suspendu (formule réduite ou choix du
 * patron) : rien de l'entreprise n'est lisible, le patron peut le réactiver depuis « Mon équipe ».
 */
export default async function SuspendedAccessPage() {
  const team = await teamContext();
  if (!team?.suspended) redirect("/pro/tableau-de-bord");
  return (
    <div className="app-nette flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <Logo />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col items-center gap-5 px-5 py-12 text-center">
        <span className="inline-flex size-18 items-center justify-center rounded-full bg-warning-soft text-warning">
          <Lock className="size-8" aria-hidden />
        </span>
        <h1 className="font-display text-[1.75rem] leading-tight font-bold tracking-tight sm:text-[2rem]">
          {t.heading}
        </h1>
        <p className="text-base leading-relaxed text-label">{t.text(team.company)}</p>
        <p className="w-full rounded-card border border-border bg-surface p-4 text-sm text-label shadow-card">
          {t.contact}{" "}
          <a
            href={`mailto:${t.email}`}
            className="font-semibold text-foreground underline-offset-2 hover:underline"
          >
            {t.email}
          </a>
          .
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex min-h-touch items-center rounded-full border border-border bg-surface px-5 font-semibold hover:bg-background"
          >
            {fr.mySpace.signOut}
          </button>
        </form>
      </main>
    </div>
  );
}
