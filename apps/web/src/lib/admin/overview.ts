import "server-only";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

const n = z.number().int().nonnegative();

/** Chiffres clés de admin_overview (F-58, ADR 0045). */
const overviewSchema = z.object({
  artisans: z.object({
    en_verification: n,
    plus_ancien_dossier: z.string().nullable(),
    valides: n,
    visibles: n,
    suspendus: n,
    inscrits_30j: n,
  }),
  abonnements: z.object({
    actifs: n,
    essais: n,
    impayes: n,
    resilies_30j: n,
    // Revenu et désabonnement (ADR 0051) : facultatifs tant que la migration n'est pas déployée.
    payants: n.default(0),
    mrr_cents: n.default(0),
    en_cours_30j: n.default(0),
    perdus_30j: n.default(0),
  }),
  recherches: z.object({ aujourdhui: n, j30: n, envoyees_30j: n, non_envoyees_7j: n }),
  demandes: z.object({
    aujourdhui: n,
    j7: n,
    j30: n,
    en_attente: n,
    expirent_12h: n,
    acceptees_30j: n,
    refusees_30j: n,
    expirees_30j: n,
  }),
  devis: z.object({ envoyes_30j: n, signes_30j: n, signes_30j_cents: n }),
  chantiers: z.record(z.string(), n),
  paiements: z.object({ payes_30j: n, payes_30j_cents: n, echoues_7j: n }),
  avis: z.object({ publies_30j: n, note_moyenne: z.number().nullable() }),
  tickets: z.object({
    ouverts: n,
    en_retard: n,
    litiges: n,
    // Demandes de suppression (ADR 0048) : facultatif tant que la migration n'est pas déployée.
    suppressions: n.default(0),
    suppression_echeance: z.string().nullable().default(null),
  }),
  documents: z.object({ renouvellements: n, assurances_7j: n }),
  // Notifications Stripe ou DocuSeal en échec (ADR 0051).
  notifications: z.object({ echecs: n }).default({ echecs: 0 }),
});
export type Overview = z.infer<typeof overviewSchema>;

export type ActivityItem = { occurredAt: string; kind: string; details: Record<string, unknown> };

/** Éléments nommés du bloc « À traiter maintenant », en plus des compteurs. */
export type Todo = {
  dossiers: { id: string; name: string }[];
  expiringRequests: {
    id: string;
    projectId: string;
    artisanId: string;
    artisan: string;
    expiresAt: string;
  }[];
};

export async function getOverview(supabase: Client): Promise<Overview | null> {
  const { data, error } = await supabase.rpc("admin_overview");
  if (error) return null;
  const parsed = overviewSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function getActivity(supabase: Client, limit = 40): Promise<ActivityItem[]> {
  const { data } = await supabase.rpc("admin_activity", { p_limit: limit });
  return (data ?? []).map((row) => ({
    occurredAt: row.occurred_at,
    kind: row.kind,
    details:
      row.details && typeof row.details === "object" && !Array.isArray(row.details)
        ? (row.details as Record<string, unknown>)
        : {},
  }));
}

export async function getTodo(supabase: Client): Promise<Todo> {
  const [dossiers, expiring] = await Promise.all([
    supabase
      .from("artisans")
      .select("id, raison_sociale, nom_commercial, siret")
      .eq("status", "en_verification")
      .order("submitted_at", { ascending: true, nullsFirst: false })
      .limit(3),
    supabase
      .from("requests")
      .select("id, project_id, expires_at, artisan_id, artisans(raison_sociale, nom_commercial)")
      .eq("status", "envoyee")
      .gt("expires_at", new Date().toISOString())
      .lte("expires_at", new Date(Date.now() + 12 * 3_600_000).toISOString())
      .order("expires_at")
      .limit(5),
  ]);
  return {
    dossiers: (dossiers.data ?? []).map((a) => ({
      id: a.id,
      name: a.nom_commercial ?? a.raison_sociale ?? a.siret ?? a.id,
    })),
    expiringRequests: (expiring.data ?? []).map((r) => ({
      id: r.id,
      projectId: r.project_id,
      artisanId: r.artisan_id,
      artisan: r.artisans?.nom_commercial ?? r.artisans?.raison_sociale ?? "",
      expiresAt: r.expires_at,
    })),
  };
}
