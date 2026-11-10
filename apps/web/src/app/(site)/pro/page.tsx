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
import { AgentsSection } from "@/components/pro-landing/agents-section";
import { CallbackLink } from "@/components/pro-landing/callback-link";
import { CommissionCalculator } from "@/components/pro-landing/commission-calculator";
import { DemoVideo } from "@/components/pro-landing/demo-video";
import { HeroFlow } from "@/components/pro-landing/hero-flow";
import { PricingPlans } from "@/components/pro-landing/pricing-plans";
import { ProAssistant } from "@/components/pro-landing/pro-assistant";
import { ProFinalCta } from "@/components/pro-landing/pro-final-cta";
import { ProofStrip } from "@/components/pro-landing/proof-strip";
import { FaqJsonLd, FaqList } from "@/components/site/faq-list";
import { RequestChecklist, VoiceQuoteVisual } from "@/components/pro-landing/feature-visuals";
import { BrowserMockup, PhoneMockup } from "@/components/site/device-mockups";
import { StoreBadges } from "@/components/site/store-badges";
import { SectionHeading } from "@/components/site/section-heading";
import { Steps } from "@/components/site/steps";
import { ButtonLink, Tag, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { APP_SCREENS, WEB_SCREENS } from "@/lib/site/app-screens";
import { seoCatalog } from "@/lib/site/catalog";
import { loadPricing, proObjections } from "@/lib/site/pro-plans";

const t = fr.pro.landing;
const m = fr.site.mockups;

export const metadata: Metadata = {
  title: `${t.metaTitle} — MENAO`,
  description: t.metaDescription,
  alternates: { canonical: "/pro" },
};

// Formules lues en base (table plans, F-15), page régénérée toutes les heures (spec §4.4).
export const revalidate = 3600;

const PAIN_ICONS = [PhoneCall, BadgePercent, FileStack];
const FEATURE_ICONS = [Signature, Wallet, MessagesSquare, ClipboardCheck, ReceiptText, Star];
const FAIRNESS_ICONS = [Users, Scale, ShieldCheck];
// Montant de l'abonnement Base si la table des formules n'est pas lisible (150 € HT, ADR 0010).
const BASE_FALLBACK_CENTS = 15000;

/**
 * Espace Pro (F-03) : présentation aux artisans. Promesses du business plan (abonnement fixe, zéro
 * commission, paiements directs, trois artisans au plus par demande), fonctionnalités livrées,
 * simulation de commission, carte artisan, formules (table plans) et questions fréquentes. Aucun
 * chiffre ni témoignage inventé (F-01) ; les illustrations portent des valeurs d'exemple.
 */
const fv = t.featureVisuals;

/** Fragment d'interface décoratif de chaque carte de l'outil (valeurs d'exemple). */
function FeatureFragment({ index }: { index: number }) {
  switch (index) {
    case 0:
      return (
        <div className="flex flex-col gap-1 rounded-2xl border border-border p-3.5">
          <span className="text-xs text-muted-foreground">{fv.signedBy}</span>
          <span className="font-[cursive] text-2xl text-primary-strong">{fv.signature}</span>
          <span className="text-xs font-bold text-success">✓ {fv.codeOk}</span>
        </div>
      );
    case 1:
      return (
        <div className="flex flex-col gap-1">
          <span className="font-display text-[2rem] leading-none font-bold tracking-tight">
            {fv.deposit}
          </span>
          <span className="text-xs text-white/70">{fv.depositNote}</span>
        </div>
      );
    case 2:
      return (
        <div className="flex flex-col gap-1.5">
          {fv.agenda.map((slot) => (
            <span key={slot.time} className="flex items-center gap-2.5 text-[0.8125rem]">
              <b className="w-11">{slot.time}</b>
              <span className="flex-1 rounded-[0.625rem] bg-primary-soft px-2.5 py-1.5 font-semibold text-primary-strong">
                {slot.label}
              </span>
            </span>
          ))}
        </div>
      );
    case 3:
      return (
        <span className="inline-flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-[0.8125rem] font-bold text-success">
          <CircleCheck className="size-4" />
          {fv.pv}
        </span>
      );
    case 4:
      return (
        <div className="grid grid-cols-2 gap-2">
          {fv.invoices.map((invoice) => (
            <span
              key={invoice.ref}
              className="flex flex-col gap-0.5 rounded-xl border border-border p-2.5 text-xs"
            >
              <b>{invoice.title}</b>
              <span className="text-muted-foreground">{invoice.ref}</span>
            </span>
          ))}
        </div>
      );
    default:
      return (
        <div className="flex flex-col gap-1.5">
          <span className="flex gap-0.5 text-[#f5b301]">
            {[0, 1, 2, 3, 4].map((n) => (
              <Star key={n} className="size-4 fill-current" />
            ))}
          </span>
          <span className="text-[0.8125rem] text-label">{fv.review}</span>
        </div>
      );
  }
}

export default async function ProLandingPage() {
  const [{ pricingPlans, baseCents }, { trades }] = await Promise.all([
    loadPricing(),
    seoCatalog(),
  ]);
  const objections = proObjections();

  return (
    <main className="bg-background">
      {/* Bandeau */}
      <section aria-labelledby="pro-title" className="px-2 pt-2 sm:px-4 sm:pt-4">
        <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-hero bg-[linear-gradient(150deg,#0b1438_0%,#16236e_58%,#2a3fb8_100%)] px-6 pt-14 pb-16 text-white sm:px-12 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-28">
          <LogoMark
            tone="white"
            className="absolute -right-16 -bottom-24 hidden size-[30rem] opacity-[0.07] lg:block"
          />
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
            <div className="flex flex-col gap-6">
              <span className="inline-flex self-start rounded-pill border border-white/30 bg-white/15 px-3 py-1 text-sm backdrop-blur">
                {t.hero.eyebrow}
              </span>
              <h1
                id="pro-title"
                className="text-[2.25rem] leading-[1.05] font-bold tracking-tight text-balance sm:text-[3.25rem] lg:text-[3.5rem]"
              >
                {t.hero.titleLead}{" "}
                <span className="bg-[linear-gradient(90deg,#b9c7fc_0%,#e4eafd_100%)] bg-clip-text text-transparent sm:block">
                  {t.hero.titleAccent}
                </span>
              </h1>
              <p className="max-w-xl text-lg text-pretty text-white/85">{t.hero.subtitle}</p>
              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
                <ButtonLink href="/pro/inscription" size="lg" className="whitespace-nowrap">
                  {t.hero.signUp}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </ButtonLink>
                {/* « Être rappelé » : formulaire de rappel de l'assistant (ADR 0265). */}
                <CallbackLink tone="dark" />
              </div>
              <ul className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:gap-x-5">
                {t.hero.proofs.map((proof) => (
                  <li key={proof} className="flex items-center gap-2 text-sm text-white/90">
                    <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-white" />
                    {proof}
                  </li>
                ))}
              </ul>
              {/* L'application dans les stores (ADR 0150). */}
              <StoreBadges className="pt-1" />
              <TextLink
                href="/connexion"
                className="self-start text-sm text-white underline decoration-white/40 hover:decoration-white"
              >
                {t.hero.signIn}
              </TextLink>
            </div>
            {/* Le vrai accueil de l'application et le parcours en cartes (ADR 0270). */}
            <HeroFlow />
          </div>
        </div>
      </section>

      {/* Bande de preuves (ADR 0265) */}
      <ProofStrip />

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
                  className="flex flex-col overflow-hidden rounded-[1.375rem] border border-border bg-surface"
                >
                  <div className="flex flex-col gap-3 p-6">
                    <span className="flex size-11 items-center justify-center rounded-full bg-danger-soft text-danger">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <h3 className="font-display text-xl font-bold">{item.title}</h3>
                    <p className="text-[0.9375rem] leading-relaxed text-label">{item.text}</p>
                  </div>
                  {/* Refonte du lot 19 (ADR 0265) : la réponse de MENAO sur fond vert. */}
                  <div className="mt-auto flex gap-3 bg-success-soft px-6 py-4">
                    <CircleCheck
                      aria-hidden="true"
                      className="mt-0.5 size-5 shrink-0 text-success"
                    />
                    <p className="flex flex-col gap-0.5 text-[0.9375rem] font-semibold">
                      <span className="text-xs font-bold tracking-[0.08em] text-success uppercase">
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

      {/* Tout-en-un */}
      <section
        aria-labelledby="pro-features"
        className="border-y border-border bg-surface py-16 sm:py-24"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
          <SectionHeading
            id="pro-features"
            eyebrow={t.features.eyebrow}
            title={t.features.title}
            subtitle={t.features.subtitle}
          />
          {/* Le produit en grand (ADR 0270) : le tableau de bord sur ordinateur et les demandes
              dans l'application, vrais écrans et données fictives. */}
          <div className="relative mx-auto w-full pr-[7%] pb-5 sm:pb-8">
            <BrowserMockup src={WEB_SCREENS.pro} alt={m.screens.webPro} />
            <div className="absolute right-0 bottom-0 w-[23%] sm:w-[21%]">
              <PhoneMockup screen={APP_SCREENS.proDemandes} alt={m.screens.proDemandes} />
            </div>
          </div>
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
                    className="text-2xl leading-tight font-bold tracking-tight text-balance"
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
                  className="text-2xl leading-tight font-bold tracking-tight text-balance"
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
            {/* Grille de l'outil (ADR 0265) : chaque carte montre un fragment d'interface. */}
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {t.features.items.map((feature, i) => {
                const Icon = FEATURE_ICONS[i] ?? Signature;
                const dark = i === 1;
                return (
                  <li
                    key={feature.title}
                    className={`flex flex-col gap-4 rounded-[1.5rem] p-6 ${
                      dark ? "bg-foreground text-white" : "border border-border bg-surface"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                          dark ? "bg-white/10 text-white" : "bg-primary-soft text-primary"
                        }`}
                      >
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <div className="flex flex-col gap-1">
                        <h3 className="font-display text-lg font-bold">{feature.title}</h3>
                        <p
                          className={`text-sm leading-relaxed ${dark ? "text-white/75" : "text-label"}`}
                        >
                          {feature.text}
                        </p>
                      </div>
                    </div>
                    <div aria-hidden="true" className="mt-auto">
                      <FeatureFragment index={i} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* Assistants IA (ADR 0265) */}
      <AgentsSection id="pro-agents" />

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
            <CommissionCalculator subscriptionCents={baseCents ?? BASE_FALLBACK_CENTS} />
          </div>
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
          {/* Fiche d'exemple, telle que la voient les particuliers dans l'application (ADR 0147). */}
          <div className="flex flex-col gap-3 lg:order-first">
            <div className="relative h-[28rem] overflow-hidden rounded-hero bg-[linear-gradient(180deg,var(--color-primary-soft)_0%,var(--color-primary-softer)_100%)] px-8 pt-10">
              <span className="absolute top-5 left-5 z-10 rounded-pill bg-surface px-3 py-1 text-xs font-medium text-primary-strong shadow-card">
                {m.example}
              </span>
              <PhoneMockup
                screen={APP_SCREENS.clientFiche}
                alt={m.screens.clientFiche}
                className="mx-auto w-full max-w-[16rem]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Formules : aperçu, le détail sur /pro/formules (ADR 0265) */}
      {pricingPlans.length > 0 && (
        <section
          id="formules"
          aria-labelledby="pro-plans"
          className="scroll-mt-20 bg-primary-soft py-16 sm:py-24"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
            <SectionHeading
              id="pro-plans"
              eyebrow={t.plansEyebrow}
              title={t.plansTitle}
              subtitle={t.plansSubtitle}
            />
            <PricingPlans plans={pricingPlans} compact />
            <ButtonLink href="/pro/formules" variant="secondary" size="lg" className="self-center">
              {t.plansCompare}
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
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
          <FaqList items={objections} />
          <TextLink href="/pro/faq" className="self-center">
            {fr.pro.faqPage.seeAll}
          </TextLink>
        </div>
        <FaqJsonLd items={objections} />
      </section>

      <ProFinalCta id="pro-final" />
      <ProAssistant />
    </main>
  );
}
