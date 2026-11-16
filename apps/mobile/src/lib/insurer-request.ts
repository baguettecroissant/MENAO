import type { InsurerRequestInput } from "@menao/core";
import { supabase } from "./supabase";
import { myArtisanKey } from "./team";

/**
 * Ce que le message pour l'assureur reprend (ADR 0348) : nom de l'entreprise, SIRET, métiers et
 * nom du dirigeant, comme la page du site.
 */
export async function loadInsurerContext(): Promise<Omit<InsurerRequestInput, "documents"> | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: artisan } = await supabase
    .from("artisans")
    .select("id, raison_sociale, nom_commercial, siret")
    .eq("id", await myArtisanKey())
    .maybeSingle();
  if (!artisan) return null;
  const [trades, profile] = await Promise.all([
    supabase.from("artisan_trades").select("trade_code").eq("artisan_id", artisan.id),
    supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
  ]);
  const codes = (trades.data ?? []).map((row) => row.trade_code);
  const { data: labels } = codes.length
    ? await supabase.from("trades").select("label").in("code", codes).order("sort_order")
    : { data: [] };
  return {
    companyName: artisan.nom_commercial || artisan.raison_sociale || "",
    siret: artisan.siret,
    tradeLabels: (labels ?? []).map((row) => row.label),
    signature:
      [profile.data?.first_name, profile.data?.last_name].filter(Boolean).join(" ").trim() || null,
  };
}
