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
