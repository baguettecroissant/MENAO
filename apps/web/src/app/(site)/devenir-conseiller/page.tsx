import { maxSubscriptionCents, recruitmentRates, type RecruitmentRates } from "@menao/core";
import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Check,
  CircleHelp,
  Map,
  QrCode,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { ApplicationForm } from "@/components/recruitment/application-form";
import { EarningsSimulator } from "@/components/recruitment/earnings-simulator";
import { CheckLine, NumberedSteps } from "@/components/site/info-blocks";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import { ButtonLink, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { absoluteUrl } from "@/lib/site/seo";
import { ORGANIZATION_ID, breadcrumbJsonLd } from "@/lib/site/structured-data";
import { createPublicClient } from "@/lib/supabase/public";

const t = fr.pages.recruitment;
const PATH = "/devenir-conseiller";
const TOOL_ICONS = [QrCode, Map, Sparkles, Award, Wallet, CircleHelp];

export const metadata: Metadata = {
  title: `${t.metaTitle} — MENAO`,
  description: t.metaDescription,
  alternates: { canonical: PATH },
};

// Barème lu en base (commercial_bonus_settings), page régénérée toutes les heures (spec §4.4).
export const revalidate = 3600;

const euros = (cents: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);

/** « 30 €, 100 € ou 200 € » : primes d'abonnement distinctes, de la plus petite à la plus haute. */
function subscriptionList(rates: RecruitmentRates): string {
  const amounts = [...new Set(Object.values(rates.subscriptionCents))].sort((a, b) => a - b);
  const labels = amounts.map(euros);
  return labels.length <= 1
    ? (labels[0] ?? "")
    : `${labels.slice(0, -1).join(", ")} ou ${labels[labels.length - 1]}`;
}

async function loadRates(): Promise<RecruitmentRates> {
  const { data } = await createPublicClient().rpc("commercial_bonus_rates");
  return recruitmentRates(data?.[0] ?? null);
}

/**
 * Devenir conseiller MENAO (F-183, lot 77, ADR 0380) : l'offre, le simulateur de gains, les
 * outils, le profil recherché, les questions, puis la candidature et le choix de la réunion
 * d'information en visio. Page statique ; la candidature passe par des actions serveur.
 */
export default async function RecruitmentPage() {
  const rates = await loadRates();
  const validation = euros(rates.validationCents);
  const list = subscriptionList(rates);
  const gains = [
    t.gains.validation(validation),
    t.gains.subscription(euros(maxSubscriptionCents(rates)), list),
    t.gains.ceiling,
  ];
  return (
    <main className="bg-background">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              name: t.title,
              description: t.metaDescription,
              url: absoluteUrl(PATH),
              inLanguage: "fr-FR",
              publisher: { "@id": ORGANIZATION_ID },
            },
            breadcrumbJsonLd([
              { name: fr.seo.breadcrumbHome, path: "/" },
              { name: t.title, path: PATH },
            ]),
          ],
        }}
      />

      <section aria-labelledby="conseiller-titre" className="px-2 pt-2 sm:px-4 sm:pt-4">
        <div className="relative mx-auto flex max-w-[1440px] flex-col overflow-hidden rounded-hero bg-[#0b1438] text-white xl:min-h-[38rem]">
          {/* eslint-disable-next-line @next/next/no-img-element -- images non optimisées par Vercel (spec §4.4) */}
          <img
            src="/images/recrutement/equipe.webp"
            srcSet="/images/recrutement/equipe-800.webp 800w, /images/recrutement/equipe.webp 1280w"
            sizes="(max-width: 639px) 800px, 100vw"
            alt={t.photoAlt}
            width={1280}
            height={853}
            fetchPriority="high"
            className="h-60 w-full object-cover object-[68%_30%] sm:h-80 xl:absolute xl:inset-0 xl:h-full xl:object-[70%_30%]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgb(11_20_56/0.95)_0%,rgb(11_20_56/0.86)_34%,rgb(11_20_56/0.2)_58%,rgb(11_20_56/0)_72%)] xl:block"
          />
          <div className="relative flex max-w-[40rem] flex-col gap-5 px-5 py-8 sm:px-10 sm:py-12 xl:px-16 xl:py-24">
            <span className="self-start rounded-full bg-white/15 px-3 py-1.5 text-[0.8125rem] font-bold">
              {t.eyebrow}
            </span>
            <h1
              id="conseiller-titre"
              className="font-display text-[2.375rem] leading-none font-bold tracking-tight sm:text-[3.25rem] xl:text-[3.875rem]"
            >
              {t.heroTitle}
            </h1>
            <p className="text-[1.0625rem] leading-relaxed text-white/88 sm:text-[1.1875rem]">
              {t.intro}
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={"#candidature" as Route} size="lg">
                <ArrowRight aria-hidden="true" className="size-4" />
                {t.apply}
              </ButtonLink>
              <Link
                href={"#gains" as Route}
                className={`inline-flex min-h-12 items-center rounded-full border border-white/50 bg-[#0b1438]/30 px-7 text-base font-semibold text-white transition-colors hover:bg-white/10 ${focusRing}`}
              >
                {t.simulate}
              </Link>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {t.heroChecks.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white/92"
                >
                  <Check aria-hidden="true" className="size-4 text-[#7ee2b0]" strokeWidth={2.6} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <ul className="mx-auto mt-4 grid max-w-[1440px] gap-3 sm:grid-cols-3 sm:gap-4">
          {gains.map((g) => (
            <li
              key={g.title}
              className="flex items-center gap-4 rounded-[1.25rem] border border-border bg-surface px-5 py-4 shadow-card"
            >
              <b className="font-display w-28 shrink-0 text-[2rem] leading-none font-bold tracking-tight">
                {g.value}
              </b>
              <span className="flex flex-col gap-0.5">
                <b>{g.title}</b>
                <span className="text-sm text-muted-foreground">{g.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="conseiller-metier" className="py-14 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-9 px-4 sm:px-6">
          <SectionHeading
            id="conseiller-metier"
            eyebrow={t.stepsEyebrow}
            title={t.stepsTitle}
            subtitle={t.stepsLead}
          />
          <NumberedSteps items={t.steps(validation, list)} />
        </div>
      </section>

      <section
        id="gains"
        aria-labelledby="conseiller-gains"
        className="scroll-mt-24 pb-14 sm:pb-20"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-9 px-4 sm:px-6">
          <SectionHeading
            id="conseiller-gains"
            eyebrow={t.simulator.eyebrow}
            title={t.simulator.title}
            subtitle={t.simulator.lead(validation, list)}
          />
          <EarningsSimulator rates={rates} />
        </div>
      </section>

      <section
        aria-labelledby="conseiller-outils"
        className="border-y border-border bg-surface py-14 sm:py-20"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-9 px-4 sm:px-6">
          <SectionHeading
            id="conseiller-outils"
            eyebrow={t.toolsEyebrow}
            title={t.toolsTitle}
            subtitle={t.toolsLead}
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.tools.map((tool, i) => {
              const Icon = TOOL_ICONS[i] ?? QrCode;
              return (
                <li
                  key={tool.title}
                  className="reveal flex items-start gap-3.5 rounded-[1.25rem] border border-border bg-background p-5"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <b className="text-[1.0625rem]">{tool.title}</b>
                    <span className="text-[0.9375rem] leading-relaxed text-label">{tool.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section aria-labelledby="conseiller-profil" className="py-14 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-7 px-4 sm:px-6">
          <SectionHeading
            id="conseiller-profil"
            eyebrow={t.profileEyebrow}
            title={t.profileTitle}
          />
          <div className="flex flex-col items-start gap-4 rounded-[1.25rem] bg-primary-soft p-5 sm:flex-row sm:items-center sm:p-6">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface text-primary-strong">
              <BriefcaseBusiness aria-hidden="true" className="size-6" />
            </span>
            <span className="flex flex-col gap-1">
              <b className="text-[1.0625rem]">{t.alreadyTitle}</b>
              <span className="leading-relaxed text-label">{t.alreadyText}</span>
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-[1.25rem] border border-border bg-surface p-6 sm:p-7">
              <h3 className="font-display text-xl font-bold">{t.lookingTitle}</h3>
              <ul className="flex flex-col gap-3.5 text-label">
                {t.looking.map((item) => (
                  <CheckLine key={item}>{item}</CheckLine>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-4 rounded-[1.25rem] border border-border bg-surface p-6 sm:p-7">
              <h3 className="font-display text-xl font-bold">{t.processTitle}</h3>
              <ol className="flex flex-col gap-3.5 text-label">
                {t.process.map((item, i) => (
                  <li key={item} className="flex items-start gap-3 leading-relaxed">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="conseiller-questions" className="pb-14 sm:pb-20">
        <div className="mx-auto flex max-w-3xl flex-col gap-7 px-4 sm:px-6">
          <SectionHeading id="conseiller-questions" eyebrow={t.faqEyebrow} title={t.faqTitle} />
          <div className="divide-y divide-border overflow-hidden rounded-[1.25rem] border border-border bg-surface">
            {t.faq(validation, list).map((item) => (
              <details key={item.q} className="group">
                <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold sm:px-6 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="text-xl text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 leading-relaxed text-label sm:px-6">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section
        id="candidature"
        aria-labelledby="conseiller-candidature"
        className="scroll-mt-24 px-2 pb-2 sm:px-4 sm:pb-4"
      >
        <div className="mx-auto grid max-w-[1440px] items-start gap-8 rounded-hero bg-[linear-gradient(150deg,#0b1438_0%,#16236e_58%,#2a3fb8_100%)] px-4 py-10 sm:px-10 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,37.5rem)] lg:gap-14 lg:px-16">
          <div className="flex flex-col gap-4 text-white lg:pt-3">
            <h2
              id="conseiller-candidature"
              className="font-display text-[2.25rem] leading-[1.05] font-bold tracking-tight sm:text-[2.875rem]"
            >
              {t.formTitle}
            </h2>
            <p className="text-[1.0625rem] leading-relaxed text-white/82">{t.formLead}</p>
            <ul className="flex flex-col gap-2.5">
              {t.formChecks.map((item) => (
                <li key={item} className="flex items-center gap-2 text-[0.9375rem] text-white/88">
                  <Check aria-hidden="true" className="size-4 text-[#7ee2b0]" strokeWidth={2.6} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[1.375rem] bg-surface p-5 text-foreground sm:p-8">
            <ApplicationForm />
          </div>
        </div>
      </section>
    </main>
  );
}
