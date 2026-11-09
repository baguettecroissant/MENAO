import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { CallbackIconLink, CallbackLink } from "@/components/pro-landing/callback-link";
import { PaybackCalculator } from "@/components/pro-landing/payback-calculator";
import { PlanComparisonTable } from "@/components/pro-landing/plan-comparison";
import { PricingPlans } from "@/components/pro-landing/pricing-plans";
import { ProAssistant } from "@/components/pro-landing/pro-assistant";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { FaqJsonLd, FaqList } from "@/components/site/faq-list";
import { SectionHeading } from "@/components/site/section-heading";
import { ButtonLink, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { loadPricing, proObjections } from "@/lib/site/pro-plans";

const t = fr.pro.landing;
const p = t.plansPage;

export const metadata: Metadata = {
  title: `${p.metaTitle} — MENAO`,
  description: p.metaDescription,
  alternates: { canonical: "/pro/formules" },
};

// Formules lues en base (tables plans et plan_features), page régénérée toutes les heures.
export const revalidate = 3600;

/**
 * Formules de l'Espace Pro (lot 19, ADR 0265) : les trois formules au mois ou à l'année, la
 * garantie de l'engagement, le calculateur de rentabilité, le comparatif (avec les assistants IA),
 * les objections et l'appel final. Page à partager par les commerciaux.
 */
export default async function PlansPage() {
  const { pricingPlans, comparison } = await loadPricing();
  const objections = proObjections();

  return (
    <main className="bg-background pb-24 lg:pb-0">
      <section className="px-4 pt-28 pb-10 sm:px-6 sm:pt-36">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center">
          <Breadcrumbs
            items={[
              { label: fr.site.home, href: "/" },
              { label: fr.nav.pro, href: "/pro" },
              { label: p.breadcrumb },
            ]}
          />
          <p className="text-[0.8125rem] font-bold tracking-[0.08em] text-primary-strong uppercase">
            {t.plansEyebrow}
          </p>
          <h1
            id="formules-title"
            className="text-[2.5rem] leading-[1.02] font-bold tracking-tight text-balance sm:text-[3.75rem]"
          >
            {t.plansTitle}
          </h1>
          <p className="max-w-2xl text-pretty text-label sm:text-lg">{t.plansSubtitle}</p>
        </div>
      </section>

      {pricingPlans.length > 0 && (
        <section aria-label={t.plansTitle} className="px-4 pb-16 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-12">
            <PricingPlans plans={pricingPlans} />
          </div>
        </section>
      )}

      <div className="px-4 pb-16 sm:px-6">
        <PaybackCalculator id="formules-calculateur" plans={pricingPlans} />
      </div>

      {comparison.length > 0 && (
        <section
          id="comparatif"
          aria-label={t.compare.title}
          className="scroll-mt-24 px-4 pb-16 sm:px-6"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-8">
            <PlanComparisonTable plans={pricingPlans} comparison={comparison} />
            <p className="mx-auto max-w-3xl text-center text-xs text-muted-foreground">
              {t.plansNote}
            </p>
          </div>
        </section>
      )}

      <section aria-labelledby="formules-faq" className="bg-surface py-16 sm:py-24">
        <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 sm:px-6">
          <SectionHeading id="formules-faq" eyebrow={t.faqEyebrow} title={p.faqTitle} />
          <FaqList items={objections} />
          <TextLink href="/pro/faq" className="self-center">
            {fr.pro.faqPage.seeAll}
          </TextLink>
        </div>
        <FaqJsonLd items={objections} />
      </section>

      <section aria-labelledby="formules-final" className="px-2 py-2 sm:px-4 sm:py-4">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-5 rounded-hero bg-[linear-gradient(150deg,#0b1438_0%,#16236e_58%,#2a3fb8_100%)] px-6 py-16 text-center text-white sm:py-20">
          <h2
            id="formules-final"
            className="text-[2rem] leading-[1.06] font-bold tracking-tight text-balance sm:text-[3rem]"
          >
            {t.finalTitle}
          </h2>
          <p className="max-w-2xl text-pretty text-white/80">{t.finalText}</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <ButtonLink href="/pro/inscription" size="lg">
              {t.hero.signUp}
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
            <CallbackLink tone="dark" />
          </div>
        </div>
      </section>

      {/* Téléphone : l'inscription toujours à portée de pouce (ADR 0265). */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2.5 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <ButtonLink href="/pro/inscription" size="lg" block>
          {t.start}
        </ButtonLink>
        <CallbackIconLink />
      </div>
      <ProAssistant />
    </main>
  );
}
