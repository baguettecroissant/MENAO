"use client";

import {
  ANNUAL_FREE_MONTHS,
  ENGAGEMENT_GUARANTEE,
  ENGAGEMENT_MONTHS,
  annualPriceCents,
  monthlyEquivalentCents,
} from "@menao/core";
import { CalendarCheck, CircleCheck, ShieldCheck, Wallet } from "lucide-react";
import { useState } from "react";
import { ButtonLink, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pro.landing;
const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const price = (cents: number) => euros.format(cents / 100);

export type PricingPlan = {
  code: string;
  nom: string;
  accroche: string | null;
  monthlyCents: number;
  avantages: string[];
  ouverte: boolean;
};

/**
 * Cartes des formules (F-15, ADR 0200, d'après la page tarifs de TrustUp Pro) : paiement au mois
 * sans engagement, ou à l'année payé d'avance avec 2 mois offerts, puis l'engagement et sa
 * garantie. Seule une formule ouverte propose de commencer l'essai.
 */
export function PricingPlans({ plans }: { plans: PricingPlan[] }) {
  const [yearly, setYearly] = useState(false);
  const engagement = [
    { Icon: CalendarCheck, ...t.engagement.monthly },
    {
      Icon: Wallet,
      title: t.engagement.yearly.title,
      text: t.engagement.yearly.text(ENGAGEMENT_MONTHS, ANNUAL_FREE_MONTHS),
    },
    {
      Icon: ShieldCheck,
      title: t.engagement.guarantee.title,
      text: t.engagement.guarantee.text(
        ENGAGEMENT_GUARANTEE.minRequests,
        ENGAGEMENT_GUARANTEE.consecutiveMonths,
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div
        role="group"
        aria-label={t.billing.label}
        className="mx-auto inline-flex rounded-pill border border-border bg-background p-1 text-sm font-medium"
      >
        {[false, true].map((isYearly) => (
          <button
            key={String(isYearly)}
            type="button"
            aria-pressed={yearly === isYearly}
            onClick={() => setYearly(isYearly)}
            className="inline-flex min-h-10 items-center gap-2 rounded-pill px-4 text-muted-foreground transition-colors aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            {isYearly ? t.billing.yearly : t.billing.monthly}
            {isYearly && (
              <span className="rounded-pill bg-success-soft px-2 py-0.5 text-xs text-success">
                {t.billing.yearlyBadge(ANNUAL_FREE_MONTHS)}
              </span>
            )}
          </button>
        ))}
      </div>

      <ul className="grid items-start gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const annual = annualPriceCents(plan.monthlyCents);
          return (
            <li
              key={plan.code}
              className={`flex flex-col gap-5 rounded-hero border p-6 sm:p-7 ${
                plan.ouverte
                  ? "border-primary bg-surface shadow-raised ring-4 ring-primary/10"
                  : "border-border bg-background"
              }`}
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-medium">{plan.nom}</h3>
                  {plan.ouverte ? (
                    <StatusBadge>{t.open}</StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral">{t.soon}</StatusBadge>
                  )}
                </div>
                {plan.accroche && <p className="text-sm text-muted-foreground">{plan.accroche}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <p>
                  <span className="text-[2.75rem] leading-none font-medium tracking-tight">
                    {price(yearly ? annual : plan.monthlyCents)}
                  </span>{" "}
                  <span className="text-sm text-muted-foreground">
                    {yearly ? t.perYear : t.perMonth}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {yearly
                    ? t.billing.yearlyHint(
                        price(monthlyEquivalentCents(annual)),
                        ANNUAL_FREE_MONTHS,
                      )
                    : t.billing.monthlyHint}
                </p>
                {yearly && (
                  <p className="text-xs text-muted-foreground">
                    {t.billing.yearlyEngagement(ENGAGEMENT_MONTHS)}
                  </p>
                )}
              </div>
              {plan.ouverte && (
                <p className="inline-flex items-center gap-1.5 self-start rounded-pill bg-success-soft px-3 py-1 text-sm font-medium text-success">
                  <CircleCheck aria-hidden="true" className="size-4" />
                  {t.trial}
                </p>
              )}
              <ul className="flex flex-col gap-2.5 border-t border-border pt-5">
                {plan.avantages.map((avantage) => (
                  <li key={avantage} className="flex items-start gap-2.5 text-sm">
                    <CircleCheck
                      aria-hidden="true"
                      className={`mt-0.5 size-4 shrink-0 ${plan.ouverte ? "text-primary" : "text-subtle-foreground"}`}
                    />
                    {avantage}
                  </li>
                ))}
              </ul>
              {plan.ouverte && (
                <ButtonLink href="/pro/inscription" size="lg" block>
                  {t.start}
                </ButtonLink>
              )}
            </li>
          );
        })}
      </ul>

      <section aria-label={t.engagement.title}>
        <ul className="grid gap-4 sm:grid-cols-3">
          {engagement.map(({ Icon, title, text }) => (
            <li
              key={title}
              className="flex flex-col gap-2 rounded-card border border-border bg-background p-5"
            >
              <p className="flex items-center gap-2 font-medium">
                <Icon aria-hidden="true" className="size-4 text-primary" />
                {title}
              </p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
