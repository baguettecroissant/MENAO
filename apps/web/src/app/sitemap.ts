import type { MetadataRoute } from "next";
import { seoCatalog } from "@/lib/site/catalog";
import { STATIC_PAGES, absoluteUrl } from "@/lib/site/seo";

export const revalidate = 86400;

/** Sitemap XML (F-02) : pages publiques, métiers et métiers × communes pilotes. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { trades, communes } = await seoCatalog();
  return [
    ...STATIC_PAGES.map((path) => ({ url: absoluteUrl(path) })),
    ...trades.map((t) => ({ url: absoluteUrl(`/${t.code}`) })),
    ...trades.flatMap((t) => communes.map((c) => ({ url: absoluteUrl(`/${t.code}/${c.slug}`) }))),
  ];
}
