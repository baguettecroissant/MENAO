"use client";

import {
  ANNUAL_FREE_MONTHS,
  ENGAGEMENT_GUARANTEE,
  ENGAGEMENT_MONTHS,
  annualPriceCents,
  monthlyEquivalentCents,
} from "@menao/core";
import { CalendarCheck, CircleCheck, ShieldCheck, Sparkles, Wallet } from "lucide-react";
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
  /** Formule mise en avant (« Recommandé », `plans.recommandee`). */
  recommandee: boolean;
  /** Assistants IA inclus, en une ligne (droits `plans.limites.agents`, ADR 0265). */
  agents?: string | null;
};

/**
 * Cartes des formules (F-15, ADR 0200, d'après la page tarifs de TrustUp Pro) : paiement au mois
 * sans engagement, ou à l'année payé d'avance avec 2 mois offerts (prix ramené au mois), puis
 * l'engagement et sa garantie. La formule recommandée est mise en avant ; chaque formule ouverte
 * propose de commencer l'essai.
 */
export function PricingPlans({
  plans,
  compact = false,
}: {
  plans: PricingPlan[];
  /** Aperçu de la page /pro (ADR 0265) : pas de choix mois/année, 3 points par formule, pas de garantie. */
  compact?: boolean;
}) {
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
      {!compact && (
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
      )}

      <ul className="grid items-stretch gap-5 pt-3 lg:grid-cols-3">
        {plans.map((plan) => {
          const annual = annualPriceCents(plan.monthlyCents);
          return (
            <li
              key={plan.code}
              className={`relative flex flex-col gap-5 rounded-hero border p-6 sm:p-7 ${
                // Refonte du lot 19 (ADR 0265) : la formule recommandée en bleu nuit, en relief.
                plan.recommandee
                  ? "border-foreground bg-foreground text-white shadow-raised lg:-translate-y-3"
                  : "border-border bg-surface"
              }`}
            >
              {plan.recommandee && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-pill bg-primary px-3 py-1 text-xs font-bold tracking-wide text-primary-foreground uppercase">
                  {t.recommended}
                </span>
              )}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-2xl font-bold">{plan.nom}</h3>
                  {!plan.ouverte && <StatusBadge tone="neutral">{t.soon}</StatusBadge>}
                </div>
                {plan.accroche && (
                  <p
                    className={`text-sm ${plan.recommandee ? "text-white/75" : "text-muted-foreground"}`}
                  >
                    {plan.accroche}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                {/* À l'année : le prix ramené au mois, le montant facturé par an en dessous. */}
                <p>
                  <span className="font-display text-[2.875rem] leading-none font-bold tracking-tight">
                    {price(yearly ? monthlyEquivalentCents(annual) : plan.monthlyCents)}
                  </span>{" "}
                  <span
                    className={`text-sm ${plan.recommandee ? "text-white/75" : "text-muted-foreground"}`}
                  >
                    {t.perMonth}
                  </span>
                </p>
                <p
                  className={`text-sm ${plan.recommandee ? "text-white/75" : "text-muted-foreground"}`}
                >
                  {yearly
                    ? t.billing.yearlyHint(price(annual), ANNUAL_FREE_MONTHS)
                    : t.billing.monthlyHint}
                </p>
                {yearly && (
                  <p
                    className={`text-xs ${plan.recommandee ? "text-white/70" : "text-muted-foreground"}`}
                  >
                    {t.billing.yearlyEngagement(ENGAGEMENT_MONTHS)}
                  </p>
                )}
              </div>
              {plan.ouverte && (
                <p
                  className={`inline-flex items-center gap-1.5 self-start rounded-pill px-3 py-1 text-sm font-semibold ${
                    plan.recommandee
                      ? "bg-[#7ee2b0]/15 text-[#7ee2b0]"
                      : "bg-success-soft text-success"
                  }`}
                >
                  <CircleCheck aria-hidden="true" className="size-4" />
                  {t.trial}
                </p>
              )}
              {plan.agents && (
                <p
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-[0.8125rem] font-semibold ${
                    plan.recommandee
                      ? "bg-white/10 text-white"
                      : "bg-primary-soft text-primary-strong"
                  }`}
                >
                  <Sparkles aria-hidden="true" className="size-4 shrink-0" />
                  {plan.agents}
                </p>
              )}
              <ul
                className={`flex flex-col gap-2.5 border-t pt-5 ${plan.recommandee ? "border-white/15" : "border-border"}`}
              >
                {(compact ? plan.avantages.slice(0, 3) : plan.avantages).map((avantage) => (
                  <li key={avantage} className="flex items-start gap-2.5 text-sm">
                    <CircleCheck
                      aria-hidden="true"
                      className={`mt-0.5 size-4 shrink-0 ${
                        plan.recommandee
                          ? "text-[#7ee2b0]"
                          : plan.ouverte
                            ? "text-success"
                            : "text-subtle-foreground"
                      }`}
                    />
                    {avantage}
                  </li>
                ))}
              </ul>
              {plan.ouverte && (
                <ButtonLink
                  href="/pro/inscription"
                  size="lg"
                  variant={plan.recommandee ? "primary" : "dark"}
                  block
                  className="mt-auto"
                >
                  {t.start}
                </ButtonLink>
              )}
            </li>
          );
        })}
      </ul>

      {!compact && (
        <section aria-label={t.engagement.title}>
          {/* La garantie en avant (ADR 0265) : elle lève la peur de payer pour rien. */}
          <ul className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
            {engagement.map(({ Icon, title, text }, i) => (
              <li
                key={title}
                className={`flex gap-4 rounded-[1.375rem] bg-surface p-5 ${
                  i === 2 ? "border-2 border-success lg:order-first" : "border border-border"
                }`}
              >
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-[0.875rem] ${
                    i === 2 ? "bg-success-soft text-success" : "bg-background text-primary"
                  }`}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="font-display text-[1.0625rem] font-bold">{title}</p>
                  <p className="text-sm text-label">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
