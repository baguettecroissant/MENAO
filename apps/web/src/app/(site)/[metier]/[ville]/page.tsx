import { availability, parisToday, specialtiesPreview } from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPinned } from "lucide-react";
import { ArtisanResultCard } from "@/components/project/artisan-result-card";
import { CtaBand } from "@/components/site/cta-band";
import { GuaranteeSection } from "@/components/site/guarantees";
import { SectionHeading } from "@/components/site/section-heading";
import { Steps } from "@/components/site/steps";
import { TradeHero } from "@/components/site/trade-hero";
import { ButtonLink } from "@/components/ui";
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

  const dayFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

  const searchHref = `/recherche?metier=${trade.code}`;
  const steps = fr.site.clientSteps;

  return (
    <main className="bg-background">
      <script
        type="application/ld+json"
        // JSON sérialisé côté serveur à partir de données contrôlées ; « < » échappé.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <TradeHero
        id="city-title"
        code={trade.code}
        eyebrow={`${commune.nom} · ${fr.seo.tradeEyebrow}`}
        title={title}
        intro={t.cityIntro(trade.label, commune.nom)}
        breadcrumbs={[
          { label: t.breadcrumbHome, href: "/" },
          { label: trade.label, href: `/${trade.code}` },
          { label: commune.nom },
        ]}
        cta={{ href: searchHref, label: t.cta }}
        hint={t.ctaHint}
      />

      <section aria-labelledby="city-artisans" className="py-16 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6">
          <div className="flex flex-col gap-2">
            <h2
              id="city-artisans"
              className="text-[1.75rem] leading-tight font-medium tracking-tight"
            >
              {t.artisansTitle(trade.label, commune.nom)}
            </h2>
            {artisans.length > 0 && (
              <p className="text-muted-foreground">{t.found(artisans.length)}</p>
            )}
          </div>
          {artisans.length > 0 ? (
            <>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-hero border border-dashed border-border-strong bg-surface px-6 py-12 text-center sm:px-12">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <MapPinned aria-hidden="true" className="size-7" strokeWidth={1.75} />
              </span>
              <h3 className="text-xl font-medium">{t.noneTitle(trade.label, commune.nom)}</h3>
              <p className="max-w-xl text-sm leading-relaxed text-pretty text-muted-foreground">
                {t.none(trade.label, commune.nom)}
              </p>
              <ButtonLink href={searchHref as Route} size="lg">
                {t.cta}
                <ArrowRight aria-hidden="true" className="size-4" />
              </ButtonLink>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="city-steps" className="bg-surface py-16 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
          <SectionHeading
            id="city-steps"
            eyebrow={steps.eyebrow}
            title={steps.title}
            subtitle={steps.subtitle}
          />
          <Steps items={steps.items} />
        </div>
      </section>

      <GuaranteeSection id="city-guarantees" tone="light" />

      <div className="pb-16 sm:pb-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:px-6 md:grid-cols-2">
          <nav
            aria-labelledby="city-other-cities"
            className="flex flex-col gap-4 rounded-hero border border-border bg-surface p-6 sm:p-8"
          >
            <h2 id="city-other-cities" className="text-lg font-medium">
              {t.otherCities(trade.label)}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {communes
                .filter((c) => c.slug !== commune.slug)
                .map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/${trade.code}/${c.slug}` as Route}
                      className="inline-flex min-h-9 items-center rounded-pill border border-border bg-background px-3.5 text-sm hover:border-primary hover:text-primary-strong"
                    >
                      {c.nom}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
          <nav
            aria-labelledby="city-other-trades"
            className="flex flex-col gap-4 rounded-hero border border-border bg-surface p-6 sm:p-8"
          >
            <h2 id="city-other-trades" className="text-lg font-medium">
              {t.otherTrades(commune.nom)}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {trades
                .filter((tr) => tr.code !== trade.code)
                .map((tr) => (
                  <li key={tr.code}>
                    <Link
                      href={`/${tr.code}/${commune.slug}` as Route}
                      className="inline-flex min-h-9 items-center rounded-pill border border-border bg-background px-3.5 text-sm hover:border-primary hover:text-primary-strong"
                    >
                      {tr.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        </div>
      </div>

      <CtaBand
        id="city-cta"
        title={fr.site.cta.title}
        text={fr.site.cta.text}
        action={{ href: searchHref, label: fr.site.cta.action }}
        reassurance={fr.site.cta.reassurance}
      />
    </main>
  );
}
