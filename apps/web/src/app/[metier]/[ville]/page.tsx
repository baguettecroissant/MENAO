import { parisToday } from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtisanResultCard } from "@/components/project/artisan-result-card";
import { TRADE_VISUALS, DEFAULT_TRADE_VISUAL } from "@/components/site/trade-visuals";
import { ButtonLink } from "@/components/ui";
import { ArrowRight } from "lucide-react";
import { availability, specialtiesPreview } from "@menao/core";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "@/lib/site/catalog";
import { absoluteUrl } from "@/lib/site/seo";
import { createPublicClient } from "@/lib/supabase/public";

const t = fr.seo;

// Pré-générées au build pour les métiers × communes pilotes, régénérées toutes les heures.
export const revalidate = 3600;

export async function generateStaticParams() {
  const { trades, communes } = await seoCatalog();
  return trades.flatMap((tr) => communes.map((c) => ({ metier: tr.code, ville: c.slug })));
}

async function load(metier: string, ville: string) {
  const { trades, communes } = await seoCatalog();
  const trade = trades.find((tr) => tr.code === metier);
  const commune = communes.find((c) => c.slug === ville);
  return trade && commune ? { trade, commune, trades, communes } : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/[metier]/[ville]">): Promise<Metadata> {
  const { metier, ville } = await params;
  const data = await load(metier, ville);
  if (!data) return {};
  const title = t.cityMetaTitle(data.trade.label, data.commune.nom, data.commune.departement);
  const description = t.cityDescription(data.trade.label, data.commune.nom);
  const path = `/${data.trade.code}/${data.commune.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website", locale: "fr_FR" },
  };
}

/** Page SEO métier × ville (F-02) : artisans vérifiés de la commune, sans coordonnées. */
export default async function TradeCityPage({ params }: PageProps<"/[metier]/[ville]">) {
  const { metier, ville } = await params;
  const data = await load(metier, ville);
  if (!data) notFound();
  const { trade, commune, trades, communes } = data;

  const supabase = createPublicClient();
  const { data: rows } = await supabase.rpc("public_artisans_for_commune", {
    p_trade_code: trade.code,
    p_code_insee: commune.code_insee,
    p_limit: 12,
  });
  const artisans = (rows ?? []).map((r) => ({
    ...r,
    avatarUrl: r.avatar_path
      ? supabase.storage.from("avatars").getPublicUrl(r.avatar_path).data.publicUrl
      : null,
    specialties: Array.isArray(r.specialties)
      ? (r.specialties as { code: string; label: string }[])
      : [],
  }));
  const today = parisToday();
  const title = t.cityTitle(trade.label, commune.nom);
  const path = `/${trade.code}/${commune.slug}`;

  // Données structurées (schema.org) : service, artisans (sans adresse ni contact), fil d'Ariane.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: title,
        serviceType: trade.label,
        areaServed: { "@type": "City", name: commune.nom },
        provider: { "@type": "Organization", name: "MENAO", url: absoluteUrl("/") },
        url: absoluteUrl(path),
      },
      ...(artisans.length
        ? [
            {
              "@type": "ItemList",
              name: title,
              itemListElement: artisans.map((a, i) => ({
                "@type": "ListItem",
                position: i + 1,
                item: {
                  "@type": "LocalBusiness",
                  name: a.display_name,
                  areaServed: { "@type": "City", name: commune.nom },
                  ...(a.avatarUrl ? { image: a.avatarUrl } : {}),
                },
              })),
            },
          ]
        : []),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.breadcrumbHome, item: absoluteUrl("/") },
          {
            "@type": "ListItem",
            position: 2,
            name: trade.label,
            item: absoluteUrl(`/${trade.code}`),
          },
          { "@type": "ListItem", position: 3, name: commune.nom, item: absoluteUrl(path) },
        ],
      },
    ],
  };

  const visual = TRADE_VISUALS[trade.code] ?? DEFAULT_TRADE_VISUAL;
  const TradeIcon = visual.icon;
  const dayFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

  return (
    <main className="bg-background">
      <script
        type="application/ld+json"
        // JSON sérialisé côté serveur à partir de données contrôlées ; « < » échappé.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted-foreground">
          <ol className="flex flex-wrap gap-1.5">
            <li>
              <Link href="/" className="hover:text-foreground">
                {t.breadcrumbHome}
              </Link>{" "}
              ›
            </li>
            <li>
              <Link href={`/${trade.code}` as Route} className="hover:text-foreground">
                {trade.label}
              </Link>{" "}
              ›
            </li>
            <li aria-current="page" className="text-foreground">
              {commune.nom}
            </li>
          </ol>
        </nav>

        <div
          className={`relative overflow-hidden rounded-hero bg-gradient-to-br px-6 py-10 sm:px-10 sm:py-14 ${visual.gradient}`}
        >
          <TradeIcon
            aria-hidden="true"
            strokeWidth={1.1}
            className="absolute -right-8 -bottom-10 size-72 text-white/15"
          />
          <div className="relative flex max-w-2xl flex-col gap-4 text-white">
            <h1 className="text-[2.25rem] leading-tight font-medium tracking-tight sm:text-[3rem]">
              {title}
            </h1>
            <p className="text-white/90">{t.cityIntro(trade.label, commune.nom)}</p>
            <div className="flex flex-col items-start gap-2 pt-2">
              <ButtonLink
                href={`/recherche?metier=${trade.code}` as Route}
                variant="secondary"
                size="lg"
                className="border-white"
              >
                {t.cta}
                <ArrowRight aria-hidden="true" className="size-4" />
              </ButtonLink>
              <p className="text-xs text-white/80">{t.ctaHint}</p>
            </div>
          </div>
        </div>

        <section aria-label={title} className="flex flex-col gap-5">
          <p className="text-lg font-medium">
            {artisans.length ? t.found(artisans.length) : t.none(trade.label, commune.nom)}
          </p>
          {artisans.length > 0 && (
            <>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {artisans.map((a) => {
                  const avail = availability(
                    { paused: false, availableFrom: a.available_from },
                    today,
                  );
                  const specs = specialtiesPreview(a.specialties, []);
                  return (
                    <ArtisanResultCard
                      key={a.artisan_id}
                      artisanId={a.artisan_id}
                      name={a.display_name}
                      photoUrl={a.avatarUrl}
                      tradeLabel={trade.label}
                      experienceYears={a.experience_years}
                      zone={
                        a.zone_mode === "rayon" && a.zone_radius_km
                          ? fr.search.results.zoneRadius(a.zone_radius_km, a.zone_city)
                          : fr.search.results.zoneCommunes(a.zone_communes)
                      }
                      distanceKm={null}
                      availableFrom={
                        avail.kind === "from"
                          ? dayFormat.format(new Date(`${avail.date}T00:00:00Z`))
                          : null
                      }
                      specialties={specs.shown}
                      moreSpecialties={specs.more}
                      selection="none"
                      headingLevel={3}
                    />
                  );
                })}
              </ul>
              <p className="text-sm text-muted-foreground">{t.noContact}</p>
            </>
          )}
        </section>

        <div className="grid gap-8 sm:grid-cols-2">
          <nav aria-label={t.otherCities(trade.label)} className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">{t.otherCities(trade.label)}</h2>
            <ul className="flex flex-wrap gap-2">
              {communes
                .filter((c) => c.slug !== commune.slug)
                .map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/${trade.code}/${c.slug}` as Route}
                      className="text-primary hover:underline"
                    >
                      {c.nom}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
          <nav aria-label={t.otherTrades(commune.nom)} className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">{t.otherTrades(commune.nom)}</h2>
            <ul className="flex flex-wrap gap-2">
              {trades
                .filter((tr) => tr.code !== trade.code)
                .map((tr) => (
                  <li key={tr.code}>
                    <Link
                      href={`/${tr.code}/${commune.slug}` as Route}
                      className="text-primary hover:underline"
                    >
                      {tr.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        </div>
      </div>
    </main>
  );
}
