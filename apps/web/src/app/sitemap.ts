import type { MetadataRoute } from "next";
import { artisanPages } from "@/lib/site/artisans";
import { cityArtisans, seoCatalog } from "@/lib/site/catalog";
import { publishedGuides } from "@/lib/site/guides";
import { STATIC_PAGES, absoluteUrl } from "@/lib/site/seo";

export const revalidate = 86400;

/**
 * Sitemap XML (F-02, ADR 0134) : pages publiques, métiers (côté particuliers et Espace Pro), et
 * pages métier × commune pilote qui présentent au moins un artisan (les autres ne sont pas indexées),
 * et fiches des artisans visibles qui n'ont pas demandé leur retrait de Google (ADR 0144).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ trades, communes }, artisans] = await Promise.all([seoCatalog(), artisanPages()]);
  const guides = publishedGuides();
  const pairs = trades.flatMap((t) => communes.map((c) => ({ t, c })));
  const covered = await Promise.all(
    pairs.map(async ({ t, c }) =>
      (await cityArtisans(t.code, c.code_insee)).length > 0 ? { t, c } : null,
    ),
  );
  return [
    ...STATIC_PAGES.map((path) => ({ url: absoluteUrl(path) })),
    ...trades.map((t) => ({ url: absoluteUrl(`/${t.code}`) })),
    ...trades.map((t) => ({ url: absoluteUrl(`/pro/${t.code}`) })),
    // Guides publiés seulement (ADR 0135) : jamais les brouillons.
    ...(guides.length > 0 ? [{ url: absoluteUrl("/guides") }] : []),
    ...guides.map((g) => ({ url: absoluteUrl(`/guides/${g.slug}`), lastModified: g.updatedAt })),
    ...covered
      .filter((p): p is { t: (typeof trades)[number]; c: (typeof communes)[number] } => p !== null)
      .map(({ t, c }) => ({ url: absoluteUrl(`/${t.code}/${c.slug}`) })),
    ...artisans
      .filter((a) => a.indexable)
      .map((a) => ({ url: absoluteUrl(`/artisans/${a.slug}`), lastModified: a.updated_at })),
  ];
}
