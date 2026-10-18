import type { MetadataRoute } from "next";
import { cityArtisans, seoCatalog } from "@/lib/site/catalog";
import { STATIC_PAGES, absoluteUrl } from "@/lib/site/seo";

export const revalidate = 86400;

/**
 * Sitemap XML (F-02, ADR 0134) : pages publiques, métiers (côté particuliers et Espace Pro), et
 * pages métier × commune pilote qui présentent au moins un artisan (les autres ne sont pas indexées).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { trades, communes } = await seoCatalog();
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
    ...covered
      .filter((p): p is { t: (typeof trades)[number]; c: (typeof communes)[number] } => p !== null)
      .map(({ t, c }) => ({ url: absoluteUrl(`/${t.code}/${c.slug}`) })),
  ];
}
