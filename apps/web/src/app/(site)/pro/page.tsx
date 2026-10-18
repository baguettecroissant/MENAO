import {
  ArrowRight,
  BadgePercent,
  CircleCheck,
  ClipboardCheck,
  FileStack,
  MessagesSquare,
  Mic,
  PhoneCall,
  ReceiptText,
  Scale,
  ShieldCheck,
  Signature,
  Sparkles,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { CommissionCalculator } from "@/components/pro-landing/commission-calculator";
import { DemoVideo } from "@/components/pro-landing/demo-video";
import { CtaBand } from "@/components/site/cta-band";
import { FaqJsonLd, FaqList } from "@/components/site/faq-list";
import { RequestChecklist, VoiceQuoteVisual } from "@/components/pro-landing/feature-visuals";
import { HeroPreview } from "@/components/pro-landing/hero-preview";
import { ProfileCardPreview } from "@/components/pro-landing/profile-card-preview";
import { SectionHeading } from "@/components/site/section-heading";
import { Steps } from "@/components/site/steps";
import { ButtonLink, StatusBadge, Tag, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "@/lib/site/catalog";
import { createPublicClient } from "@/lib/supabase/public";

const t = fr.pro.landing;

export const metadata: Metadata = {
  title: `${t.metaTitle} — MENAO`,
  description: t.metaDescription,
  alternates: { canonical: "/pro" },
};

// Formules lues en base (table plans, F-15), page régénérée toutes les heures (spec §4.4).
export const revalidate = 3600;

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const PAIN_ICONS = [PhoneCall, BadgePercent, FileStack];
const FEATURE_ICONS = [Signature, Wallet, MessagesSquare, ClipboardCheck, ReceiptText, Star];
const FAIRNESS_ICONS = [Users, Scale, ShieldCheck];
// Montant de l'abonnement Base si la table des formules n'est pas lisible (150 € HT, ADR 0010).
const BASE_FALLBACK_CENTS = 15000;

const avantagesOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

/**
 * Espace Pro (F-03) : présentation aux artisans. Promesses du business plan (abonnement fixe, zéro
 * commission, paiements directs, trois artisans au plus par demande), fonctionnalités livrées,
 * simulation de commission, carte artisan, formules (table plans) et questions fréquentes. Aucun
 * chiffre ni témoignage inventé (F-01) ; les illustrations portent des valeurs d'exemple.
 */
export default async function ProLandingPage() {
  const [{ data: plans }, { trades }] = await Promise.all([
    createPublicClient()
      .from("plans")
      .select("code, nom, prix_mensuel_ht_centimes, avantages, ouverte")
      .order("ordre"),
    seoCatalog(),
  ]);
  const base = plans?.find((p) => p.ouverte) ?? plans?.[0];

  return (
    <main className="bg-background">
      {/* Bandeau */}
      <section aria-labelledby="pro-title" className="px-2 pt-2 sm:px-4 sm:pt-4">
        <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-hero bg-[linear-gradient(120deg,#0b1438_0%,#1a2b85_45%,#4869f6_80%,#8ea4fb_100%)] px-6 py-14 text-white sm:px-12 sm:py-20 lg:py-24">
          <LogoMark
            tone="white"
            className="absolute -right-16 -bottom-24 hidden size-[30rem] opacity-[0.07] lg:block"
          />
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-6">
              <span className="inline-flex self-start rounded-pill border border-white/30 bg-white/15 px-3 py-1 text-sm backdrop-blur">
                {t.hero.eyebrow}
              </span>
              <h1
                id="pro-title"
                className="text-[2.25rem] leading-[1.05] font-medium tracking-tight text-balance sm:text-[3.25rem] lg:text-[3.5rem]"
              >
                {t.hero.titleLead}{" "}
                <span className="bg-[linear-gradient(90deg,#b9c7fc_0%,#e4eafd_100%)] bg-clip-text text-transparent sm:block">
                  {t.hero.titleAccent}
                </span>
              </h1>
              <p className="max-w-xl text-lg text-pretty text-white/85">{t.hero.subtitle}</p>
              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
                <ButtonLink
                  href="/pro/inscription"
                  variant="secondary"
                  size="lg"
                  className="border-white"
                >
                  {t.hero.signUp}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </ButtonLink>
                <ButtonLink
                  href="/pro#formules"
                  variant="ghost"
                  size="lg"
                  className="border border-white/50 text-white hover:bg-white/10 hover:text-white"
                >
                  {t.hero.plans}
                </ButtonLink>
              </div>
              <ul className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:gap-x-5">
                {t.hero.proofs.map((proof) => (
                  <li key={proof} className="flex items-center gap-2 text-sm text-white/90">
                    <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-white" />
                    {proof}
                  </li>
                ))}
              </ul>
              <TextLink
                href="/connexion"
                className="self-start text-sm text-white underline decoration-white/40 hover:decoration-white"
              >
                {t.hero.signIn}
              </TextLink>
            </div>
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* En vidéo */}
      <section aria-labelledby="pro-video" className="pt-16 sm:pt-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
          <SectionHeading
            id="pro-video"
            eyebrow={t.video.eyebrow}
            title={t.video.title}
            subtitle={t.video.subtitle}
          />
          <DemoVideo />
        </div>
      </section>

      {/* Le constat */}
      <section aria-labelledby="pro-pains" className="py-16 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
          <SectionHeading
            id="pro-pains"
            eyebrow={t.pains.eyebrow}
            title={t.pains.title}
            subtitle={t.pains.subtitle}
          />
          <ul className="grid gap-4 md:grid-cols-3">
            {t.pains.items.map((item, i) => {
              const Icon = PAIN_ICONS[i] ?? PhoneCall;
              return (
                <li
                  key={item.title}
                  className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card"
                >
                  <div className="flex flex-col gap-3 p-6">
                    <span className="flex size-11 items-center justify-center rounded-full bg-danger-soft text-danger">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <h3 className="text-lg font-medium">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                  </div>
                  <div className="mt-auto flex gap-3 border-t border-primary-soft bg-primary-softer px-6 py-4">
                    <CircleCheck
                      aria-hidden="true"
                      className="mt-0.5 size-5 shrink-0 text-primary"
                    />
                    <p className="flex flex-col gap-0.5 text-sm">
                      <span className="text-xs font-semibold tracking-[0.12em] text-primary-strong uppercase">
                        {t.pains.solutionLabel}
                      </span>
                      {item.solution}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Comment ça marche */}
      <section aria-labelledby="pro-steps" className="bg-surface py-16 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
          <SectionHeading
            id="pro-steps"
            eyebrow={t.steps.eyebrow}
            title={t.steps.title}
            subtitle={t.steps.subtitle}
          />
          <Steps items={t.steps.items} />
          <div className="flex justify-center">
            <ButtonLink href="/pro/inscription" size="lg">
              {t.hero.signUp}
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Tout-en-un */}
      <section aria-labelledby="pro-features" className="py-16 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
          <SectionHeading
            id="pro-features"
            eyebrow={t.features.eyebrow}
            title={t.features.title}
            subtitle={t.features.subtitle}
          />
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <article
                aria-labelledby="pro-feature-voice"
                className="grid grid-cols-1 items-center gap-8 rounded-hero border border-border bg-surface p-6 shadow-card sm:p-8 md:grid-cols-2 lg:col-span-2"
              >
                <div className="flex flex-col gap-4">
                  <Tag className="self-start">
                    <Mic aria-hidden="true" className="size-3.5" />
                    {t.features.voice.tag}
                  </Tag>
                  <h3
                    id="pro-feature-voice"
                    className="text-2xl leading-tight font-medium tracking-tight text-balance"
                  >
                    {t.features.voice.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t.features.voice.text}
                  </p>
                  <p className="flex items-start gap-2 text-sm font-medium text-primary-strong">
                    <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    {t.features.voice.promise}
                  </p>
                </div>
                <VoiceQuoteVisual />
              </article>
              <article
                aria-labelledby="pro-feature-request"
                className="flex flex-col gap-4 rounded-hero bg-primary-soft p-6 sm:p-8"
              >
                <span className="inline-flex items-center gap-1 self-start rounded-chip bg-surface px-2.5 py-1 text-xs font-medium text-primary-strong">
                  <Sparkles aria-hidden="true" className="size-3.5" />
                  {t.features.request.tag}
                </span>
                <h3
                  id="pro-feature-request"
                  className="text-2xl leading-tight font-medium tracking-tight text-balance"
                >
                  {t.features.request.title}
                </h3>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {t.features.request.text}
                </p>
                <div className="mt-auto pt-2">
                  <RequestChecklist />
                </div>
              </article>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {t.features.items.map((feature, i) => {
                const Icon = FEATURE_ICONS[i] ?? Signature;
                return (
                  <li
                    key={feature.title}
                    className="group flex gap-4 rounded-card border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-raised"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <div className="flex flex-col gap-1">
                      <h3 className="font-medium">{feature.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {feature.text}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* Zéro commission */}
      <section aria-labelledby="pro-commission" className="px-2 sm:px-4">
        <div className="mx-auto max-w-[1440px] rounded-hero bg-[linear-gradient(150deg,#0b1438_0%,#16236e_60%,#2a3fb8_100%)] px-6 py-16 text-white sm:px-12 sm:py-24">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <SectionHeading
                id="pro-commission"
                eyebrow={t.commission.eyebrow}
                title={t.commission.title}
                align="left"
                tone="inverse"
              />
              <p className="text-white/80">{t.commission.text}</p>
              <ul className="flex flex-col gap-3">
                {t.commission.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/15">
                      <CircleCheck aria-hidden="true" className="size-4" />
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
            <CommissionCalculator
              subscriptionCents={base?.prix_mensuel_ht_centimes ?? BASE_FALLBACK_CENTS}
            />
          </div>
        </div>
      </section>

      {/* Un réseau juste */}
      <section aria-labelledby="pro-fairness" className="overflow-hidden py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
          <div className="flex flex-col gap-8">
            <SectionHeading
              id="pro-fairness"
              eyebrow={t.fairness.eyebrow}
              title={t.fairness.title}
              subtitle={t.fairness.subtitle}
              align="left"
            />
            <ul className="flex flex-col gap-5">
              {t.fairness.items.map((item, i) => {
                const Icon = FAIRNESS_ICONS[i] ?? Users;
                return (
                  <li key={item.title} className="flex gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-card">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <div className="flex flex-col gap-1">
                      <h3 className="font-medium">{item.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <TextLink href="/criteres-de-classement" className="self-start text-sm">
              {t.fairness.criteria}
            </TextLink>
          </div>
          <div className="px-6 pb-4 sm:px-16 lg:order-first">
            <ProfileCardPreview />
          </div>
        </div>
      </section>

      {/* Formules */}
      {plans && plans.length > 0 && (
        <section
          id="formules"
          aria-labelledby="pro-plans"
          className="scroll-mt-20 bg-surface py-16 sm:py-24"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
            <SectionHeading
              id="pro-plans"
              eyebrow={t.plansEyebrow}
              title={t.plansTitle}
              subtitle={t.plansSubtitle}
            />
            <ul className="grid items-start gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
                <li
                  key={plan.code}
                  className={`flex flex-col gap-5 rounded-hero border p-6 sm:p-7 ${
                    plan.ouverte
                      ? "border-primary bg-surface shadow-raised ring-4 ring-primary/10"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xl font-medium">{plan.nom}</h3>
                    {plan.ouverte ? (
                      <StatusBadge>{t.open}</StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">{t.soon}</StatusBadge>
                    )}
                  </div>
                  <p>
                    <span className="text-[2.75rem] leading-none font-medium tracking-tight">
                      {euros.format(plan.prix_mensuel_ht_centimes / 100)}
                    </span>{" "}
                    <span className="text-sm text-muted-foreground">{t.perMonth}</span>
                  </p>
                  {plan.ouverte && (
                    <p className="inline-flex items-center gap-1.5 self-start rounded-pill bg-success-soft px-3 py-1 text-sm font-medium text-success">
                      <CircleCheck aria-hidden="true" className="size-4" />
                      {t.trial}
                    </p>
                  )}
                  <ul className="flex flex-col gap-2.5 border-t border-border pt-5">
                    {avantagesOf(plan.avantages).map((avantage) => (
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
              ))}
            </ul>
            <p className="mx-auto max-w-3xl text-center text-xs text-muted-foreground">
              {t.plansNote}
            </p>
          </div>
        </section>
      )}

      {/* Par métier (ADR 0134) */}
      {trades.length > 0 && (
        <section aria-labelledby="pro-trades" className="pt-16 sm:pt-24">
          <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 sm:px-6">
            <SectionHeading
              id="pro-trades"
              eyebrow={fr.pro.tradeLanding.byTradeEyebrow}
              title={fr.pro.tradeLanding.byTradeTitle}
              subtitle={fr.pro.tradeLanding.byTradeSubtitle}
            />
            <ul className="flex flex-wrap justify-center gap-2.5">
              {trades.map((trade) => (
                <li key={trade.code}>
                  <Link
                    href={`/pro/${trade.code}` as Route}
                    className="inline-flex min-h-11 items-center rounded-pill border border-border bg-surface px-4 text-[0.9375rem] shadow-card transition hover:border-primary/40 hover:text-primary-strong hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/25 focus-visible:outline-none"
                  >
                    {trade.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Questions fréquentes */}
      <section aria-labelledby="pro-faq" className="py-16 sm:py-24">
        <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 sm:px-6">
          <SectionHeading id="pro-faq" eyebrow={t.faqEyebrow} title={t.faqTitle} />
          <FaqList items={t.faq} />
        </div>
        <FaqJsonLd items={t.faq} />
      </section>

      <CtaBand
        id="pro-final"
        title={t.finalTitle}
        text={t.finalText}
        action={{ href: "/pro/inscription", label: t.hero.signUp }}
        reassurance={t.finalReassurance}
      />
    </main>
  );
}
