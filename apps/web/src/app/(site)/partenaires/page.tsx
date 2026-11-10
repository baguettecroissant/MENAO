import type { Metadata, Route } from "next";
import {
  ArrowRight,
  Award,
  Building2,
  Calculator,
  Clapperboard,
  Inbox,
  Umbrella,
} from "lucide-react";
import { CheckLine, NumberedSteps } from "@/components/site/info-blocks";
import { JsonLd } from "@/components/site/json-ld";
import { PageHero } from "@/components/site/page-hero";
import { SectionHeading } from "@/components/site/section-heading";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { absoluteUrl } from "@/lib/site/seo";
import { ORGANIZATION_ID, breadcrumbJsonLd } from "@/lib/site/structured-data";
import { PartnerApplicationForm } from "./partner-application-form";

const t = fr.pages.partners;
const AUDIENCE_ICONS = [Building2, Umbrella, Calculator, Clapperboard];
const RULE_ICONS = [Inbox, Award];
const RULE_TONES = ["bg-primary-soft text-primary-strong", "bg-success-soft text-success"];

export const metadata: Metadata = {
  title: `${t.metaTitle} — MENAO`,
  description: t.metaDescription,
  alternates: { canonical: "/partenaires" },
};

/**
 * Programme Partenaires, page publique (F-59, ADR 0139, refonte ADR 0276) : à qui il s'adresse,
 * comment il fonctionne, ce qui est récompensé (sans montant), transparence, candidature.
 */
export default function PartnersPage() {
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
              url: absoluteUrl("/partenaires"),
              inLanguage: "fr-FR",
              publisher: { "@id": ORGANIZATION_ID },
            },
            breadcrumbJsonLd([
              { name: fr.seo.breadcrumbHome, path: "/" },
              { name: t.title, path: "/partenaires" },
            ]),
          ],
        }}
      />
      <PageHero
        id="partenaires-titre"
        eyebrow={t.eyebrow}
        title={t.heroTitle}
        accent={t.heroAccent}
        subtitle={t.intro}
        breadcrumbs={[{ label: fr.seo.breadcrumbHome, href: "/" }, { label: t.title }]}
        actions={
          <ButtonLink
            href={"#candidature" as Route}
            variant="secondary"
            size="lg"
            className="border-white"
          >
            {t.formTitle}
            <ArrowRight aria-hidden="true" className="size-4" />
          </ButtonLink>
        }
        photo={{ scene: "meeting", position: "50% 30%" }}
        overlay={
          // Les deux cas récompensés, posés sur la photo (décoratif : le détail est plus bas).
          <div aria-hidden="true" className="hidden lg:block">
            {t.rules.map((rule, i) => {
              const Icon = RULE_ICONS[i] ?? Inbox;
              return (
                <div
                  key={rule.title}
                  className={`absolute flex w-72 items-start gap-3.5 rounded-[1.25rem] bg-surface p-4 text-foreground shadow-[0_24px_50px_-12px_rgb(4_8_30/0.5)] ${i === 0 ? "bottom-36 left-[54%]" : "right-12 bottom-12"}`}
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${RULE_TONES[i % 2]}`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[0.6875rem] font-bold tracking-[0.06em] text-label uppercase">
                      {t.rulesTitle}
                    </span>
                    <span className="font-display text-[1.0625rem] leading-tight font-bold tracking-tight">
                      {rule.title}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        }
      />

      <section aria-labelledby="partenaires-cible" className="py-14 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6">
          <SectionHeading
            id="partenaires-cible"
            eyebrow={t.eyebrow}
            title={t.audienceTitle}
            align="left"
          />
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.audiences.map((item, i) => {
              const Icon = AUDIENCE_ICONS[i] ?? Building2;
              return (
                <li
                  key={item}
                  className="reveal flex flex-col gap-4 rounded-[1.375rem] border border-border bg-surface p-6 shadow-card"
                >
                  <span className="flex size-11 items-center justify-center rounded-[0.875rem] bg-primary-soft text-primary-strong">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="font-display text-xl leading-tight font-bold tracking-tight text-balance">
                    {item}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section aria-labelledby="partenaires-etapes" className="px-2 sm:px-4">
        <div className="mx-auto max-w-[1440px] rounded-hero bg-foreground px-6 py-14 text-white sm:px-12 sm:py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-10">
            <SectionHeading
              id="partenaires-etapes"
              eyebrow={t.stepsEyebrow}
              title={t.stepsTitle}
              align="left"
              tone="inverse"
            />
            <NumberedSteps items={t.steps} tone="inverse" />
          </div>
        </div>
      </section>

      <section aria-labelledby="partenaires-regles" className="py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <div className="flex flex-col gap-5">
            <h2
              id="partenaires-regles"
              className="text-[1.75rem] leading-[1.08] font-bold tracking-tight sm:text-[2.25rem]"
            >
              {t.rulesTitle}
            </h2>
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              {t.rules.map((rule, i) => {
                const Icon = RULE_ICONS[i] ?? Inbox;
                return (
                  <div
                    key={rule.title}
                    className="reveal flex flex-col gap-3 rounded-[1.375rem] border border-border bg-surface p-7 shadow-card"
                  >
                    <span
                      className={`flex size-11 items-center justify-center rounded-[0.875rem] ${RULE_TONES[i % 2]}`}
                    >
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <h3 className="font-display text-xl leading-snug font-bold tracking-tight">
                      {rule.title}
                    </h3>
                    <p className="leading-relaxed text-pretty text-label">{rule.text}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-[0.9375rem] text-muted-foreground">{t.amounts}</p>
          </div>
          <div className="flex flex-col gap-4 rounded-[1.375rem] bg-primary-soft p-7">
            <h2 className="font-display text-2xl font-bold tracking-tight">{t.trustTitle}</h2>
            <ul className="flex flex-col gap-4">
              {t.trust.map((item) => (
                <CheckLine key={item}>{item}</CheckLine>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        id="candidature"
        aria-labelledby="partenaires-candidature"
        className="scroll-mt-24 bg-surface py-14 sm:py-20"
      >
        <div className="mx-auto grid max-w-6xl items-start gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-16">
          <SectionHeading
            id="partenaires-candidature"
            eyebrow={t.eyebrow}
            title={t.formTitle}
            subtitle={t.formLead}
            align="left"
          />
          <div className="rounded-hero border border-border bg-surface p-6 shadow-card sm:p-10">
            <PartnerApplicationForm />
          </div>
        </div>
      </section>
    </main>
  );
}
