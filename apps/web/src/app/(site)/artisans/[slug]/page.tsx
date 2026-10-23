import { seoDescription } from "@menao/core";
import { ChevronRight } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ProfileBody,
  ProfileHeader,
  formatProfileDay,
  profileTrade,
} from "@/components/artisan-profile/profile-view";
import type { PublicReview } from "@/components/review/review-list";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "@/lib/site/catalog";
import { getArtisanPage, getArtisanPageReviews } from "@/lib/site/artisans";
import { shareImage } from "@/lib/site/images";
import { absoluteUrl } from "@/lib/site/seo";
import { createPublicClient } from "@/lib/supabase/public";

const t = fr.seo.artisan;
const publishedFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "Europe/Paris",
});

// Générée à la première visite puis gardée en cache une heure (spec §4.4) ; le choix de l'artisan
// pour Google vide le cache de sa fiche aussitôt.
export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

/** Commune affichée : commune de base, sinon la seule commune de la zone. */
function mainCity(zone: { city: string | null; communes: string[] }) {
  return zone.city ?? (zone.communes.length === 1 ? (zone.communes[0] ?? null) : null);
}

export async function generateMetadata({
  params,
}: PageProps<"/artisans/[slug]">): Promise<Metadata> {
  const page = await getArtisanPage((await params).slug);
  if (!page) return {};
  const { profile } = page;
  const { name } = page;
  const trade = profileTrade(profile);
  const city = mainCity(profile.zone);
  const title = t.metaTitle(name, trade, city);
  const description = seoDescription(
    profile.presentation ? `${t.descriptionLead(name, trade, city)} ${profile.presentation}` : null,
    t.descriptionFallback(name),
  );
  const path = `/artisans/${page.slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    // Choix de l'artisan (ADR 0144) : fiche retirée de Google, liens toujours suivis.
    ...(page.indexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title,
      description,
      url: path,
      type: "profile",
      images: [shareImage(profile.trades[0]?.code)],
    },
  };
}

/**
 * Fiche publique d'un artisan (SEO phase D, F-61, ADR 0144) : la fiche de la recherche, à une
 * adresse stable, avec ses données structurées. Jamais de téléphone, d'e-mail ni d'adresse.
 */
export default async function ArtisanPublicPage({ params }: PageProps<"/artisans/[slug]">) {
  const page = await getArtisanPage((await params).slug);
  if (!page) notFound();
  const { profile } = page;
  const [reviewRows, { communes }] = await Promise.all([
    getArtisanPageReviews(profile.id),
    seoCatalog(),
  ]);
  const supabase = createPublicClient();
  const url = (bucket: "avatars" | "portfolio", path: string) =>
    supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const avatar = profile.avatar_path ? url("avatars", profile.avatar_path) : null;
  const photos = profile.photos.map((p) => url("portfolio", p));
  const reviews: PublicReview[] = reviewRows.map((row) => ({
    id: row.review_id,
    author: row.author_name,
    publishedOn: publishedFormat.format(new Date(row.created_at)),
    receivedOn: formatProfileDay(row.experience_on),
    score: row.score,
    comment: row.comment,
    reply: row.reply,
  }));
  const { name } = page;
  const trade = profile.trades[0] ?? null;
  const tradeLabel = profileTrade(profile);
  const title = fr.search.profile.title(name, tradeLabel);
  const path = `/artisans/${page.slug}`;
  const zoneNames = new Set([profile.zone.city, ...profile.zone.communes].filter(Boolean));
  // Maillage : pages métier × commune pilote de sa zone (les autres n'existent pas).
  const nearby = trade ? communes.filter((c) => zoneNames.has(c.nom)).slice(0, 8) : [];
  // Recherche lancée depuis la fiche (ADR 0173) : l'artisan est proposé en premier, présélectionné.
  const searchHref = `/recherche?${new URLSearchParams({
    ...(trade ? { metier: trade.code } : {}),
    fiche: profile.id,
    nom: profile.display_name,
  })}`;

  // Données structurées (schema.org) : entreprise du bâtiment, sans adresse ni contact.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "HomeAndConstructionBusiness",
        "@id": absoluteUrl(`${path}#entreprise`),
        name,
        url: absoluteUrl(path),
        ...(avatar ? { image: avatar } : {}),
        ...(profile.presentation ? { description: profile.presentation } : {}),
        ...(zoneNames.size > 0
          ? { areaServed: [...zoneNames].map((city) => ({ "@type": "City", name: city })) }
          : {}),
        ...(profile.trades.length > 0
          ? {
              knowsAbout: [
                ...profile.trades.map((tr) => tr.label),
                ...profile.work_types.map((w) => w.label),
              ],
            }
          : {}),
        // Avis vérifiés recueillis par MENAO (plateforme tierce), score sur 100.
        ...(profile.score && profile.score.review_count > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: profile.score.global,
                bestRating: 100,
                worstRating: 0,
                reviewCount: profile.score.review_count,
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: fr.seo.breadcrumbHome,
            item: absoluteUrl("/"),
          },
          ...(trade
            ? [
                {
                  "@type": "ListItem",
                  position: 2,
                  name: trade.label,
                  item: absoluteUrl(`/${trade.code}`),
                },
              ]
            : []),
          { "@type": "ListItem", position: trade ? 3 : 2, name, item: absoluteUrl(path) },
        ],
      },
    ],
  };

  return (
    <main className="bg-background">
      <script
        type="application/ld+json"
        // JSON sérialisé côté serveur à partir de données contrôlées ; « < » échappé.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
          <nav
            aria-label={fr.search.profile.breadcrumb.label}
            className="text-xs text-muted-foreground"
          >
            <ol className="flex flex-wrap items-center gap-1.5">
              <li className="inline-flex items-center gap-1.5">
                <Link href="/" className="hover:text-foreground">
                  {fr.seo.breadcrumbHome}
                </Link>
                <ChevronRight aria-hidden="true" className="size-3.5" />
              </li>
              {trade && (
                <li className="inline-flex items-center gap-1.5">
                  <Link href={`/${trade.code}` as Route} className="hover:text-foreground">
                    {trade.label}
                  </Link>
                  <ChevronRight aria-hidden="true" className="size-3.5" />
                </li>
              )}
              <li aria-current="page" className="text-foreground">
                {name}
              </li>
            </ol>
          </nav>
          <ProfileHeader
            profile={profile}
            avatar={avatar}
            title={title}
            actions={
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <ButtonLink
                  href={searchHref as Route}
                  size="lg"
                  className="shrink-0 whitespace-nowrap sm:w-auto"
                >
                  {fr.seo.cta}
                </ButtonLink>
                <p className="rounded-input bg-primary-softer px-3 py-2 text-xs text-primary-strong">
                  {t.requestHint(profile.display_name)}
                </p>
              </div>
            }
          />
        </div>
      </div>
      <ProfileBody profile={profile} photos={photos} reviews={reviews} canReport={false} />
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-16 sm:px-6">
        <p className="text-sm text-muted-foreground">{fr.seo.noContact}</p>
        {trade && (
          <nav aria-label={t.nearbyTitle(trade.label)} className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">{t.nearbyTitle(trade.label)}</h2>
            <ul className="flex flex-wrap gap-2">
              {nearby.map((c) => (
                <li key={c.code_insee}>
                  <Link
                    href={`/${trade.code}/${c.slug}` as Route}
                    className="inline-flex min-h-touch items-center rounded-chip border border-border bg-surface px-4 text-sm hover:border-primary/40"
                  >
                    {t.nearbyCity(trade.label, c.nom)}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={`/${trade.code}` as Route}
                  className="inline-flex min-h-touch items-center rounded-chip border border-border bg-surface px-4 text-sm hover:border-primary/40"
                >
                  {t.allTrade(trade.label)}
                </Link>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </main>
  );
}
