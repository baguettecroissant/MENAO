import { MapPin } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/site/cta-band";
import { PageHero } from "@/components/site/page-hero";
import { TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { cityArtisans, seoCatalog } from "@/lib/site/catalog";

const t = fr.home;
const about = fr.pages.about;

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `${t.citiesPage.title} — MENAO`,
  description: about.area,
  alternates: { canonical: "/villes" },
};

/**
 * Page carrefour des communes (ADR 0264) : chaque commune pilote et ses métiers. Seules les pages
 * métier × commune qui présentent un artisan (celles du plan du site) sont liées.
 */
export default async function CitiesPage() {
  const { trades, communes } = await seoCatalog();
  const covered = await Promise.all(
    communes.map(async (commune) => ({
      commune,
      trades: (
        await Promise.all(
          trades.map(async (trade) =>
            (await cityArtisans(trade.code, commune.code_insee)).length > 0 ? trade : null,
          ),
        )
      ).filter((trade): trade is (typeof trades)[number] => trade !== null),
    })),
  );
  return (
    <main className="bg-background">
      <PageHero
        id="villes-title"
        eyebrow={t.zone.eyebrow}
        title={about.areaTitle}
        subtitle={about.area}
        breadcrumbs={[{ label: fr.site.home, href: "/" }, { label: t.citiesPage.breadcrumb }]}
      />
      <section className="py-14 sm:py-20">
        <ul className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          {covered.map(({ commune, trades: list }) => (
            <li
              key={commune.slug}
              id={commune.slug}
              className="flex scroll-mt-24 flex-col gap-3 rounded-[1.25rem] border border-border bg-surface p-5"
            >
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <MapPin aria-hidden="true" className="size-4 text-primary" />
                {commune.nom}
              </h2>
              {list.length > 0 ? (
                <ul
                  aria-label={t.citiesPage.tradesIn(commune.nom)}
                  className="flex flex-wrap gap-2"
                >
                  {list.map((trade) => (
                    <li key={trade.code}>
                      <Link
                        href={`/${trade.code}/${commune.slug}` as Route}
                        className="inline-flex min-h-9 items-center rounded-pill border border-border bg-background px-3 text-sm font-semibold transition-colors hover:border-border-strong focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
                      >
                        {fr.seo.cityTitle(trade.label, commune.nom)}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <TextLink href="/recherche" className="self-start text-sm">
                  {fr.site.cta.action}
                </TextLink>
              )}
            </li>
          ))}
        </ul>
      </section>
      <CtaBand
        id="villes-cta"
        title={fr.site.cta.title}
        text={fr.site.cta.text}
        action={{ href: "/recherche", label: fr.site.cta.action }}
        reassurance={fr.site.cta.reassurance}
      />
    </main>
  );
}
