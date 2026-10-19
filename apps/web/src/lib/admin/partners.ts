import "server-only";
import type { Database } from "@menao/db";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;
export type PartnerRow = Database["public"]["Tables"]["partners"]["Row"];
export type PartnerCommission = Database["public"]["Tables"]["partner_commissions"]["Row"];
export type PartnerSettings = Database["public"]["Tables"]["partner_settings"]["Row"];

/** Liste du back-office avec les chiffres clés (F-59, ADR 0136). */
export async function listPartners(supabase: Client) {
  const { data } = await supabase.rpc("admin_partners");
  return data ?? [];
}

export async function getPartnerSettings(supabase: Client): Promise<PartnerSettings | null> {
  const { data } = await supabase.from("partner_settings").select("*").maybeSingle();
  return data;
}

/** Fiche d'un partenaire, ses attributions et ses commissions (les plus récentes d'abord). */
export async function getPartner(supabase: Client, id: string) {
  const [{ data: partner }, { data: commissions }, { count: projects }, { count: artisans }] =
    await Promise.all([
      supabase.from("partners").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("partner_commissions")
        .select("*")
        .eq("partner_id", id)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("partner_attributions")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", id)
        .not("project_id", "is", null),
      supabase
        .from("partner_attributions")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", id)
        .not("artisan_id", "is", null),
    ]);
  if (!partner) return null;
  return {
    partner,
    commissions: commissions ?? [],
    projects: projects ?? 0,
    artisans: artisans ?? 0,
  };
}

/** Commissions à exporter (CSV), avec le partenaire ; filtrées par statut et partenaire. */
export async function commissionsForExport(
  supabase: Client,
  { status, partnerId }: { status: PartnerCommission["status"] | null; partnerId: string | null },
) {
  let query = supabase
    .from("partner_commissions")
    .select("*, partners(nom, siret)")
    .order("created_at")
    .limit(5000);
  if (status) query = query.eq("status", status);
  if (partnerId) query = query.eq("partner_id", partnerId);
  const { data } = await query;
  return data ?? [];
}
