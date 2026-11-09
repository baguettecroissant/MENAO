import {
  ArrowRight,
  BellRing,
  Check,
  CircleCheck,
  FileText,
  Headset,
  Mic,
  PenLine,
  ReceiptText,
  Repeat,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { FaqJsonLd, FaqList } from "@/components/site/faq-list";
import { SectionHeading } from "@/components/site/section-heading";
import { ButtonLink, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  PRO_FEATURES,
  proFaqItems,
  proFeature,
  type ProFeatureSlug,
} from "@/lib/site/pro-features";
import { loadPricing } from "@/lib/site/pro-plans";
import { CallbackLink } from "./callback-link";
import { VoiceQuoteVisual } from "./feature-visuals";
import { ProAssistant } from "./pro-assistant";
import { ProFinalCta } from "./pro-final-cta";

const t = fr.pro.landing;
const f = t.featurePages;

export const FEATURE_ICONS: Record<ProFeatureSlug, typeof Mic> = {
  "logiciel-devis": Mic,
  "secretaire-telephonique": Headset,
  "acompte-en-ligne": Wallet,
  facturation: ReceiptText,
};
const STEP_ICONS = [Mic, FileText, PenLine];
const GAIN_ICONS = [ShieldCheck, Repeat, Wallet, BellRing];
const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/**
 * Gabarit des pages par fonction de l'Espace Pro (lot 21, ADR 0267) : bandeau, trois étapes, ce que
 * l'artisan y gagne, extrait du comparatif (valeurs lues en base), questions de la FAQ, liens vers
 * les autres fonctions et appel final.
 */
export async function FeaturePage({ slug }: { slug: ProFeatureSlug }) {
  const feature = proFeature(slug);
  const text = feature.text;
  const { pricingPlans, comparison } = await loadPricing();
  // Lignes dans l'ordre de la page (et non du comparatif), valeurs lues en base.
  const allRows = comparison.flatMap((group) => group.items);
  const rows = feature.included
    .map((libelle) => allRows.find((item) => item.libelle === libelle))
    .filter((item): item is (typeof allRows)[number] => item !== undefined);
  const faq = proFaqItems(feature.faq);
  const Icon = FEATURE_ICONS[slug];

  return (
    <main className="bg-background">
      <section aria-labelledby="fonction-title" className="px-2 pt-2 sm:px-4 sm:pt-4">
        <div className="mx-auto max-w-[1440px] overflow-hidden rounded-hero bg-[linear-gradient(150deg,#0b1438_0%,#16236e_58%,#2a3fb8_100%)] px-6 pt-24 pb-14 text-white sm:px-12 sm:pt-32 sm:pb-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_27rem] lg:gap-12">
            <div className="flex flex-col gap-5">
              <Breadcrumbs
                tone="inverse"
                items={[
                  { label: fr.site.home, href: "/" },
                  { label: f.breadcrumb, href: "/pro" },
                  { label: text.eyebrow },
                ]}
              />
              <span className="inline-flex items-center gap-2 self-start rounded-pill bg-white/12 px-3 py-1 text-sm font-bold">
                <Icon aria-hidden="true" className="size-4" />
                {text.eyebrow}
              </span>
              <h1
                id="fonction-title"
                className="text-[2.25rem] leading-[1.03] font-bold tracking-tight text-balance sm:text-[3.25rem] lg:text-[3.5rem]"
              >
                {text.title}
              </h1>
              <p className="max-w-xl text-pretty text-white/85 sm:text-lg">{text.lead}</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <ButtonLink href="/pro/inscription" size="lg" className="whitespace-nowrap">
                  {t.hero.signUp}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </ButtonLink>
                <CallbackLink tone="dark" />
              </div>
              <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
                {[text.availability, f.trial, f.noCommission].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm font-semibold text-white/90"
                  >
                    <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-[#7ee2b0]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div aria-hidden="true" className="hidden lg:block">
              <FeatureVisual slug={slug} />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="fonction-etapes" className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          <SectionHeading id="fonction-etapes" eyebrow={f.stepsEyebrow} title={text.stepsTitle} />
          <ol className="grid gap-4 md:grid-cols-3">
            {text.steps.map((step, i) => {
              const StepIcon = STEP_ICONS[i] ?? Sparkles;
              return (
                <li
                  key={step.title}
                  className="flex flex-col gap-3 rounded-[1.375rem] border border-border bg-surface p-6"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <StepIcon aria-hidden="true" className="size-5" />
                    </span>
                  </span>
                  <h3 className="font-display text-xl font-bold">{step.title}</h3>
                  <p className="text-[0.9375rem] leading-relaxed text-label">{step.text}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section
        aria-labelledby="fonction-gains"
        className="border-y border-border bg-surface px-4 py-16 sm:px-6 sm:py-20"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <SectionHeading id="fonction-gains" eyebrow={f.gainsEyebrow} title={f.gainsTitle} />
          <ul className="grid gap-3.5 md:grid-cols-2">
            {text.gains.map((gain, i) => {
              const GainIcon = GAIN_ICONS[i] ?? CircleCheck;
              return (
                <li
                  key={gain.title}
                  className="flex gap-4 rounded-[1.25rem] border border-border bg-background p-5"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-[0.875rem] bg-success-soft text-success">
                    <GainIcon aria-hidden="true" className="size-5" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-display text-[1.0625rem] font-bold">{gain.title}</h3>
                    <p className="text-[0.9375rem] leading-relaxed text-label">{gain.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {rows.length > 0 && pricingPlans.length > 0 && (
        <section aria-labelledby="fonction-formules" className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto flex max-w-4xl flex-col gap-7">
            <SectionHeading
              id="fonction-formules"
              eyebrow={f.includedEyebrow}
              title={text.includedTitle}
            />
            <div className="overflow-x-auto rounded-[1.375rem] border border-border bg-surface">
              <table className="w-full min-w-[34rem] border-collapse text-left">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="px-5 py-4 text-sm font-semibold text-muted-foreground"
                    >
                      {f.includedHead}
                    </th>
                    {pricingPlans.map((plan) => (
                      <th key={plan.code} scope="col" className="px-5 py-4 text-center">
                        <span className="font-display text-base font-bold">{plan.nom}</span>
                        <span className="block text-xs font-medium text-muted-foreground">
                          {euros.format(plan.monthlyCents / 100)} {t.perMonth}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.libelle} className="border-t border-border">
                      <th scope="row" className="px-5 py-3.5 text-[0.9375rem] font-medium">
                        {row.libelle}
                      </th>
                      {row.cells.map((cell, i) => (
                        <td
                          key={pricingPlans[i]?.code ?? i}
                          className={`px-5 py-3.5 text-center ${pricingPlans[i]?.recommandee ? "bg-primary/5" : ""}`}
                        >
                          {cell.kind === "inclus" ? (
                            <Check
                              aria-label={t.compare.included}
                              className="mx-auto size-5 text-success"
                              strokeWidth={3}
                            />
                          ) : cell.kind === "absent" ? (
                            <span aria-label={t.compare.notIncluded} className="text-border-strong">
                              —
                            </span>
                          ) : (
                            <span className="text-sm font-semibold">{cell.text}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link
              href={"/pro/formules" as Route}
              className={`self-center rounded-sm font-semibold text-primary-strong hover:underline ${focusRing}`}
            >
              {t.plansCompare}
            </Link>
          </div>
        </section>
      )}

      {slug === "facturation" && (
        <div className="px-4 pb-4 sm:px-6">
          <Link
            href={"/guides/facture-electronique-artisans" as Route}
            className={`mx-auto flex max-w-4xl items-center gap-4 rounded-[1.25rem] border border-border bg-surface p-5 transition-colors hover:border-border-strong ${focusRing}`}
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[0.875rem] bg-primary-soft text-primary">
              <FileText aria-hidden="true" className="size-5" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-xs font-bold tracking-[0.08em] text-primary-strong uppercase">
                {f.guideEyebrow}
              </span>
              <span className="font-semibold">{f.guideTitle}</span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="ml-auto size-5 shrink-0 text-muted-foreground"
            />
          </Link>
        </div>
      )}

      {faq.length > 0 && (
        <section aria-labelledby="fonction-faq" className="py-16 sm:py-20">
          <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 sm:px-6">
            <SectionHeading id="fonction-faq" eyebrow={f.faqEyebrow} title={text.faqTitle} />
            <FaqList items={faq} />
          </div>
          <FaqJsonLd items={faq} />
        </section>
      )}

      <FeatureLinks
        exclude={slug}
        id="fonction-autres"
        title={f.othersTitle}
        eyebrow={f.othersEyebrow}
      />

      <ProFinalCta id="fonction-final" />
      <ProAssistant />
    </main>
  );
}

/** Cartes vers les pages par fonction (maillage entre pages, pages Pro par métier). */
export function FeatureLinks({
  id,
  title,
  eyebrow,
  exclude,
  align = "center",
}: {
  id: string;
  title: string;
  eyebrow: string;
  exclude?: ProFeatureSlug;
  align?: "center" | "left";
}) {
  const items = PRO_FEATURES.filter((item) => item.slug !== exclude).map((item) => ({
    slug: item.slug,
    text: f.pages[item.slug],
  }));
  return (
    <section aria-labelledby={id} className="px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-7">
        <SectionHeading id={id} eyebrow={eyebrow} title={title} align={align} />
        <ul className={`grid gap-3.5 sm:grid-cols-2 ${items.length === 3 ? "lg:grid-cols-3" : ""}`}>
          {items.map((item) => {
            const ItemIcon = FEATURE_ICONS[item.slug];
            return (
              <li key={item.slug}>
                <Link
                  href={`/pro/${item.slug}` as Route}
                  className={`flex h-full gap-4 rounded-[1.25rem] border border-border bg-surface p-5 transition-colors hover:border-border-strong ${focusRing}`}
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-[0.875rem] bg-primary-soft text-primary">
                    <ItemIcon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="font-display text-[1.0625rem] font-bold">
                      {item.text.eyebrow}
                    </span>
                    <span className="text-sm leading-relaxed text-label">{item.text.title}</span>
                    <span className="pt-1 text-sm font-semibold text-primary-strong">
                      {f.discover} ›
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Visuel décoratif du bandeau, propre à chaque fonction (valeurs d'exemple). */
function FeatureVisual({ slug }: { slug: ProFeatureSlug }) {
  const v = t.featureVisuals;
  const card = (children: ReactNode, className = "") => (
    <div className={`rounded-[1.25rem] bg-white p-5 text-foreground shadow-raised ${className}`}>
      {children}
    </div>
  );
  if (slug === "secretaire-telephonique") {
    const a = t.agents;
    return (
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-3 rounded-[1.375rem] border border-white/15 bg-white/[0.06] p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#86a0fb,#4869f6)] font-bold">
              C
            </span>
            <div className="flex flex-col">
              <span className="font-bold">{a.callTitle}</span>
              <span className="text-sm text-white/70">{a.callMeta}</span>
            </div>
            <span className="ml-auto rounded-[0.625rem] bg-[#7ee2b0]/20 px-2.5 py-1 text-xs font-bold text-[#7ee2b0]">
              {a.callStatus}
            </span>
          </div>
          <p className="rounded-[0.875rem] bg-white/[0.06] px-3.5 py-3 text-sm leading-relaxed text-white/85">
            {a.callText}
          </p>
        </div>
        {card(
          <div className="flex flex-col gap-1.5">
            {v.agenda.map((slot) => (
              <span key={slot.time} className="flex items-center gap-2.5 text-sm">
                <b className="w-12">{slot.time}</b>
                <span className="flex-1 rounded-[0.625rem] bg-primary-soft px-2.5 py-1.5 font-semibold text-primary-strong">
                  {slot.label}
                </span>
              </span>
            ))}
          </div>,
        )}
      </div>
    );
  }
  if (slug === "acompte-en-ligne") {
    const m = fr.site.mockups.deposit;
    return (
      <div className="flex flex-col gap-3.5">
        {card(
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-sm font-bold">
              {m.title}
              <span className="font-normal text-muted-foreground">{m.time}</span>
            </span>
            <span className="font-display text-[2.25rem] leading-none font-bold tracking-tight text-success">
              {v.deposit}
            </span>
            <span className="text-sm text-label">{m.text}</span>
          </div>,
        )}
        {card(
          <span className="inline-flex items-center gap-2 text-sm font-bold text-success">
            <CircleCheck className="size-4" />
            {v.pv}
          </span>,
          "self-start",
        )}
      </div>
    );
  }
  if (slug === "facturation") {
    return card(
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2.5">
          {v.invoices.map((invoice) => (
            <span
              key={invoice.ref}
              className="flex flex-col gap-0.5 rounded-xl border border-border p-3 text-sm"
            >
              <b>{invoice.title}</b>
              <span className="text-muted-foreground">{invoice.ref}</span>
            </span>
          ))}
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-xl bg-success-soft px-3 py-2 text-sm font-bold text-success">
          <CircleCheck className="size-4" />
          {f.pages.facturation.steps[2].title}
        </span>
      </div>,
    );
  }
  // Logiciel de devis : la dictée et les lignes chiffrées (visuel de /pro).
  return card(<VoiceQuoteVisual />);
}
