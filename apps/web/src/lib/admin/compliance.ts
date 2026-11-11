import "server-only";
import {
  MONITORED_DOCUMENT_TYPES,
  expiryWatchLimit,
  parisToday,
  spotCheckPeriod,
} from "@menao/core";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Chiffres de la rubrique « Conformité » (ADR 0283) : renouvellements déposés par des artisans
 * validés ou suspendus, documents et certifications qui arrivent à échéance sous 30 jours (dont
 * déjà expirés), contrôles aléatoires du mois tirés et restants.
 */
export async function getComplianceCounts(supabase: Client) {
  const limit = expiryWatchLimit();
  const today = parisToday();
  const period = spotCheckPeriod(today);
  const [renewals, docs, certs, expiredDocs, expiredCerts, checks, checksLeft] = await Promise.all([
    supabase
      .from("artisan_documents")
      .select("id, artisans!inner(status)", { count: "exact", head: true })
      .eq("status", "en_attente")
      .in("artisans.status", ["valide", "suspendu"]),
    supabase
      .from("artisan_documents")
      .select("id", { count: "exact", head: true })
      .eq("status", "valide")
      .in("type", [...MONITORED_DOCUMENT_TYPES])
      .lte("date_fin", limit),
    supabase
      .from("certifications")
      .select("id", { count: "exact", head: true })
      .lte("date_fin", limit),
    supabase
      .from("artisan_documents")
      .select("id", { count: "exact", head: true })
      .eq("status", "valide")
      .in("type", [...MONITORED_DOCUMENT_TYPES])
      .lt("date_fin", today),
    supabase
      .from("certifications")
      .select("id", { count: "exact", head: true })
      .lt("date_fin", today),
    supabase
      .from("artisan_spot_checks")
      .select("id", { count: "exact", head: true })
      .eq("period", period),
    supabase
      .from("artisan_spot_checks")
      .select("id", { count: "exact", head: true })
      .eq("period", period)
      .is("result", null),
  ]);
  return {
    renewals: renewals.count ?? 0,
    expiring: (docs.count ?? 0) + (certs.count ?? 0),
    expired: (expiredDocs.count ?? 0) + (expiredCerts.count ?? 0),
    spotChecks: checks.count ?? 0,
    spotChecksLeft: checksLeft.count ?? 0,
  };
}
