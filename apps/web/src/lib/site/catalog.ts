import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Métiers actifs, types de travaux et communes pilotes (pages SEO F-02, pied de page), lus sans session et mis en
 * cache une heure : aucune requête à la base par visite (spec §4.4).
 */
export const seoCatalog = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    const [trades, communes, workTypes] = await Promise.all([
      supabase.from("trades").select("code, label").eq("active", true).order("sort_order"),
      supabase
        .from("communes")
        .select("code_insee, slug, nom, departement")
        .eq("pilote", true)
        .order("ordre"),
      supabase
        .from("work_types")
        .select("code, label, trade_code")
        .eq("active", true)
        .order("sort_order"),
    ]);
    return {
      trades: trades.data ?? [],
      communes: communes.data ?? [],
      workTypes: workTypes.data ?? [],
    };
  },
  ["seo-catalog"],
  { revalidate: 3600 },
);

/**
 * Artisans visibles d'un métier dans une commune (page métier × ville, F-02), mis en cache une
 * heure : partagés entre la page, ses métadonnées et le sitemap. Une page sans artisan n'est pas
 * indexée (ADR 0134).
 */
export const cityArtisans = unstable_cache(
  async (tradeCode: string, codeInsee: string) => {
    const supabase = createPublicClient();
    const { data } = await supabase.rpc("public_artisans_for_commune", {
      p_trade_code: tradeCode,
      p_code_insee: codeInsee,
      p_limit: 12,
    });
    return data ?? [];
  },
  ["city-artisans"],
  { revalidate: 3600 },
);
