"use client";

import {
  ANNUAL_FREE_MONTHS,
  ENGAGEMENT_MONTHS,
  annualPriceCents,
  monthlyEquivalentCents,
} from "@menao/core";
import { CircleCheck, Inbox, Info, ShieldCheck, Sparkles } from "lucide-react";
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
  /** Demandes de chantier par mois (plafond), en tête de la carte : la première raison de venir. */
  requests?: number | "illimite" | null;
};

/**
 * Cartes des formules (F-15, ADR 0200, d'après la page tarifs de TrustUp Pro) : paiement au mois,
 * ou à l'année payé d'avance avec 2 mois offerts (prix ramené au mois), puis le fonctionnement de
 * l'abonnement d'un an (F-184, ADR 0383). La formule recommandée est mise en avant ; chaque
 * formule ouverte propose de commencer l'essai.
 */
export function PricingPlans({
  plans,
  compact = false,
}: {
  plans: PricingPlan[];
  /** Aperçu de la page /pro (ADR 0265) : pas de choix mois/année, 3 points par formule, pas d'étapes. */
  compact?: boolean;
}) {
  const [yearly, setYearly] = useState(false);
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
              {/* Les demandes de chantier d'abord (retour de l'utilisateur du 20/11/2026). */}
              {plan.requests != null && (
                <p
                  className={`flex items-center gap-2.5 rounded-xl px-3.5 py-3 font-display text-[1.0625rem] leading-snug font-bold ${
                    plan.recommandee ? "bg-white/12 text-white" : "bg-success-soft text-foreground"
                  }`}
                >
                  <Inbox
                    aria-hidden="true"
                    className={`size-5 shrink-0 ${plan.recommandee ? "text-[#7ee2b0]" : "text-success"}`}
                  />
                  {plan.requests === "illimite"
                    ? t.requests.unlimited
                    : t.requests.limited(plan.requests)}
                </p>
              )}
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
        <section aria-labelledby="abonnement-titre" className="flex flex-col gap-4">
          <h3 id="abonnement-titre" className="font-display text-xl font-bold tracking-tight">
            {t.engagement.title}
          </h3>
          <ol className="grid gap-5 rounded-[1.375rem] border border-border bg-surface p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
            {t.engagement.steps.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-2">
                <span
                  aria-hidden="true"
                  className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${
                    i === 1 ? "bg-success-soft text-success" : "bg-primary-soft text-primary-strong"
                  }`}
                >
                  {i + 1}
                </span>
                <p className="font-display text-[1.0625rem] font-bold">{step.title}</p>
                <p className="text-sm text-label">{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex gap-3 rounded-[1.375rem] bg-success-soft p-5">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
              <div className="flex flex-col gap-1">
                <p className="font-bold">{t.engagement.stop.title}</p>
                <p className="text-sm text-label">{t.engagement.stop.text}</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-[1.375rem] border border-border bg-surface p-5">
              <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="flex flex-col gap-1">
                <p className="font-bold">{t.engagement.year.title}</p>
                <p className="text-sm text-label">{t.engagement.year.text}</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
