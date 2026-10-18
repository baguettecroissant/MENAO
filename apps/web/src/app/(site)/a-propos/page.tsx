import { ArrowRight, BadgeCheck, MapPin, MessageCircle, Star, Wallet } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/site/cta-band";
import { JsonLd } from "@/components/site/json-ld";
import { PageHero } from "@/components/site/page-hero";
import { SectionHeading } from "@/components/site/section-heading";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { absoluteUrl } from "@/lib/site/seo";
import { ORGANIZATION_ID, WEBSITE_ID, organizationJsonLd } from "@/lib/site/structured-data";

const t = fr.pages.about;
const ICONS = [BadgeCheck, Wallet, MessageCircle, Star];

export const metadata: Metadata = {
  title: `${t.title} — MENAO`,
  description: t.metaDescription,
  alternates: { canonical: "/a-propos" },
};

/**
 * « À propos » (ADR 0134) : mission, engagements et zone de MENAO, avec son identité en données
 * structurées, pour les visiteurs, Google et les assistants IA. Uniquement des faits déjà affichés
 * sur le site.
 */
export default function AboutPage() {
  return (
    <main className="bg-background">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: t.title,
          url: absoluteUrl("/a-propos"),
          description: t.metaDescription,
          about: { "@id": ORGANIZATION_ID },
          isPartOf: { "@id": WEBSITE_ID },
          inLanguage: "fr-FR",
        }}
      />
      <PageHero
        id="about-title"
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
      />

      <section aria-labelledby="about-mission" className="py-16 sm:py-20">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 sm:px-6">
          <h2 id="about-mission" className="text-2xl font-medium tracking-tight sm:text-3xl">
            {t.missionTitle}
          </h2>
          {t.mission.map((paragraph) => (
            <p
              key={paragraph}
              className="text-lg leading-relaxed text-pretty text-muted-foreground"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section aria-labelledby="about-commitments" className="bg-surface py-16 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
          <SectionHeading id="about-commitments" eyebrow={t.eyebrow} title={t.commitmentsTitle} />
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.commitments.map((item, i) => {
              const Icon = ICONS[i] ?? BadgeCheck;
              return (
                <li
                  key={item.title}
                  className="flex flex-col gap-3 rounded-card border border-border bg-background p-5"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
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

      <section aria-labelledby="about-area" className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h2
              id="about-area"
              className="flex items-center gap-2 text-2xl font-medium tracking-tight"
            >
              <MapPin aria-hidden="true" className="size-6 text-primary" />
              {t.areaTitle}
            </h2>
            <p className="text-lg leading-relaxed text-pretty text-muted-foreground">{t.area}</p>
            <Link
              href={"/#metiers" as Route}
              className="inline-flex items-center gap-1 self-start font-medium text-primary-strong underline-offset-2 hover:underline"
            >
              {t.tradesLink}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <nav aria-labelledby="about-more" className="flex flex-col gap-4">
            <h2 id="about-more" className="text-2xl font-medium tracking-tight">
              {t.moreTitle}
            </h2>
            <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
              {t.more.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href as Route}
                    className="flex min-h-12 items-center justify-between px-4 font-medium hover:bg-background"
                  >
                    {link.label}
                    <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      <div className="pb-2">
        <CtaBand
          id="about-cta"
          title={fr.site.cta.title}
          text={fr.site.cta.text}
          action={{ href: "/recherche", label: fr.site.cta.action }}
          secondary={{ href: "/pro", label: fr.nav.pro }}
          reassurance={fr.site.cta.reassurance}
        />
      </div>
    </main>
  );
}
