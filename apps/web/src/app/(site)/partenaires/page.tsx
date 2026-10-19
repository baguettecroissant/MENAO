import type { Metadata } from "next";
import { CircleCheck, ShieldCheck } from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import { PageHero } from "@/components/site/page-hero";
import { SectionHeading } from "@/components/site/section-heading";
import { Steps } from "@/components/site/steps";
import { Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { absoluteUrl } from "@/lib/site/seo";
import { ORGANIZATION_ID, breadcrumbJsonLd } from "@/lib/site/structured-data";
import { PartnerApplicationForm } from "./partner-application-form";

const t = fr.pages.partners;

export const metadata: Metadata = {
  title: `${t.metaTitle} — MENAO`,
  description: t.metaDescription,
  alternates: { canonical: "/partenaires" },
};

/**
 * Programme Partenaires, page publique (F-59, ADR 0139) : à qui il s'adresse, comment il
 * fonctionne, ce qui est récompensé (sans montant), transparence, candidature.
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
      />

      <section aria-labelledby="partenaires-cible" className="py-14 sm:py-20">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 sm:px-6">
          <SectionHeading id="partenaires-cible" eyebrow={t.eyebrow} title={t.audienceTitle} />
          <ul className="grid gap-3 sm:grid-cols-2">
            {t.audiences.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3.5 shadow-card"
              >
                <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="partenaires-etapes" className="bg-surface py-14 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
          <SectionHeading id="partenaires-etapes" eyebrow={t.stepsEyebrow} title={t.stepsTitle} />
          <Steps items={t.steps} />
        </div>
      </section>

      <section aria-labelledby="partenaires-regles" className="py-14 sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h2 id="partenaires-regles" className="text-2xl font-medium tracking-tight">
              {t.rulesTitle}
            </h2>
            {t.rules.map((rule) => (
              <Card key={rule.title} className="flex flex-col gap-1">
                <h3 className="font-medium">{rule.title}</h3>
                <p className="text-sm text-muted-foreground">{rule.text}</p>
              </Card>
            ))}
            <p className="text-sm text-muted-foreground">{t.amounts}</p>
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-medium tracking-tight">{t.trustTitle}</h2>
            <ul className="flex flex-col gap-3">
              {t.trust.map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        id="candidature"
        aria-labelledby="partenaires-candidature"
        className="scroll-mt-20 bg-surface py-14 sm:py-20"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 sm:px-6">
          <SectionHeading
            id="partenaires-candidature"
            eyebrow={t.eyebrow}
            title={t.formTitle}
            subtitle={t.formLead}
          />
          <Card>
            <PartnerApplicationForm />
          </Card>
        </div>
      </section>
    </main>
  );
}
