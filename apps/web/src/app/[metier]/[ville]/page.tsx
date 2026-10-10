import { parisToday } from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicArtisanCard, type PublicArtisan } from "@/components/project/public-artisan-card";
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
  const artisans: PublicArtisan[] = (rows ?? []).map((r) => ({
    ...r,
    avatarUrl: r.avatar_path
      ? supabase.storage.from("avatars").getPublicUrl(r.avatar_path).data.publicUrl
      : null,
    specialties: Array.isArray(r.specialties)
      ? (r.specialties as PublicArtisan["specialties"])
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

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <script
        type="application/ld+json"
        // JSON sérialisé côté serveur à partir de données contrôlées ; « < » échappé.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <nav aria-label="Fil d'Ariane" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap gap-1">
          <li>
            <Link href="/" className="text-primary hover:underline">
              {t.breadcrumbHome}
            </Link>{" "}
            ›
          </li>
          <li>
            <Link href={`/${trade.code}` as Route} className="text-primary hover:underline">
              {trade.label}
            </Link>{" "}
            ›
          </li>
          <li aria-current="page">{commune.nom}</li>
        </ol>
      </nav>

      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="text-lg text-muted-foreground">{t.cityIntro(trade.label, commune.nom)}</p>
      </div>

      <div className="flex flex-col items-start gap-2 rounded-card bg-primary-soft p-5">
        <Link
          href="/"
          className="inline-flex min-h-touch items-center justify-center rounded-button bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          {t.cta}
        </Link>
        <p className="text-sm">{t.ctaHint}</p>
      </div>

      <section aria-label={title} className="flex flex-col gap-4">
        <p className="font-medium">
          {artisans.length ? t.found(artisans.length) : t.none(trade.label, commune.nom)}
        </p>
        {artisans.length > 0 && (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {artisans.map((a) => (
                <li key={a.artisan_id}>
                  <PublicArtisanCard artisan={a} tradeLabel={trade.label} today={today} />
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">{t.noContact}</p>
          </>
        )}
      </section>

      <div className="grid gap-8 sm:grid-cols-2">
        <nav aria-label={t.otherCities(trade.label)} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t.otherCities(trade.label)}</h2>
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
          <h2 className="text-lg font-semibold">{t.otherTrades(commune.nom)}</h2>
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
    </main>
  );
}
