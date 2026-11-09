import { ENGAGEMENT_GUARANTEE } from "@menao/core";
import { CircleCheck, ShieldCheck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ButtonLink, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pro.landing;
const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/** Prix d'entrée et garantie de l'engagement (pages Pro par métier, ADR 0267). */
export function PriceGuarantee({ plan }: { plan: { nom: string; monthlyCents: number } }) {
  return (
    <section aria-label={t.plansTitle} className="bg-primary-soft px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto grid max-w-6xl items-center gap-8 rounded-hero bg-surface p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-10">
        <div className="flex flex-col gap-3">
          <span className="inline-flex items-center gap-1.5 self-start rounded-pill bg-success-soft px-3 py-1 text-sm font-semibold text-success">
            <CircleCheck aria-hidden="true" className="size-4" />
            {t.trial}
          </span>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold text-label">{t.campaign.priceFrom}</span>
            <span className="font-display text-[3rem] leading-none font-bold tracking-tight whitespace-nowrap sm:text-[3.5rem]">
              {euros.format(plan.monthlyCents / 100)}
            </span>
            <span className="text-label">{t.campaign.priceUnit(plan.nom)}</span>
          </p>
          <Link
            href={"/pro/formules" as Route}
            className={`self-start rounded-sm font-semibold text-primary-strong hover:underline ${focusRing}`}
          >
            {t.plansCompare}
          </Link>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex gap-3.5 rounded-2xl bg-success-soft p-4">
            <ShieldCheck aria-hidden="true" className="size-6 shrink-0 text-success" />
            <div className="flex flex-col gap-0.5">
              <p className="font-bold text-success">{t.engagement.guarantee.title}</p>
              <p className="text-sm text-label">
                {t.engagement.guarantee.text(
                  ENGAGEMENT_GUARANTEE.minRequests,
                  ENGAGEMENT_GUARANTEE.consecutiveMonths,
                )}
              </p>
            </div>
          </div>
          <ButtonLink href="/pro/inscription" size="lg">
            {t.hero.signUp}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
