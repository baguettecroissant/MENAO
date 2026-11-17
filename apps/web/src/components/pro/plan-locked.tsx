import { Lock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pro.planLocked;

/**
 * Fonction comprise dans une formule supérieure (ADR 0363) : ce qu'elle fait, dans quelles
 * formules elle se trouve, et le lien vers les formules. Remplace l'outil sur sa page.
 */
export function PlanLocked({ title, text }: { title: string; text: string }) {
  return (
    <section className="flex max-w-2xl flex-col items-start gap-4 rounded-card border border-border bg-surface p-6 shadow-card">
      <span className="flex size-11 items-center justify-center rounded-input bg-primary-soft text-primary-strong">
        <Lock aria-hidden="true" className="size-5" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg">{title}</h2>
        <p className="text-[0.9375rem] leading-relaxed text-label">{text}</p>
        <p className="text-sm font-semibold">{t.included}</p>
      </div>
      <ButtonLink href={"/pro/onboarding/formule" as Route} block={false}>
        {t.cta}
      </ButtonLink>
    </section>
  );
}

/** Page d'un outil de la bibliothèque non compris dans la formule : retour, titre, explication. */
export function LockedPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={"/pro/bibliotheque" as Route}
          className="self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          ← {fr.pro.library.work.back}
        </Link>
        <h1 className="text-[1.75rem] leading-[1.05] sm:text-[2rem]">{title}</h1>
        {children}
      </div>
    </main>
  );
}
