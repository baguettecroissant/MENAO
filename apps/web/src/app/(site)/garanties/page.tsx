import type { Metadata } from "next";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CircleCheck,
  EyeOff,
  FileText,
  Phone,
  Scale,
  ShieldCheck,
  Sparkles,
  Umbrella,
  UserCheck,
} from "lucide-react";
import { CtaBand } from "@/components/site/cta-band";
import { ReviewVisual } from "@/components/site/journey-visuals";
import { PageHero } from "@/components/site/page-hero";
import { SectionHeading } from "@/components/site/section-heading";
import { Steps } from "@/components/site/steps";
import { PaymentFlow, VerificationCard } from "@/components/site/trust-visuals";
import { ButtonLink, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pages.guarantees;
const CHECK_ICONS = [Building2, FileText, ShieldCheck, Umbrella, UserCheck];
const DATA_ICONS = [Phone, Sparkles, EyeOff];

export const metadata: Metadata = {
  title: `${t.title} — MENAO`,
  description: t.metaDescription,
  alternates: { canonical: "/garanties" },
};

/**
 * Garanties & Confiance (F-03) : contrôles des artisans, paiements directs, avis vérifiés,
 * données personnelles, recours en cas de problème et classement.
 */
export default function GuaranteesPage() {
  return (
    <main className="bg-background">
      <PageHero
        id="guarantees-title"
        eyebrow={t.eyebrow}
        title={t.heroTitle}
        accent={t.heroAccent}
        subtitle={t.intro}
        breadcrumbs={[{ label: fr.site.home, href: "/" }, { label: t.title }]}
        actions={
          <ButtonLink href="/recherche" variant="secondary" size="lg" className="border-white">
            {t.cta}
            <ArrowRight aria-hidden="true" className="size-4" />
          </ButtonLink>
        }
        aside={<VerificationCard />}
      />

      {/* Artisans vérifiés */}
      <section aria-labelledby="guarantees-checks" className="py-16 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
          <SectionHeading
            id="guarantees-checks"
            eyebrow={t.checksEyebrow}
            title={t.checksTitle}
            subtitle={t.checksSubtitle}
          />
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {t.checks.map((check, i) => {
              const Icon = CHECK_ICONS[i] ?? ShieldCheck;
              return (
                <li
                  key={check.title}
                  className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="font-medium">{check.title}</h3>
                  <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                    {check.text}
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="flex items-start gap-3 rounded-card bg-primary-soft px-5 py-4 text-sm text-primary-strong">
            <CalendarClock aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            {t.expiry}
          </p>
        </div>
      </section>

      {/* Paiements */}
      <section aria-labelledby="guarantees-payment" className="px-2 sm:px-4">
        <div className="mx-auto max-w-[1440px] rounded-hero bg-[linear-gradient(150deg,#0b1438_0%,#16236e_60%,#2a3fb8_100%)] px-6 py-16 text-white sm:px-12 sm:py-24">
          <div className="mx-auto flex max-w-6xl flex-col gap-12">
            <div className="flex flex-col items-center gap-4">
              <SectionHeading
                id="guarantees-payment"
                eyebrow={t.paymentEyebrow}
                title={t.paymentTitle}
                tone="inverse"
              />
              <p className="max-w-2xl text-center text-pretty text-white/80">{t.paymentText}</p>
            </div>
            <div className="mx-auto w-full max-w-3xl">
              <PaymentFlow />
            </div>
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {t.paymentSteps.map((step) => (
                <li
                  key={step.title}
                  className="flex flex-col gap-2 rounded-card border border-white/10 bg-white/[0.06] p-6"
                >
                  <h3 className="flex items-center gap-2 font-medium">
                    <CircleCheck aria-hidden="true" className="size-5 shrink-0" />
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-pretty text-white/75">{step.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Avis vérifiés */}
      <section aria-labelledby="guarantees-reviews" className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
          <div className="flex flex-col gap-8">
            <SectionHeading
              id="guarantees-reviews"
              eyebrow={t.reviewsEyebrow}
              title={t.reviewsTitle}
              align="left"
            />
            <ul className="flex flex-col gap-4">
              {t.reviews.map((rule) => (
                <li key={rule} className="flex gap-3 text-[0.9375rem] leading-relaxed">
                  <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-hero bg-primary-soft px-6 py-10 sm:px-12">
            <div className="mx-auto w-full max-w-xs">
              <ReviewVisual />
            </div>
          </div>
        </div>
      </section>

      {/* Données personnelles */}
      <section aria-labelledby="guarantees-data" className="bg-surface py-16 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
          <SectionHeading id="guarantees-data" eyebrow={t.dataEyebrow} title={t.dataTitle} />
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {t.data.map((item, i) => {
              const Icon = DATA_ICONS[i] ?? ShieldCheck;
              return (
                <li
                  key={item.title}
                  className="flex flex-col gap-3 rounded-card border border-border bg-background p-6"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-surface text-primary shadow-card">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                    {item.text}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* En cas de problème */}
      <section aria-labelledby="guarantees-issue" className="bg-surface pb-16 sm:pb-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
          <SectionHeading id="guarantees-issue" eyebrow={t.issueEyebrow} title={t.issueTitle} />
          <Steps items={t.issue} />
        </div>
      </section>

      {/* Classement */}
      <section aria-labelledby="guarantees-ranking" className="bg-surface pb-16 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 rounded-hero border border-border bg-background p-6 sm:flex-row sm:items-center sm:p-10">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-surface text-primary shadow-card">
              <Scale aria-hidden="true" className="size-7" strokeWidth={1.75} />
            </span>
            <div className="flex flex-1 flex-col gap-2">
              <p className="text-xs font-semibold tracking-[0.14em] text-primary-strong uppercase">
                {t.rankingEyebrow}
              </p>
              <h2 id="guarantees-ranking" className="text-2xl font-medium tracking-tight">
                {t.rankingTitle}
              </h2>
              <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                {t.rankingText}
              </p>
            </div>
            <TextLink href="/criteres-de-classement" className="shrink-0 text-sm">
              {t.rankingLink}
            </TextLink>
          </div>
        </div>
      </section>

      <div className="bg-surface">
        <CtaBand
          id="guarantees-cta"
          title={fr.site.cta.title}
          text={fr.site.cta.text}
          action={{ href: "/recherche", label: fr.site.cta.action }}
          reassurance={fr.site.cta.reassurance}
        />
      </div>
    </main>
  );
}
