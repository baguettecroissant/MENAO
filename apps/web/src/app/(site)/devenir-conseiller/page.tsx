import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  FileText,
  Map as MapIcon,
  MapPin,
  NotebookPen,
  Phone,
  Play,
  Repeat,
  Rocket,
  Send,
  Store,
  Sun,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { ApplicationForm } from "@/components/recruitment/application-form";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import { ButtonLink, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { absoluteUrl } from "@/lib/site/seo";
import { ORGANIZATION_ID, breadcrumbJsonLd } from "@/lib/site/structured-data";

const t = fr.pages.recruitment;
const PATH = "/devenir-conseiller";
const WHY_ICONS = [Rocket, CalendarDays, MapIcon, TrendingUp];
const DAY_ICONS = [Sun, MapPin, Phone, Store, NotebookPen, Award];
const PROFILE_ICONS = [BriefcaseBusiness, Repeat, Store];
const PROCESS_ICONS = [Send, FileText, Users, Rocket];
/** Écrans de l'espace commercial (lot 79), exportés de la maquette : 840 × 1732, fond transparent. */
const PHONES = ["prospects", "code", "resultats"] as const;
const STAIRS = ["h-28", "h-40", "h-52", "h-64"];

export const metadata: Metadata = {
  title: `${t.metaTitle} — MENAO`,
  description: t.metaDescription,
  alternates: { canonical: PATH },
};

function PhoneShot({ index, className = "" }: { index: number; className?: string }) {
  const phone = t.tool.phones[index];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- images non optimisées par Vercel (spec §4.4)
    <img
      src={`/images/recrutement/ecrans/${PHONES[index]}.webp`}
      alt={phone?.alt ?? ""}
      width={840}
      height={1732}
      loading="lazy"
      decoding="async"
      className={`h-auto ${className}`}
    />
  );
}

/**
 * Devenir commercial MENAO (F-183, lots 77 et 79, ADR 0380 et 0382) : bandeau, pourquoi
 * maintenant, l'outil montré sur trois téléphones, une journée type, l'escalier des gains (sans
 * montant), les profils, le déroulé, les questions, puis la candidature en 3 étapes avec CV. Page
 * statique ; la candidature passe par une action serveur. Aucune mention d'IA ni de montant.
 */
export default function RecruitmentPage() {
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

      {/* Bandeau comme celui de l'accueil (ADR 0199) : photo plein cadre arrondie, la pilule de
          l'en-tête posée dessus ; sur téléphone, la photo en haut se fond dans le bleu nuit. */}
      <section
        aria-labelledby="commercial-titre"
        className="-mt-[4.75rem] px-2 pt-2 sm:-mt-24 sm:px-4 sm:pt-4"
      >
        <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-hero bg-[#0b1438]">
          {/* eslint-disable-next-line @next/next/no-img-element -- images non optimisées par Vercel (spec §4.4) */}
          <img
            src="/images/recrutement/equipe.webp"
            srcSet="/images/recrutement/equipe-800.webp 800w, /images/recrutement/equipe.webp 1280w"
            sizes="(max-width: 639px) 800px, 100vw"
            alt={t.photoAlt}
            width={1280}
            height={853}
            fetchPriority="high"
            className="absolute inset-x-0 top-0 h-[400px] w-full object-cover object-[64%_30%] sm:h-full sm:object-[72%_30%]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgb(11_20_56/0.96)_0%,rgb(11_20_56/0.86)_36%,rgb(11_20_56/0.15)_62%,rgb(11_20_56/0)_76%)] sm:block"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-60 h-40 bg-gradient-to-b from-transparent to-[#0b1438] sm:hidden"
          />
          <div className="relative flex flex-col p-3 sm:min-h-[660px] sm:p-6 lg:min-h-[690px]">
            {/* Place de la pilule de l'en-tête, posée par-dessus (ADR 0199). */}
            <div aria-hidden="true" className="h-14 shrink-0" />
            <div className="relative mt-auto flex flex-col gap-5 px-2 pt-[15rem] pb-4 text-white sm:max-w-[34rem] sm:px-4 sm:pt-16 lg:max-w-[38rem]">
              <span className="self-start rounded-full bg-white/15 px-3 py-1.5 text-[0.8125rem] font-bold">
                {t.eyebrow}
              </span>
              <h1
                id="commercial-titre"
                className="font-display text-[2.5rem] leading-[1.0] font-bold tracking-tight sm:text-[3.5rem] lg:text-[4.125rem]"
              >
                {t.heroTitle}
              </h1>
              <p className="text-[1.0625rem] leading-relaxed text-white/90 sm:text-[1.25rem]">
                {t.introStart}
                <b className="font-semibold text-white">{t.introStrong}</b>
                {t.introEnd}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={"#candidature" as Route} size="lg" block className="sm:w-auto">
                  <ArrowRight aria-hidden="true" className="size-4" />
                  {t.apply}
                </ButtonLink>
                <Link
                  href={"#outil" as Route}
                  className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/50 bg-[#0b1438]/30 px-7 text-base font-semibold text-white transition-colors hover:bg-white/10 ${focusRing}`}
                >
                  <Play aria-hidden="true" className="size-4" />
                  {t.seeTool}
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
        </div>
        {/* Pourquoi maintenant. */}
        <ul className="mx-auto mt-3 grid max-w-[1440px] overflow-hidden rounded-[1.375rem] border border-border bg-surface text-foreground sm:mt-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.why.map((item, i) => {
            const Icon = WHY_ICONS[i] ?? Rocket;
            return (
              <li
                key={item.title}
                className="flex gap-3.5 border-border px-5 py-5 not-first:border-t sm:flex-col sm:gap-2.5 sm:px-6 sm:py-6 sm:not-first:border-t-0 sm:even:border-l lg:not-first:border-l"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="flex flex-col gap-1">
                  <b className="font-display text-lg tracking-tight sm:text-xl">{item.title}</b>
                  <span className="text-[0.9375rem] leading-relaxed text-label">{item.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* L'outil, sur trois téléphones. */}
      <section
        id="outil"
        aria-labelledby="commercial-outil"
        className="scroll-mt-24 px-2 pt-14 sm:px-4 sm:pt-24"
      >
        <div className="mx-auto flex max-w-[1440px] flex-col gap-10 overflow-hidden rounded-hero bg-[linear-gradient(150deg,#0b1438_0%,#16236e_58%,#2a3fb8_100%)] py-12 text-white sm:py-16 lg:flex-row lg:items-center lg:gap-12 lg:px-16 lg:py-20">
          <div className="flex flex-col gap-5 px-5 sm:px-10 lg:w-[22rem] lg:shrink-0 lg:px-0">
            <span className="self-start rounded-full bg-white/14 px-3 py-1.5 text-[0.8125rem] font-bold">
              {t.tool.eyebrow}
            </span>
            <h2
              id="commercial-outil"
              className="font-display text-[2.125rem] leading-[1.05] font-bold tracking-tight sm:text-[2.75rem]"
            >
              {t.tool.title}
            </h2>
            <p className="text-[1.0625rem] leading-relaxed text-white/82">{t.tool.lead}</p>
            <ul className="flex flex-col gap-2.5">
              {t.tool.checks.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-[0.9375rem] text-white/90">
                  <Check aria-hidden="true" className="size-4 text-[#7ee2b0]" strokeWidth={2.6} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Ordinateur : les trois côte à côte, celui du milieu en avant. Téléphone : on fait
              défiler les écrans. */}
          <ul
            aria-label={t.tool.carousel}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:px-10 lg:flex-1 lg:justify-center lg:gap-2 lg:overflow-visible lg:px-0"
          >
            {[1, 0, 2].map((index) => {
              const center = index === 1;
              return (
                <li
                  key={index}
                  className={`flex w-[13.5rem] shrink-0 snap-center flex-col items-center gap-3 sm:w-[15rem] ${
                    center
                      ? "lg:order-2 lg:w-[17.5rem]"
                      : index === 0
                        ? "lg:order-1 lg:mt-14"
                        : "lg:order-3 lg:mt-14"
                  }`}
                >
                  <PhoneShot index={index} className="w-full" />
                  <b className="-mt-6 text-center text-[0.9375rem] sm:-mt-8">
                    {t.tool.phones[index]?.caption}
                  </b>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Une journée type. */}
      <section aria-labelledby="commercial-journee" className="py-14 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
          <SectionHeading
            id="commercial-journee"
            eyebrow={t.day.eyebrow}
            title={t.day.title}
            subtitle={t.day.lead}
          />
          <ol className="grid gap-0 lg:grid-cols-6">
            {t.day.steps.map((step, i) => {
              const Icon = DAY_ICONS[i] ?? Sun;
              const last = i === t.day.steps.length - 1;
              return (
                <li
                  key={step.time}
                  className="relative flex gap-4 pb-6 lg:flex-col lg:gap-3 lg:pr-4 lg:pb-0"
                >
                  {!last && (
                    <span
                      aria-hidden="true"
                      className="absolute top-12 bottom-0 left-[1.4rem] border-l-2 border-dashed border-border-strong lg:top-[1.4rem] lg:right-0 lg:bottom-auto lg:left-12 lg:border-t-2 lg:border-l-0"
                    />
                  )}
                  <span
                    className={`relative z-[1] flex size-11 shrink-0 items-center justify-center rounded-full text-white ${last ? "bg-success" : "bg-foreground"}`}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <b className="font-display text-[0.9375rem] text-primary-strong">{step.time}</b>
                    <b className="text-[1.0625rem] leading-snug">{step.title}</b>
                    <span className="text-[0.9375rem] leading-relaxed text-label">{step.text}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Plus vous travaillez, plus vous gagnez : l'escalier, sans montant. */}
      <section aria-labelledby="commercial-gains" className="pb-14 sm:pb-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6 lg:flex-row lg:items-end lg:gap-16">
          <div className="flex flex-col gap-4 lg:w-[23rem] lg:shrink-0 lg:pb-2">
            <span className="self-start rounded-full bg-primary-soft px-3 py-1.5 text-[0.8125rem] font-bold text-primary-strong">
              {t.earnings.eyebrow}
            </span>
            <h2
              id="commercial-gains"
              className="font-display text-[2.375rem] leading-[1.0] font-bold tracking-tight sm:text-[3.25rem]"
            >
              {t.earnings.title}
            </h2>
            <p className="text-[1.0625rem] leading-relaxed text-label">{t.earnings.lead}</p>
          </div>
          <ol className="grid flex-1 gap-3 sm:grid-cols-4 sm:items-end sm:gap-4">
            {t.earnings.steps.map((step, i) => {
              const last = i === t.earnings.steps.length - 1;
              return (
                <li
                  key={step.title}
                  className="flex items-center gap-4 sm:flex-col sm:items-stretch sm:gap-3"
                >
                  <span className="order-2 flex flex-col gap-1 sm:order-1">
                    <b className="text-sm text-primary-strong">0{i + 1}</b>
                    <b className="text-[1.0625rem] leading-snug">{step.title}</b>
                    <span className="text-[0.9375rem] leading-relaxed text-label">{step.text}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`order-1 flex w-14 shrink-0 items-start justify-center rounded-2xl pt-3 sm:order-2 sm:w-auto ${
                      STAIRS[i] ?? "h-28"
                    } ${
                      last
                        ? "border-2 border-dashed border-primary bg-[repeating-linear-gradient(135deg,var(--color-primary-soft)_0_10px,transparent_10px_20px)] text-primary"
                        : "bg-[linear-gradient(180deg,var(--color-primary)_0%,#2f4fe0_100%)] text-white"
                    } max-sm:h-auto max-sm:min-h-14 max-sm:items-center max-sm:pt-0`}
                  >
                    <TrendingUp className="size-6" />
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* C'est pour vous si… */}
      <section aria-labelledby="commercial-profils" className="pb-14 sm:pb-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-9 px-4 sm:px-6">
          <SectionHeading
            id="commercial-profils"
            eyebrow={t.profiles.eyebrow}
            title={t.profiles.title}
          />
          <ul className="grid gap-4 md:grid-cols-3">
            {t.profiles.items.map((item, i) => {
              const Icon = PROFILE_ICONS[i] ?? BriefcaseBusiness;
              return (
                <li
                  key={item.title}
                  className={`reveal flex flex-col gap-3.5 rounded-[1.375rem] p-6 sm:p-7 ${
                    i === 1 ? "bg-primary-soft" : "border border-border bg-surface"
                  }`}
                >
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-white">
                    <Icon aria-hidden="true" className="size-6" />
                  </span>
                  <b className="font-display text-[1.375rem] leading-tight tracking-tight">
                    {item.title}
                  </b>
                  <span className="leading-relaxed text-label">{item.text}</span>
                </li>
              );
            })}
          </ul>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2.5 text-[0.9375rem] text-label">
            {t.profiles.checks.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check aria-hidden="true" className="size-4 text-success" strokeWidth={2.6} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* De la candidature au terrain. */}
      <section aria-labelledby="commercial-deroule" className="pb-14 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-7 rounded-[1.5rem] border border-border bg-surface p-6 sm:p-10">
            <h2
              id="commercial-deroule"
              className="font-display text-[1.625rem] leading-tight font-bold tracking-tight sm:text-[1.875rem]"
            >
              {t.process.title}
            </h2>
            <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {t.process.steps.map((step, i) => {
                const Icon = PROCESS_ICONS[i] ?? Send;
                return (
                  <li key={step.title} className="flex items-start gap-3.5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="flex flex-col gap-1">
                      <b className="text-[1.0625rem]">{step.title}</b>
                      <span className="text-[0.9375rem] leading-relaxed text-label">
                        {step.text}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      <section aria-labelledby="commercial-questions" className="pb-14 sm:pb-20">
        <div className="mx-auto flex max-w-3xl flex-col gap-7 px-4 sm:px-6">
          <SectionHeading id="commercial-questions" eyebrow={t.faqEyebrow} title={t.faqTitle} />
          <div className="divide-y divide-border overflow-hidden rounded-[1.25rem] border border-border bg-surface">
            {t.faq.map((item) => (
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
        aria-labelledby="commercial-candidature"
        className="scroll-mt-24 px-2 pb-2 sm:px-4 sm:pb-4"
      >
        <div className="mx-auto grid max-w-[1440px] items-start gap-8 rounded-hero bg-[linear-gradient(150deg,#0b1438_0%,#16236e_58%,#2a3fb8_100%)] px-4 py-10 sm:px-10 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,35rem)] lg:gap-14 lg:px-16">
          <div className="flex flex-col gap-4 text-white lg:pt-3">
            <span className="self-start rounded-full bg-white/14 px-3 py-1.5 text-[0.8125rem] font-bold">
              {t.formEyebrow}
            </span>
            <h2
              id="commercial-candidature"
              className="font-display text-[2.25rem] leading-[1.02] font-bold tracking-tight sm:text-[3.125rem]"
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
