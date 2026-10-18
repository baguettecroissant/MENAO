import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight, ExternalLink, ListChecks } from "lucide-react";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CtaBand } from "@/components/site/cta-band";
import { FaqJsonLd, FaqList } from "@/components/site/faq-list";
import { GuideBody } from "@/components/site/guide-body";
import { JsonLd } from "@/components/site/json-ld";
import { RichText } from "@/components/site/rich-text";
import { StatusBadge, Tag } from "@/components/ui";
import type { Guide } from "@/content/guides";
import { fr } from "@/i18n/fr";
import { findGuide, readingMinutes, tableOfContents, visibleGuides } from "@/lib/site/guides";
import { shareImage } from "@/lib/site/images";
import { absoluteUrl } from "@/lib/site/seo";
import { ORGANIZATION_ID, breadcrumbJsonLd } from "@/lib/site/structured-data";
import { frenchSpacing } from "@/lib/site/typography";

const t = fr.guides;

// Seuls les guides connus au build existent (brouillons compris hors production).
export const dynamicParams = false;

export function generateStaticParams() {
  return visibleGuides().map((g) => ({ slug: g.slug }));
}

const dayFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const formatDay = (iso: string) => dayFormat.format(new Date(`${iso}T00:00:00Z`));

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const guide = findGuide((await params).slug);
  if (!guide) return {};
  const title = `${guide.metaTitle} — MENAO`;
  const path = `/guides/${guide.slug}`;
  return {
    title,
    description: guide.description,
    alternates: { canonical: path },
    // Brouillon : jamais indexé, même sur un déploiement de prévisualisation.
    ...(guide.draft ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      description: guide.description,
      url: path,
      type: "article",
      locale: "fr_FR",
      siteName: "MENAO",
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
      images: [shareImage()],
    },
    twitter: { card: "summary_large_image", images: [shareImage().url] },
  };
}

function articleJsonLd(guide: Guide) {
  const url = absoluteUrl(`/guides/${guide.slug}`);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: guide.title,
        description: guide.description,
        url,
        mainEntityOfPage: url,
        image: absoluteUrl(shareImage().url),
        datePublished: guide.publishedAt,
        dateModified: guide.updatedAt,
        inLanguage: "fr-FR",
        isAccessibleForFree: true,
        author: {
          "@type": "Organization",
          "@id": ORGANIZATION_ID,
          name: fr.meta.name,
          url: absoluteUrl("/"),
        },
        publisher: { "@id": ORGANIZATION_ID },
        citation: guide.sources.map((s) => ({
          "@type": "CreativeWork",
          name: s.label,
          url: s.url,
        })),
      },
      breadcrumbJsonLd([
        { name: fr.seo.breadcrumbHome, path: "/" },
        { name: t.breadcrumb, path: "/guides" },
        { name: guide.title, path: `/guides/${guide.slug}` },
      ]),
    ],
  };
}

function Toc({ items }: { items: readonly { id: string; text: string }[] }) {
  return (
    <ol className="flex flex-col gap-1 text-sm">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className="block rounded-md px-2 py-1.5 text-muted-foreground transition hover:bg-surface hover:text-foreground"
          >
            {frenchSpacing(item.text)}
          </a>
        </li>
      ))}
    </ol>
  );
}

/**
 * Guide (ADR 0135) : l'essentiel en tête, sommaire, corps, questions fréquentes et sources
 * officielles. Données structurées Article, FAQPage et fil d'Ariane, sauf pour un brouillon.
 */
export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const guide = findGuide((await params).slug);
  if (!guide) notFound();
  const toc = tableOfContents(guide);
  const others = visibleGuides()
    .filter((g) => g.slug !== guide.slug)
    .sort((a, b) => Number(b.audience === guide.audience) - Number(a.audience === guide.audience))
    .slice(0, 3);
  const pro = guide.audience === "artisans";
  // Autres guides puis liens du guide, sans doublon.
  const related = [
    ...others.map((g) => ({ href: `/guides/${g.slug}`, label: g.title })),
    ...guide.related,
  ].filter((link, i, all) => all.findIndex((l) => l.href === link.href) === i);

  return (
    <main className="bg-background">
      {!guide.draft && <JsonLd data={articleJsonLd(guide)} />}

      <header className="px-4 pt-8 sm:px-6 sm:pt-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <Breadcrumbs
            items={[
              { label: fr.seo.breadcrumbHome, href: "/" },
              { label: t.breadcrumb, href: "/guides" },
              { label: guide.title },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Tag>{t.audienceTag[guide.audience]}</Tag>
            {guide.draft && <StatusBadge tone="warning">{t.draft}</StatusBadge>}
          </div>
          <h1 className="max-w-4xl text-[2rem] leading-[1.1] font-medium tracking-tight text-balance sm:text-[2.75rem]">
            {frenchSpacing(guide.title)}
          </h1>
          <p className="max-w-3xl text-lg text-pretty text-muted-foreground">
            {frenchSpacing(guide.description)}
          </p>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-subtle-foreground">
            <span>{t.byline}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={guide.updatedAt}>{t.updated(formatDay(guide.updatedAt))}</time>
            <span aria-hidden="true">·</span>
            <span>{t.minutes(readingMinutes(guide))}</span>
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-16">
        <article className="flex max-w-[46rem] min-w-0 flex-col gap-10">
          <section
            aria-labelledby="guide-essentials"
            className="flex flex-col gap-4 rounded-hero border border-primary-soft bg-primary-softer p-6 sm:p-7"
          >
            <h2
              id="guide-essentials"
              className="flex items-center gap-2 text-lg font-semibold text-primary-strong"
            >
              <ListChecks aria-hidden="true" className="size-5" />
              {t.essentials}
            </h2>
            <ul className="flex flex-col gap-3">
              {guide.essentials.map((item) => (
                <li key={item} className="flex gap-3 text-[0.9375rem] leading-relaxed">
                  <ChevronRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />
                  <span className="text-pretty">
                    <RichText text={item} />
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <details className="rounded-card border border-border bg-surface p-4 lg:hidden">
            <summary className="cursor-pointer font-medium">{t.toc}</summary>
            <nav aria-label={t.toc} className="pt-3">
              <Toc items={toc} />
            </nav>
          </details>

          <GuideBody blocks={guide.body} />

          <section aria-labelledby="guide-faq" className="flex flex-col gap-6">
            <h2
              id="guide-faq"
              className="text-[1.5rem] leading-tight font-medium tracking-tight sm:text-[1.75rem]"
            >
              {t.faqTitle}
            </h2>
            <FaqList items={guide.faq} />
            {!guide.draft && <FaqJsonLd items={guide.faq} />}
          </section>

          <section
            aria-labelledby="guide-sources"
            className="flex flex-col gap-4 border-t border-border pt-8"
          >
            <h2 id="guide-sources" className="text-lg font-semibold">
              {t.sourcesTitle}
            </h2>
            <ul className="flex flex-col gap-2.5 text-sm">
              {guide.sources.map((source) => (
                <li key={source.url} className="flex gap-2">
                  <ExternalLink
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-subtle-foreground"
                  />
                  <span>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {source.label}
                      <span className="sr-only"> {t.newTab}</span>
                    </a>{" "}
                    <span className="text-muted-foreground">— {source.publisher}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed text-muted-foreground">{t.sourcesNote}</p>
          </section>
        </article>

        <aside className="hidden lg:block">
          <nav aria-label={t.toc} className="sticky top-24 flex flex-col gap-3">
            <p className="px-2 text-xs font-semibold tracking-[0.12em] text-subtle-foreground uppercase">
              {t.toc}
            </p>
            <Toc items={toc} />
          </nav>
        </aside>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="guide-related" className="bg-surface py-14 sm:py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6">
            <h2
              id="guide-related"
              className="text-[1.5rem] leading-tight font-medium tracking-tight sm:text-[1.75rem]"
            >
              {t.relatedTitle}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href as Route}
                    className="group flex h-full items-center gap-3 rounded-card border border-border bg-background px-4 py-3.5 transition hover:border-primary/40 hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/25 focus-visible:outline-none"
                  >
                    <span className="flex-1 text-[0.9375rem] font-medium text-pretty">
                      {frenchSpacing(link.label)}
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {pro ? (
        <CtaBand
          id="guide-cta"
          title={t.proCta.title}
          text={t.proCta.text}
          action={{ href: "/pro/inscription", label: t.proCta.action }}
          secondary={{ href: "/pro", label: fr.nav.pro }}
          reassurance={fr.pro.landing.finalReassurance}
        />
      ) : (
        <CtaBand
          id="guide-cta"
          title={fr.site.cta.title}
          text={fr.site.cta.text}
          action={{ href: "/recherche", label: fr.site.cta.action }}
          reassurance={fr.site.cta.reassurance}
        />
      )}
    </main>
  );
}
