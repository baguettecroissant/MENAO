import type { Route } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomeHero } from "@/components/site/home-hero";
import { TrustSection } from "@/components/site/trust-section";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "@/lib/site/catalog";
import { createPublicClient } from "@/lib/supabase/public";

// Page statique régénérée toutes les heures (métiers, nombre d'artisans vérifiés).
export const revalidate = 3600;

/** Accueil (F-01), maquette « Homepage ». */
export default async function HomePage() {
  const [{ trades }, { data: stats }] = await Promise.all([
    seoCatalog(),
    createPublicClient().rpc("public_stats"),
  ]);
  const artisans = (stats as { artisans?: number } | null)?.artisans ?? 0;

  return (
    <main className="bg-surface">
      <HomeHero verifiedArtisans={artisans} />
      <TrustSection />
      <section
        id="metiers"
        aria-labelledby="tous-les-metiers"
        className="bg-background py-16 sm:py-20"
      >
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 text-center sm:px-6">
          <h2
            id="tous-les-metiers"
            className="text-2xl font-medium tracking-tight sm:text-[1.75rem]"
          >
            {fr.trust.tradesLabel}
          </h2>
          <ul className="flex flex-wrap justify-center gap-2.5">
            {trades.map((trade) => {
              const domain = fr.tradeDomains[trade.code];
              return (
                <li key={trade.code}>
                  <Link
                    href={`/${trade.code}` as Route}
                    className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-border bg-surface px-4 text-[0.9375rem] hover:border-primary hover:text-primary-strong"
                  >
                    <span aria-hidden="true">{domain?.emoji}</span>
                    {trade.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 rounded-hero bg-primary px-6 py-10 text-primary-foreground sm:flex-row sm:items-center sm:px-10">
          <div className="flex flex-col gap-2">
            <p className="text-2xl font-medium">{fr.home.pro}</p>
            <p className="text-white/85">{fr.pro.landing.subtitle}</p>
          </div>
          <ButtonLink href="/pro" variant="secondary" size="lg" className="shrink-0 border-white">
            {fr.home.proLink}
            <ArrowRight aria-hidden="true" className="size-4" />
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
