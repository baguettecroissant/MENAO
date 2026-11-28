import { upcomingTotal } from "@menao/core";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getGains } from "@/lib/commercial/gains";
import { getCommercialSpace } from "@/lib/commercial/space";
import { formatDayMonth } from "@/lib/format";

const t = fr.commercialGains.upcoming;
const plans = fr.commercialResults.bonuses.scale.plans as Record<string, string>;
const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const money = (cents: number) => euros.format(Math.round(cents / 100));

export const metadata: Metadata = {
  title: `${fr.commercialGains.hero.upcoming} — MENAO`,
  robots: { index: false },
};

/**
 * « À venir » (F-197, lot 86, ADR 0397) : chaque prime possible, ce qu'il manque pour la déclencher
 * (vérification du dossier, fin de l'essai, dossier à compléter). Rien n'est promis.
 */
export default async function CommercialUpcomingPage() {
  const space = await getCommercialSpace("/commercial/resultats/a-venir");
  const gains = space.active ? await getGains(space.supabase) : null;
  const items = gains?.a_venir ?? [];
  const quickest = items.find((i) => i.etape === "dossier");

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={"/commercial/resultats" as Route}
          className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-[1.625rem] leading-tight font-bold tracking-tight sm:text-[2rem]">
            {t.title(money(upcomingTotal(items)))}
          </h1>
          <p className="text-[0.9375rem] text-label">{t.intro}</p>
        </div>
        {!space.active ? (
          <Alert tone="error">{fr.commercialSpace.suspended}</Alert>
        ) : !gains ? (
          <Alert tone="error">{fr.commercialProspects.errors.unavailable}</Alert>
        ) : items.length === 0 ? (
          <EmptyState illustration="documents">{t.empty}</EmptyState>
        ) : (
          <>
            <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-card">
              {items.map((item, i) => (
                <li
                  key={`${item.artisan}-${item.etape}-${i}`}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <b className="truncate text-[0.90625rem]">{item.artisan}</b>
                    <span className="text-[0.78125rem] text-muted-foreground">
                      {item.etape === "essai"
                        ? t.essai(
                            item.date ? formatDayMonth(item.date) : null,
                            item.plan ? (plans[item.plan] ?? null) : null,
                          )
                        : t[item.etape]}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <b className="text-base text-success tabular-nums">
                      {item.centimes != null ? `+${money(item.centimes)}` : "—"}
                    </b>
                    <span className="text-[0.71875rem] text-muted-foreground">
                      {t.when[item.etape]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {quickest && (
              <p className="flex items-start gap-2.5 rounded-card bg-primary-soft px-4 py-3 text-[0.84375rem] leading-snug">
                <Sparkles
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-primary-strong"
                />
                <span>{t.tip(quickest.artisan)}</span>
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
