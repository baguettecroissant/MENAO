import { BadgeCheck, CircleCheck, Headset, Inbox, Mic, ShieldCheck, Wallet } from "lucide-react";
import { ENGAGEMENT_GUARANTEE } from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { CallbackIconLink, CallbackLink } from "@/components/pro-landing/callback-link";
import { CampaignCodeBanner } from "@/components/pro-landing/campaign-code-banner";
import {
  CampaignSignupLink,
  CampaignTradePicker,
} from "@/components/pro-landing/campaign-trade-picker";
import { CommissionCalculator } from "@/components/pro-landing/commission-calculator";
import { ProAssistant } from "@/components/pro-landing/pro-assistant";
import { ProFinalCta } from "@/components/pro-landing/pro-final-cta";
import { ProofStrip } from "@/components/pro-landing/proof-strip";
import { FaqList } from "@/components/site/faq-list";
import { SectionHeading } from "@/components/site/section-heading";
import { focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { loadPricing, proObjections } from "@/lib/site/pro-plans";
import { createPublicClient } from "@/lib/supabase/public";

const t = fr.pro.landing;
const c = t.campaign;
const BENEFIT_ICONS = [Inbox, Mic, Wallet, Headset];
const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
// Montant de l'abonnement Base si la table des formules n'est pas lisible (150 € HT, ADR 0010).
const BASE_FALLBACK_CENTS = 15000;

export const metadata: Metadata = {
  title: `${c.metaTitle} — MENAO`,
  description: c.metaDescription,
  // Page de campagne : même contenu que /pro, hors des résultats de recherche (ADR 0266).
  robots: { index: false, follow: true },
  alternates: { canonical: "/pro" },
};

export const revalidate = 3600;

/**
 * Page d'atterrissage des campagnes (lot 20, ADR 0266) : publicités, QR codes des flyers, liens des
 * commerciaux et des partenaires (/p/<code>/pro). Une seule action, s'inscrire : le métier se
 * choisit dès le bandeau, puis l'inscription reprend à l'étape suivante.
 */
export default async function CampaignPage() {
  const [{ pricingPlans, baseCents }, { data: trades }] = await Promise.all([
    loadPricing(),
    createPublicClient()
      .from("trades")
      .select("code, label")
      .eq("active", true)
      .order("sort_order"),
  ]);
  const objections = proObjections().slice(0, 4);
  const base = pricingPlans.find((plan) => plan.ouverte) ?? pricingPlans[0];
  const premium = pricingPlans.find((plan) => plan.code === "premium");
  const entreprise = pricingPlans.find((plan) => plan.code === "entreprise");

  return (
    <main className="flex flex-1 flex-col pb-24 lg:pb-0">
      <section className="bg-[linear-gradient(150deg,#0b1438_0%,#16236e_58%,#2a3fb8_100%)] text-white">
        <CampaignCodeBanner />
        <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:h-20 sm:px-6">
          <span className="flex items-center gap-2">
            <Logo tone="white" />
            <span className="rounded-chip bg-white/15 px-2 py-0.5 text-xs font-bold">
              {c.badge}
            </span>
          </span>
          <div className="hidden sm:block">
            <CallbackLink tone="dark" />
          </div>
        </header>
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-4 pb-16 sm:px-6 sm:pb-24 lg:grid-cols-[minmax(0,1fr)_29rem] lg:gap-14 lg:pt-10">
          <div className="flex flex-col gap-5 sm:gap-6">
            <span className="hidden self-start rounded-pill bg-white/12 px-3 py-1 text-sm font-bold sm:inline-flex">
              {t.hero.eyebrow}
            </span>
            <h1 className="text-[2.375rem] leading-[1.02] font-bold tracking-tight text-balance sm:text-[3.5rem] lg:text-[3.75rem]">
              {t.hero.titleLead} <span className="text-[#aebcff]">{t.hero.titleAccent}</span>
            </h1>
            <p className="max-w-xl text-pretty text-white/85 sm:text-lg">{c.subtitle}</p>
            <ul className="flex flex-col gap-2">
              {t.hero.proofs.map((proof) => (
                <li
                  key={proof}
                  className="flex items-center gap-2 text-sm font-semibold text-white/90"
                >
                  <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-[#7ee2b0]" />
                  {proof}
                </li>
              ))}
            </ul>
          </div>
          <CampaignTradePicker trades={trades ?? []} />
        </div>
      </section>

      <ProofStrip />

      <section aria-labelledby="rejoindre-commission" className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col gap-5">
            <SectionHeading
              id="rejoindre-commission"
              eyebrow={t.commission.eyebrow}
              title={t.commission.title}
              align="left"
            />
            <p className="text-label">{t.commission.text}</p>
            <ul className="flex flex-col gap-2.5">
              {t.commission.bullets.map((bullet) => (
                <li key={bullet} className="flex items-center gap-2.5 font-semibold">
                  <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-success" />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
          <CommissionCalculator subscriptionCents={baseCents ?? BASE_FALLBACK_CENTS} />
        </div>
      </section>

      <section aria-labelledby="rejoindre-outil" className="px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <SectionHeading
            id="rejoindre-outil"
            eyebrow={t.features.eyebrow}
            title={t.features.title}
          />
          <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {c.benefits.map((benefit, i) => {
              const Icon = BENEFIT_ICONS[i] ?? BadgeCheck;
              const dark = i === 3;
              return (
                <li
                  key={benefit.title}
                  className="flex flex-col gap-3 rounded-[1.25rem] border border-border bg-surface p-5 sm:p-6"
                >
                  <span
                    className={`flex size-11 items-center justify-center rounded-[0.875rem] ${
                      dark ? "bg-foreground text-white" : "bg-primary-soft text-primary"
                    }`}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="font-display text-lg leading-tight font-bold">{benefit.title}</h3>
                  <p className="text-[0.9375rem] leading-relaxed text-label">{benefit.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {base && (
        <section aria-label={t.plansTitle} className="bg-primary-soft px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-8 rounded-hero bg-surface p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-10">
            <div className="flex flex-col gap-3.5">
              <span className="inline-flex items-center gap-1.5 self-start rounded-pill bg-success-soft px-3 py-1 text-sm font-semibold text-success">
                <CircleCheck aria-hidden="true" className="size-4" />
                {t.trial}
              </span>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold text-label">{c.priceFrom}</span>
                <span className="font-display text-[3rem] leading-none font-bold tracking-tight whitespace-nowrap sm:text-[3.75rem]">
                  {euros.format(base.monthlyCents / 100)}
                </span>
                <span className="text-label">{c.priceUnit(base.nom)}</span>
              </p>
              {premium && entreprise && (
                <p className="text-pretty text-label">
                  {c.priceOthers(
                    euros.format(premium.monthlyCents / 100),
                    euros.format(entreprise.monthlyCents / 100),
                  )}
                </p>
              )}
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
              <CampaignSignupLink />
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="rejoindre-faq" className="py-16 sm:py-20">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 sm:px-6">
          <SectionHeading id="rejoindre-faq" eyebrow={t.faqEyebrow} title={t.plansPage.faqTitle} />
          <FaqList items={objections} />
        </div>
      </section>

      <ProFinalCta id="rejoindre-final" action={<CampaignSignupLink arrow />} />

      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
        <span>© {new Date().getFullYear()} MENAO</span>
        <nav aria-label={fr.footer.legal} className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/mentions-legales" className="hover:text-foreground">
            {fr.footer.legalNotice}
          </Link>
          <Link href="/cgv-artisans" className="hover:text-foreground">
            {fr.footer.termsPro}
          </Link>
          <Link href="/confidentialite" className="hover:text-foreground">
            {fr.footer.privacy}
          </Link>
        </nav>
      </footer>

      {/* Téléphone : l'inscription toujours à portée de pouce. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2.5 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <CampaignSignupLink block />
        <CallbackIconLink />
      </div>
      <ProAssistant />
    </main>
  );
}
