import type { Metadata } from "next";
import { ArrowRight, Check, CircleCheck, CircleX, X } from "lucide-react";
import type { ReactNode } from "react";
import { CtaBand } from "@/components/site/cta-band";
import { FaqJsonLd, FaqList } from "@/components/site/faq-list";
import {
  ChooseVisual,
  DescribeVisual,
  MeetVisual,
  PaymentVisual,
  ProgressVisual,
  QuoteSignVisual,
  ReceptionVisual,
} from "@/components/site/journey-visuals";
import { PageHero } from "@/components/site/page-hero";
import { SectionHeading } from "@/components/site/section-heading";
import { Steps } from "@/components/site/steps";
import { ButtonLink, Tag } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pages.howItWorks;
const faq = fr.pages.faq;
const FAQ = [
  faq.project.items[0]!,
  faq.project.items[3]!,
  faq.payments.items[0]!,
  faq.trust.items[2]!,
];
const STEP_VISUALS: ReactNode[] = [
  <DescribeVisual key="describe" />,
  <ChooseVisual key="choose" />,
  <MeetVisual key="meet" />,
  <QuoteSignVisual key="quote" />,
  <PaymentVisual key="payment" />,
  <ReceptionVisual key="reception" />,
];

export const metadata: Metadata = {
  title: `${t.title} — MENAO`,
  description: t.metaDescription,
  alternates: { canonical: "/comment-ca-marche" },
};

/**
 * Comment ça marche (F-03) : le parcours du particulier en six étapes illustrées, le rôle de
 * MENAO, le parcours de l'artisan et les questions fréquentes.
 */
export default function HowItWorksPage() {
  return (
    <main className="bg-background">
      <PageHero
        id="how-title"
        eyebrow={t.eyebrow}
        title={t.heroTitle}
        accent={t.heroAccent}
        subtitle={t.intro}
        breadcrumbs={[{ label: fr.site.home, href: "/" }, { label: t.title }]}
        actions={
          <>
            <ButtonLink href="/recherche" variant="secondary" size="lg" className="border-white">
              {t.cta}
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
            <ButtonLink
              href="#artisans"
              variant="ghost"
              size="lg"
              className="border border-white/50 text-white hover:bg-white/10 hover:text-white"
            >
              {t.ctaPro}
            </ButtonLink>
          </>
        }
        aside={
          <div className="mx-auto w-full max-w-md">
            <ProgressVisual />
          </div>
        }
      />

      <nav
        aria-label={t.audienceLabel}
        className="sticky top-16 z-20 flex justify-center px-4 py-4"
      >
        <div className="inline-flex rounded-pill border border-border bg-surface/90 p-1 shadow-card backdrop-blur">
          <a
            href="#particuliers"
            className="rounded-pill px-5 py-2 text-sm font-medium hover:bg-primary-softer hover:text-primary-strong"
          >
            {t.clientTab}
          </a>
          <a
            href="#artisans"
            className="rounded-pill px-5 py-2 text-sm font-medium hover:bg-primary-softer hover:text-primary-strong"
          >
            {t.proTab}
          </a>
        </div>
      </nav>

      {/* Parcours du particulier */}
      <section
        id="particuliers"
        aria-labelledby="how-client"
        className="scroll-mt-32 pt-6 pb-16 sm:pb-24"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
          <SectionHeading
            id="how-client"
            eyebrow={t.clientEyebrow}
            title={t.clientTitle}
            subtitle={t.clientSubtitle}
          />
          <ol className="flex flex-col gap-5">
            {t.client.map((step, i) => (
              <li
                key={step.title}
                className="grid grid-cols-1 items-center gap-8 rounded-hero border border-border bg-surface p-6 shadow-card sm:p-10 lg:grid-cols-2 lg:gap-16"
              >
                <div className={`flex flex-col gap-4 ${i % 2 ? "lg:order-2" : ""}`}>
                  <span
                    aria-hidden="true"
                    className="text-5xl leading-none font-medium tracking-tight text-primary/80 tabular-nums"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Tag className="self-start">{step.tag}</Tag>
                  <h3 className="text-2xl leading-tight font-medium tracking-tight text-balance">
                    {step.title}
                  </h3>
                  <p className="leading-relaxed text-pretty text-muted-foreground">{step.text}</p>
                </div>
                <div
                  className={`rounded-card bg-background px-5 py-8 sm:px-8 ${i % 2 ? "lg:order-1" : ""}`}
                >
                  <div className="mx-auto w-full max-w-sm">{STEP_VISUALS[i]}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Rôle de MENAO */}
      <section aria-labelledby="how-role" className="bg-surface py-16 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
          <SectionHeading
            id="how-role"
            eyebrow={t.roleEyebrow}
            title={t.roleTitle}
            subtitle={t.roleSubtitle}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-hero border border-border bg-background p-6 sm:p-8">
              <h3 className="flex items-center gap-3 text-lg font-medium">
                <span className="flex size-9 items-center justify-center rounded-full bg-success-soft text-success">
                  <Check aria-hidden="true" className="size-5" />
                </span>
                {t.doesTitle}
              </h3>
              <ul className="mt-6 flex flex-col gap-3.5">
                {t.does.map((item) => (
                  <li key={item} className="flex gap-3 text-[0.9375rem]">
                    <CircleCheck
                      aria-hidden="true"
                      className="mt-0.5 size-5 shrink-0 text-success"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-hero border border-border bg-background p-6 sm:p-8">
              <h3 className="flex items-center gap-3 text-lg font-medium">
                <span className="flex size-9 items-center justify-center rounded-full bg-danger-soft text-danger">
                  <X aria-hidden="true" className="size-5" />
                </span>
                {t.doesNotTitle}
              </h3>
              <ul className="mt-6 flex flex-col gap-3.5">
                {t.doesNot.map((item) => (
                  <li key={item} className="flex gap-3 text-[0.9375rem]">
                    <CircleX aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-danger" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Parcours de l'artisan */}
      <section
        id="artisans"
        aria-labelledby="how-pro"
        className="scroll-mt-32 bg-surface px-2 sm:px-4"
      >
        <div className="mx-auto max-w-[1440px] rounded-hero bg-[linear-gradient(150deg,#0b1438_0%,#16236e_60%,#2a3fb8_100%)] px-6 py-16 text-white sm:px-12 sm:py-24">
          <div className="mx-auto flex max-w-6xl flex-col gap-12">
            <SectionHeading
              id="how-pro"
              eyebrow={t.proEyebrow}
              title={t.proTitle}
              subtitle={t.proSubtitle}
              tone="inverse"
            />
            <Steps items={t.pro} tone="inverse" />
            <div className="flex flex-col items-center gap-3">
              <ButtonLink href="/pro" variant="secondary" size="lg" className="border-white">
                {t.proCta}
                <ArrowRight aria-hidden="true" className="size-4" />
              </ButtonLink>
              <p className="text-sm text-white/75">{t.proNote}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Questions fréquentes */}
      <section aria-labelledby="how-faq" className="bg-surface py-16 sm:py-24">
        <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 sm:px-6">
          <SectionHeading id="how-faq" eyebrow={faq.eyebrow} title={t.faqTitle} />
          <FaqList items={FAQ} />
        </div>
        <FaqJsonLd items={FAQ} />
      </section>

      <div className="bg-surface">
        <CtaBand
          id="how-cta"
          title={fr.site.cta.title}
          text={fr.site.cta.text}
          action={{ href: "/recherche", label: fr.site.cta.action }}
          secondary={{ href: "/pro", label: t.ctaPro }}
          reassurance={fr.site.cta.reassurance}
        />
      </div>
    </main>
  );
}
