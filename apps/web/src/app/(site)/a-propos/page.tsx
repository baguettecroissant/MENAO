import { ArrowRight, Star } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/site/cta-band";
import { JsonLd } from "@/components/site/json-ld";
import { PageHero } from "@/components/site/page-hero";
import { ScenePhoto } from "@/components/site/scene-photo";
import { SectionHeading } from "@/components/site/section-heading";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { absoluteUrl } from "@/lib/site/seo";
import { ORGANIZATION_ID, WEBSITE_ID, organizationJsonLd } from "@/lib/site/structured-data";

const t = fr.pages.about;
// Les trois chiffres de l'accueil, au-dessus des engagements correspondants (le quatrième : avis).
const FIGURES: readonly ({ value: string } | undefined)[] = fr.trust.stats;

export const metadata: Metadata = {
  title: `${t.title} — MENAO`,
  description: t.metaDescription,
  alternates: { canonical: "/a-propos" },
};

/**
 * « À propos » (ADR 0134, refonte ADR 0276) : mission, engagements et zone de MENAO, avec son
 * identité en données structurées, pour les visiteurs, Google et les assistants IA. Uniquement
 * des faits déjà affichés sur le site.
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
        photo={{ scene: "meeting", position: "50% 30%" }}
      />

      {/* Mission : le premier paragraphe en grand, la particulière et l'artisan côte à côte. */}
      <section aria-labelledby="about-mission" className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-16">
          <div className="flex flex-col gap-5">
            <h2
              id="about-mission"
              className="text-[2rem] leading-[1.06] font-bold tracking-tight sm:text-[2.75rem]"
            >
              {t.missionTitle}
            </h2>
            {t.mission.map((paragraph, i) => (
              <p
                key={paragraph}
                className={
                  i === 0
                    ? "text-lg leading-relaxed font-medium text-pretty sm:text-xl"
                    : "leading-relaxed text-pretty text-label sm:text-lg"
                }
              >
                {paragraph}
              </p>
            ))}
          </div>
          <div className="relative mx-auto grid h-[22rem] w-full max-w-[32rem] grid-cols-2 gap-4 sm:h-[30rem] sm:gap-5">
            <div className="mb-10 overflow-hidden rounded-hero sm:mb-20">
              <ScenePhoto
                scene="camillePortrait"
                sizes="(min-width: 640px) 250px, 46vw"
                position="20% 30%"
                className="size-full"
              />
            </div>
            <div className="mt-10 overflow-hidden rounded-hero sm:mt-20">
              <ScenePhoto
                scene="julienPortrait"
                sizes="(min-width: 640px) 250px, 46vw"
                position="80% 25%"
                className="size-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Engagements : les trois chiffres de l'accueil, puis les avis. */}
      <section aria-labelledby="about-commitments" className="px-2 sm:px-4">
        <div className="mx-auto max-w-[1440px] rounded-hero bg-foreground px-6 py-14 text-white sm:px-12 sm:py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-10">
            <SectionHeading
              id="about-commitments"
              eyebrow={t.eyebrow}
              title={t.commitmentsTitle}
              align="left"
              tone="inverse"
            />
            <ul className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-0">
              {t.commitments.map((item, i) => (
                <li
                  key={item.title}
                  className="reveal flex flex-col gap-3 lg:border-l lg:border-white/15 lg:px-7 lg:first:border-l-0 lg:first:pl-0"
                >
                  {FIGURES[i] ? (
                    <span
                      aria-hidden="true"
                      className="font-display text-[3.25rem] leading-none font-bold tracking-tight"
                    >
                      {FIGURES[i].value}
                    </span>
                  ) : (
                    <span aria-hidden="true" className="flex h-[3.25rem] items-center gap-1">
                      {Array.from({ length: 5 }, (_, n) => (
                        <Star key={n} className="size-7 fill-[#f5b301] text-[#f5b301]" />
                      ))}
                    </span>
                  )}
                  <h3 className="font-display text-xl leading-snug font-bold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-[0.9375rem] leading-relaxed text-pretty text-white/75">
                    {item.text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Zone : le texte, et la photo de la côte de l'accueil. */}
      <section aria-labelledby="about-area" className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)] lg:gap-16">
          <div className="flex flex-col gap-5">
            <h2
              id="about-area"
              className="text-[2rem] leading-[1.06] font-bold tracking-tight text-balance sm:text-[2.75rem]"
            >
              {t.areaTitle}
            </h2>
            <p className="text-pretty text-label sm:text-lg">{t.area}</p>
            <ButtonLink
              href={"/#metiers" as Route}
              variant="secondary"
              block={false}
              className="self-start"
            >
              {t.tradesLink}
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          </div>
          <div className="aspect-[3/2] overflow-hidden rounded-hero">
            <ScenePhoto
              scene="coast"
              sizes="(min-width: 1024px) 576px, 92vw"
              className="size-full"
            />
          </div>
        </div>
      </section>

      <nav aria-labelledby="about-more" className="bg-surface py-14 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6">
          <h2
            id="about-more"
            className="text-[1.75rem] leading-[1.08] font-bold tracking-tight sm:text-[2.25rem]"
          >
            {t.moreTitle}
          </h2>
          <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {t.more.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href as Route}
                  className="group flex min-h-[4.75rem] items-center justify-between gap-3 rounded-[1.25rem] border border-border bg-background px-6 py-3 font-display text-lg leading-snug font-bold tracking-tight transition hover:border-primary/40 focus-visible:ring-4 focus-visible:ring-primary/25 focus-visible:outline-none"
                >
                  {link.label}
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="bg-surface pb-2">
        <CtaBand
          id="about-cta"
          title={fr.site.cta.title}
          text={fr.site.cta.text}
          action={{ href: "/recherche", label: fr.site.cta.action }}
          secondary={{ href: "/pro", label: fr.nav.pro }}
          reassurance={fr.site.cta.reassurance}
          photo={{ scene: "camillePortrait", position: "22% 30%" }}
        />
      </div>
    </main>
  );
}
