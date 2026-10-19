import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock } from "lucide-react";
import { CtaBand } from "@/components/site/cta-band";
import { JsonLd } from "@/components/site/json-ld";
import { PageHero } from "@/components/site/page-hero";
import { SectionHeading } from "@/components/site/section-heading";
import { StatusBadge } from "@/components/ui";
import type { Guide } from "@/content/guides";
import { fr } from "@/i18n/fr";
import { publishedGuides, readingMinutes, visibleGuides } from "@/lib/site/guides";
import { guideCover } from "@/lib/site/images";
import { absoluteUrl } from "@/lib/site/seo";
import { ORGANIZATION_ID, breadcrumbJsonLd } from "@/lib/site/structured-data";
import { frenchSpacing } from "@/lib/site/typography";

const t = fr.guides;
const AUDIENCES = ["particuliers", "artisans"] as const;

export const metadata: Metadata = {
  title: `${t.metaTitle} — MENAO`,
  description: t.metaDescription,
  alternates: { canonical: "/guides" },
  // Tant qu'aucun guide n'est publié, la rubrique (brouillons) ne doit pas être indexée.
  ...(publishedGuides().length === 0 ? { robots: { index: false, follow: false } } : {}),
};

function GuideCard({ guide }: { guide: Guide }) {
  const cover = guide.cover && guideCover(guide.slug);
  return (
    <li>
      <Link
        href={`/guides/${guide.slug}` as Route}
        className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card transition hover:border-primary/40 hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/25 focus-visible:outline-none"
      >
        {cover && guide.cover && (
          <span className="block aspect-[16/9] overflow-hidden bg-primary-softer">
            {/* eslint-disable-next-line @next/next/no-img-element -- images non optimisées par Vercel (spec §4.4) */}
            <img
              src={cover.src}
              srcSet={cover.srcSet}
              sizes="(min-width: 1024px) 23rem, (min-width: 640px) 50vw, 100vw"
              width={cover.width}
              height={cover.height}
              alt=""
              loading="lazy"
              decoding="async"
              style={{ objectPosition: guide.cover.position }}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          </span>
        )}
        <span className="flex flex-1 flex-col gap-3 p-6">
          {guide.draft && (
            <span className="self-start">
              <StatusBadge tone="warning">{t.draft}</StatusBadge>
            </span>
          )}
          <h3 className="text-lg leading-snug font-medium text-balance">
            {frenchSpacing(guide.title)}
          </h3>
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
            {guide.description}
          </p>
          <span className="mt-auto flex items-center justify-between gap-3 pt-2 text-sm">
            <span className="inline-flex items-center gap-1.5 text-subtle-foreground">
              <Clock aria-hidden="true" className="size-4" />
              {t.minutes(readingMinutes(guide))}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              {t.read}
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * Rubrique Guides (ADR 0135) : articles relus, sourcés, regroupés par public. Les brouillons ne
 * sont visibles qu'en local et en prévisualisation, pour la relecture.
 */
export default function GuidesPage() {
  const guides = visibleGuides();
  if (guides.length === 0) notFound();
  const published = publishedGuides();

  return (
    <main className="bg-background">
      {published.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "CollectionPage",
                name: t.metaTitle,
                description: t.metaDescription,
                url: absoluteUrl("/guides"),
                inLanguage: "fr-FR",
                publisher: { "@id": ORGANIZATION_ID },
                mainEntity: {
                  "@type": "ItemList",
                  itemListElement: published.map((g, i) => ({
                    "@type": "ListItem",
                    position: i + 1,
                    url: absoluteUrl(`/guides/${g.slug}`),
                    name: g.title,
                  })),
                },
              },
              breadcrumbJsonLd([
                { name: fr.seo.breadcrumbHome, path: "/" },
                { name: t.breadcrumb, path: "/guides" },
              ]),
            ],
          }}
        />
      )}
      <PageHero
        id="guides-title"
        eyebrow={t.eyebrow}
        title={t.title}
        accent={t.accent}
        subtitle={t.subtitle}
        breadcrumbs={[{ label: fr.seo.breadcrumbHome, href: "/" }, { label: t.breadcrumb }]}
      />

      {AUDIENCES.map((audience) => {
        const list = guides.filter((g) => g.audience === audience);
        if (list.length === 0) return null;
        return (
          <section
            key={audience}
            aria-labelledby={`guides-${audience}`}
            className="py-12 first-of-type:pt-16 sm:py-16"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6">
              <SectionHeading
                id={`guides-${audience}`}
                eyebrow={t.eyebrow}
                title={t.audiences[audience]}
                align="left"
              />
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((guide) => (
                  <GuideCard key={guide.slug} guide={guide} />
                ))}
              </ul>
            </div>
          </section>
        );
      })}

      <CtaBand
        id="guides-cta"
        title={fr.site.cta.title}
        text={fr.site.cta.text}
        action={{ href: "/recherche", label: fr.site.cta.action }}
        secondary={{ href: "/pro", label: fr.nav.pro }}
        reassurance={fr.site.cta.reassurance}
      />
    </main>
  );
}
