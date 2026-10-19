import "server-only";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "./follow-up";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Filtres de la liste des parrainages (F-60, ADR 0143) : statut du parrainage. */
export const REFERRAL_FILTERS = ["tous", "en_attente", "recompense", "annule"] as const;
export type ReferralFilter = (typeof REFERRAL_FILTERS)[number];

export function parseReferralFilter(value: unknown): ReferralFilter {
  return typeof value === "string" && (REFERRAL_FILTERS as readonly string[]).includes(value)
    ? (value as ReferralFilter)
    : "tous";
}

const n = z.number().int().nonnegative();
const status = z.enum(["en_attente", "recompense", "annule"]);

const summarySchema = z.object({
  en_attente: n,
  recompense: n,
  annule: n,
  mois_poses: n,
  mois_en_attente: n,
});
export type ReferralSummary = z.infer<typeof summarySchema>;

const linkedArtisan = z.object({ id: z.string(), nom: z.string(), status, created_at: z.string() });
const artisanReferralSchema = z.object({
  code: z.string().nullable(),
  parrain: linkedArtisan.nullable(),
  filleuls: z.array(linkedArtisan),
  mois_poses: n,
  mois_en_attente: n,
});
export type ArtisanReferral = z.infer<typeof artisanReferralSchema>;

/**
 * Parrainages, les plus récents d'abord, 50 par page (ADR 0146) : parrain, filleul et mois offert
 * de chacun.
 */
export async function listReferrals(supabase: Client, filter: ReferralFilter, page: number) {
  const { data, count } = await supabase
    .rpc("admin_referrals", { p_filter: filter }, { count: "exact" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  return { rows: data ?? [], total: count ?? 0 };
}

export async function getReferralSummary(supabase: Client): Promise<ReferralSummary | null> {
  const { data } = await supabase.rpc("admin_referral_summary");
  const parsed = summarySchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Fiche d'un artisan : son code, son parrain, ses filleuls et ses mois offerts. */
export async function getArtisanReferral(
  supabase: Client,
  artisanId: string,
): Promise<ArtisanReferral | null> {
  const { data } = await supabase.rpc("admin_artisan_referral", { p_artisan_id: artisanId });
  const parsed = artisanReferralSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
