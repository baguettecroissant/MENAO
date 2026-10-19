import "server-only";
import type { Database } from "@menao/db";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "./follow-up";

type Client = Awaited<ReturnType<typeof createClient>>;
export type PartnerRow = Database["public"]["Tables"]["partners"]["Row"];
export type PartnerCommission = Database["public"]["Tables"]["partner_commissions"]["Row"];
export type PartnerSettings = Database["public"]["Tables"]["partner_settings"]["Row"];

const range = (page: number) => [(page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1] as const;

/** Liste du back-office avec les chiffres clés (F-59, ADR 0136), 50 par page (ADR 0146). */
export async function listPartners(supabase: Client, page: number) {
  const { data, count } = await supabase
    .rpc("admin_partners", undefined, { count: "exact" })
    .range(...range(page));
  return { rows: data ?? [], total: count ?? 0 };
}

export async function getPartnerSettings(supabase: Client): Promise<PartnerSettings | null> {
  const { data } = await supabase.from("partner_settings").select("*").maybeSingle();
  return data;
}

/**
 * Fiche d'un partenaire, ses attributions et ses commissions : une page de 50 (les plus récentes
 * d'abord, ADR 0146), et le statut et le montant de toutes pour les totaux et le virement.
 */
export async function getPartner(supabase: Client, id: string, page = 1) {
  const [
    { data: partner },
    { data: commissions, count: commissionCount },
    { data: allCommissions },
    { count: projects },
    { count: artisans },
  ] = await Promise.all([
    supabase.from("partners").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("partner_commissions")
      .select("*", { count: "exact" })
      .eq("partner_id", id)
      .order("created_at", { ascending: false })
      .order("id")
      .range(...range(page)),
    supabase
      .from("partner_commissions")
      .select("id, status, amount_cents")
      .eq("partner_id", id)
      .limit(10000),
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
    commissionCount: commissionCount ?? 0,
    allCommissions: allCommissions ?? [],
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

const count = z.number().int().nonnegative();
const funnelSchema = z.object({
  demandes: count,
  envoyees: count,
  acceptees: count,
  contact: count,
  signees: count,
  a_verifier: count,
});
export type PartnerFunnelData = z.infer<typeof funnelSchema>;

/** Entonnoir du partenaire et primes à vérifier (ADR 0145). */
export async function getPartnerFunnel(
  supabase: Client,
  id: string,
): Promise<PartnerFunnelData | null> {
  const { data } = await supabase.rpc("admin_partner_funnel", { p_partner_id: id });
  const parsed = funnelSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Primes « à vérifier » de tous les partenaires : bandeau de la liste. */
export async function commissionsToReview(supabase: Client): Promise<number> {
  const { count: total } = await supabase
    .from("partner_commissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "en_attente")
    .not("review_reason", "is", null);
  return total ?? 0;
}
