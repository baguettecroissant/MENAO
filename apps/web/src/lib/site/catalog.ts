import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Métiers actifs et communes pilotes (pages SEO F-02, pied de page), lus sans session et mis en
 * cache une heure : aucune requête à la base par visite (spec §4.4).
 */
export const seoCatalog = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    const [trades, communes] = await Promise.all([
      supabase.from("trades").select("code, label").eq("active", true).order("sort_order"),
      supabase
        .from("communes")
        .select("code_insee, slug, nom, departement")
        .eq("pilote", true)
        .order("ordre"),
    ]);
    return { trades: trades.data ?? [], communes: communes.data ?? [] };
  },
  ["seo-catalog"],
  { revalidate: 3600 },
);
