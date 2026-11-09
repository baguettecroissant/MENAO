import { availability, parisToday, specialtiesPreview } from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, MapPin, MapPinned } from "lucide-react";
import { ArtisanResultCard } from "@/components/project/artisan-result-card";
import { CtaBand } from "@/components/site/cta-band";
import { FaqList } from "@/components/site/faq-list";
import { SectionHeading } from "@/components/site/section-heading";
import { Steps } from "@/components/site/steps";
import { TradeHero } from "@/components/site/trade-hero";
import { ZoneMap } from "@/components/site/zone-section";
import { ButtonLink, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { artisanPages } from "@/lib/site/artisans";
import { cityArtisans, seoCatalog } from "@/lib/site/catalog";
import { nearestCommunes } from "@/lib/site/commune-coords";
import { absoluteUrl, CITY_INDEX_MIN_ARTISANS } from "@/lib/site/seo";
import { ORGANIZATION_ID } from "@/lib/site/structured-data";
import { createPublicClient } from "@/lib/supabase/public";
import { shareImage } from "@/lib/site/images";
import { SiteAssistantBubble } from "@/components/site/site-assistant-bubble";

const t = fr.seo;

// Pré-générées au build pour les métiers × communes pilotes, régénérées toutes les heures.
export const revalidate = 3600;
// Seules les pages générées au build existent : une adresse inconnue répond 404 tout de suite,
// sans fonction ni requête à la base (robots, coût d'hébergement, spec §4.4).
export const dynamicParams = false;

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

/** Nombre d'artisans visibles par commune ou par métier (requêtes en cache, ADR 0268). */
async function counts(pairs: readonly { trade: string; codeInsee: string }[]) {
  return Promise.all(pairs.map(async (p) => (await cityArtisans(p.trade, p.codeInsee)).length));
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
  // Garde-fou (ADR 0134) : sans artisan, la page reste utile au visiteur mais n'est pas indexée
  // (contenu trop proche des autres communes) ; ses liens restent suivis.
  const artisans = await cityArtisans(data.trade.code, data.commune.code_insee);
  return {
    title,
    description,
    alternates: { canonical: path },
    ...(artisans.length < CITY_INDEX_MIN_ARTISANS
      ? { robots: { index: false, follow: true } }
      : {}),
    openGraph: {
      title,
      description,
      url: path,
      type: "website",
      locale: "fr_FR",
      siteName: "MENAO",
      // Image du métier (le partage des pages d'un métier montre ce métier).
      images: [shareImage(data.trade.code)],
    },
    twitter: { card: "summary_large_image", images: [shareImage(data.trade.code).url] },
  };
}

/** Page SEO métier × ville (F-02) : artisans vérifiés de la commune, sans coordonnées. */
export default async function TradeCityPage({ params }: PageProps<"/[metier]/[ville]">) {
  const { metier, ville } = await params;
  const data = await load(metier, ville);
  if (!data) notFound();
  const { trade, commune, trades, communes } = data;
  const { workTypes } = await seoCatalog();
  const works = workTypes.filter((w) => w.trade_code === trade.code);
  // Communes voisines et autres métiers, avec le vrai nombre d'artisans (ADR 0268).
  const neighbours = nearestCommunes(commune.code_insee, communes, 6);
  const otherTrades = trades.filter((tr) => tr.code !== trade.code);
  const [neighbourCounts, tradeCounts] = await Promise.all([
    counts(neighbours.map((c) => ({ trade: trade.code, codeInsee: c.code_insee }))),
    counts(otherTrades.map((tr) => ({ trade: tr.code, codeInsee: commune.code_insee }))),
  ]);
  const tradesWithArtisans = otherTrades.filter((_, i) => (tradeCounts[i] ?? 0) > 0);

  const supabase = createPublicClient();
  const [rows, pages] = await Promise.all([
    cityArtisans(trade.code, commune.code_insee),
    artisanPages(),
  ]);
  // Fiche publique de chaque artisan (ADR 0144) : lien de la carte et des données structurées.
  const slugs = new Map(pages.map((p) => [p.artisan_id, p.slug]));
  const artisans = rows.map((r) => ({
    ...r,
    pagePath: slugs.has(r.artisan_id) ? `/artisans/${slugs.get(r.artisan_id)}` : null,
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
        provider: {
          "@type": "Organization",
          "@id": ORGANIZATION_ID,
          name: "MENAO",
          url: absoluteUrl("/"),
        },
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
                  ...(a.pagePath ? { url: absoluteUrl(a.pagePath) } : {}),
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
        chips={t.cityChips(artisans.length)}
      />

      <section aria-labelledby="city-artisans" className="py-16 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6">
          <div className="flex flex-col gap-2">
            <h2
              id="city-artisans"
              className="text-[1.75rem] leading-tight font-bold tracking-tight"
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
                      href={a.pagePath}
                      verified={a.verified}
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
                      requestHref={`/recherche?${new URLSearchParams({
                        metier: trade.code,
                        fiche: a.artisan_id,
                        nom: a.display_name,
                      }).toString()}`}
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

      {/* Travaux du métier et contrôles (ADR 0268) */}
      <section aria-labelledby="city-works" className="pb-16 sm:pb-20">
        <div className="mx-auto grid max-w-6xl items-start gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-10">
          <div className="flex flex-col gap-4">
            <SectionHeading
              id="city-works"
              eyebrow={fr.pro.tradeLanding.worksEyebrow}
              title={t.worksCityTitle(
                fr.tradeDomains[trade.code]?.label ?? trade.label,
                commune.nom,
              )}
              subtitle={t.workSubtitle}
              align="left"
            />
            {works.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {works.map((work) => (
                  <li
                    key={work.code}
                    className="inline-flex min-h-10 items-center gap-2 rounded-pill border border-border bg-surface px-4 text-[0.9375rem] font-semibold"
                  >
                    <Check
                      aria-hidden="true"
                      className="size-4 shrink-0 text-success"
                      strokeWidth={2.6}
                    />
                    {work.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-3 rounded-[1.375rem] border border-border bg-surface p-6">
            <p className="text-[0.8125rem] font-bold tracking-[0.08em] text-success uppercase">
              {fr.home.controlsTitle.replace(/ :$/, "")}
            </p>
            <ul className="flex flex-col gap-2">
              {fr.pages.guarantees.checks.map((check) => (
                <li
                  key={check.title}
                  className="flex items-center gap-2.5 text-[0.9375rem] font-semibold"
                >
                  <Check
                    aria-hidden="true"
                    className="size-4 shrink-0 text-success"
                    strokeWidth={2.8}
                  />
                  {check.title}
                </li>
              ))}
            </ul>
            <TextLink href="/garanties#guarantees-checks" className="self-start text-sm">
              {t.controlsLink}
            </TextLink>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="city-steps"
        className="border-y border-border bg-surface py-14 sm:py-16"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
          <SectionHeading
            id="city-steps"
            eyebrow={steps.eyebrow}
            title={steps.title}
            subtitle={steps.subtitle}
          />
          <Steps items={steps.items} />
        </div>
      </section>

      {/* Autour de la ville : carte et vrais compteurs des communes voisines (ADR 0268) */}
      <section aria-labelledby="city-nearby" className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_32rem] lg:gap-10">
          <div className="flex flex-col gap-5">
            <SectionHeading
              id="city-nearby"
              eyebrow={t.nearbyEyebrow(commune.nom)}
              title={t.nearbyTitle(trade.label, commune.nom)}
              subtitle={t.nearbySubtitle}
              align="left"
            />
            <nav aria-label={t.otherCities(trade.label)}>
              <ul className="overflow-hidden rounded-[1.25rem] border border-border bg-surface">
                {neighbours.map((c, i) => {
                  const n = neighbourCounts[i] ?? 0;
                  return (
                    <li key={c.slug} className="border-t border-border first:border-t-0">
                      <Link
                        href={`/${trade.code}/${c.slug}` as Route}
                        className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none focus-visible:ring-inset sm:px-5"
                      >
                        <span className="flex items-center gap-2.5 font-semibold">
                          <MapPin
                            aria-hidden="true"
                            className="size-4 shrink-0 text-muted-foreground"
                          />
                          {t.cityTitle(trade.label, c.nom)}
                        </span>
                        <span
                          className={`text-sm font-semibold ${n > 0 ? "text-success" : "text-muted-foreground"}`}
                        >
                          {n > 0 ? t.nearbyCount(n) : t.nearbySoon}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
          <div className="overflow-hidden rounded-[1.375rem] border border-border">
            <ZoneMap communes={communes} highlight={commune.slug} />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="city-faq"
        className="border-t border-border bg-surface py-16 sm:py-20"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 sm:px-6">
          <SectionHeading id="city-faq" eyebrow={fr.home.faqEyebrow} title={t.faqTitle} />
          <FaqList
            items={[
              t.localFaq(trade.label, commune.nom, artisans.length),
              ...t.tradeFaq(trade.label),
            ]}
          />
        </div>
      </section>

      {tradesWithArtisans.length > 0 && (
        <nav aria-labelledby="city-other-trades" className="px-4 py-14 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-4">
            <h2 id="city-other-trades" className="text-2xl font-bold tracking-tight">
              {t.otherTrades(commune.nom)}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {tradesWithArtisans.map((tr) => (
                <li key={tr.code}>
                  <Link
                    href={`/${tr.code}/${commune.slug}` as Route}
                    className="inline-flex min-h-10 items-center rounded-pill border border-border bg-surface px-4 text-sm font-semibold hover:border-border-strong"
                  >
                    {t.cityTitle(tr.label, commune.nom)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}

      <CtaBand
        id="city-cta"
        title={fr.site.cta.title}
        text={fr.site.cta.text}
        action={{ href: searchHref, label: fr.site.cta.action }}
        reassurance={fr.site.cta.reassurance}
      />
      <SiteAssistantBubble />
    </main>
  );
}
