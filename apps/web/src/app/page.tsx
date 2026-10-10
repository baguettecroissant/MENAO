import type { Route } from "next";
import Link from "next/link";
import { NeedForm } from "@/components/project/need-form";
import { TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "@/lib/site/catalog";
import { createPublicClient } from "@/lib/supabase/public";

const t = fr.home;

// Page statique régénérée toutes les heures (métiers, chiffres).
export const revalidate = 3600;

/** Accueil (F-01) : saisie du besoin, métiers, chiffres réels uniquement. */
export default async function HomePage() {
  const [{ trades }, { data: stats }] = await Promise.all([
    seoCatalog(),
    createPublicClient().rpc("public_stats"),
  ]);
  const counts = stats as { artisans?: number; trades?: number } | null;
  const artisans = counts?.artisans ?? 0;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-12 sm:py-16">
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-3xl font-bold sm:text-5xl">{t.title}</h1>
        <p className="text-lg text-muted-foreground">{t.subtitle}</p>
        {/* F-01 : uniquement des chiffres issus de la base, masqués tant qu'il n'y a personne. */}
        {artisans > 0 && (
          <p className="font-medium text-success">{t.stats(artisans, counts?.trades ?? 0)}</p>
        )}
      </div>
      <div
        id="recherche"
        className="mx-auto w-full max-w-3xl rounded-card border border-border bg-surface p-4 shadow-sm sm:p-8"
      >
        <NeedForm trades={trades} />
      </div>

      <section aria-label={t.stepsTitle} className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">{t.stepsTitle}</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {t.steps.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5"
            >
              <span className="text-2xl font-bold text-primary">{i + 1}</span>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
        <TextLink href="/comment-ca-marche">{t.moreSteps}</TextLink>
      </section>

      <section aria-label={t.tradesTitle} className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">{t.tradesTitle}</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {trades.map((trade) => (
            <li key={trade.code}>
              <Link
                href={`/${trade.code}` as Route}
                className="flex min-h-touch items-center justify-center rounded-card border border-border bg-surface px-3 py-3 text-center font-medium hover:border-primary"
              >
                {trade.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center">
        {t.pro} <TextLink href="/pro">{t.proLink}</TextLink>
      </p>
    </main>
  );
}
