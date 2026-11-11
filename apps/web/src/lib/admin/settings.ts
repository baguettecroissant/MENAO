import "server-only";
import { getPartnerSettings } from "@/lib/admin/partners";
import { getReception } from "@/lib/admin/reception";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Sections de la page Réglages (ADR 0284), dans l'ordre du sous-menu. */
export const SETTINGS_SECTIONS = [
  "plateforme",
  "demandes",
  "accueil",
  "partenaires",
  "commerciaux",
  "lancement",
] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

/** Dernière modification d'une section : date et nom de l'auteur (journal d'audit). */
export type SettingsChange = { at: string; by: string | null } | null;

/** Actions du journal d'audit qui modifient chaque section (horaires : colonnes de la table). */
const AUDIT_ACTIONS: Record<Exclude<SettingsSection, "accueil">, string> = {
  plateforme: "platform_setting",
  demandes: "objectif_demandes",
  partenaires: "partenaires.reglages",
  commerciaux: "commerciaux.reglages_primes",
  lancement: "lancement.reglages",
};

/**
 * Page Réglages (ADR 0284) : tous les réglages de la plateforme, lus là où ils sont rangés, et la
 * dernière modification de chacun (journal d'audit ; horaires d'accueil : colonnes updated_*).
 */
export async function getSettingsPage(supabase: Client) {
  const [platform, reception, receptionMeta, partners, commercials, launch, audit] =
    await Promise.all([
      supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["client_ratings_visible", "objectif_demandes_mois"]),
      getReception(supabase),
      supabase.from("reception_settings").select("updated_at, updated_by").maybeSingle(),
      getPartnerSettings(supabase),
      supabase
        .from("commercial_bonus_settings")
        .select(
          "prime_validation_centimes, prime_abonnement_centimes, delai_validation_jours, objectif_valides_mois",
        )
        .maybeSingle(),
      supabase
        .from("launch_settings")
        .select("debut_recrutement, fin_recrutement, seuil_couverture, seuil_fiche_complete")
        .maybeSingle(),
      supabase
        .from("audit_logs")
        .select("action, actor_id, target_type, data, created_at")
        .in("action", Object.values(AUDIT_ACTIONS))
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  const value = (key: string) => platform.data?.find((row) => row.key === key)?.value;
  const raw: Partial<Record<SettingsSection, { at: string; actor: string | null }>> = {};
  for (const row of audit.data ?? []) {
    const section = (Object.keys(AUDIT_ACTIONS) as (keyof typeof AUDIT_ACTIONS)[]).find(
      (key) => AUDIT_ACTIONS[key] === row.action,
    );
    if (!section || raw[section]) continue;
    const data = (row.data ?? {}) as Record<string, unknown>;
    // Notes des clients : seul ce paramètre est sur la page ; objectif : pas ceux d'un artisan.
    if (section === "plateforme" && data.key !== "client_ratings_visible") continue;
    if (section === "demandes" && row.target_type !== "platform_settings") continue;
    raw[section] = { at: row.created_at, actor: row.actor_id };
  }
  if (receptionMeta.data?.updated_by) {
    raw.accueil = { at: receptionMeta.data.updated_at, actor: receptionMeta.data.updated_by };
  }
  const actors = [...new Set(Object.values(raw).flatMap((c) => (c?.actor ? [c.actor] : [])))];
  const { data: profiles } = actors.length
    ? await supabase.from("profiles").select("user_id, first_name, last_name").in("user_id", actors)
    : { data: [] };
  const name = new Map(
    (profiles ?? []).map((p) => [
      p.user_id,
      [p.first_name, p.last_name].filter(Boolean).join(" ") || null,
    ]),
  );
  const changes = Object.fromEntries(
    SETTINGS_SECTIONS.map((section) => {
      const c = raw[section];
      return [section, c ? { at: c.at, by: c.actor ? (name.get(c.actor) ?? null) : null } : null];
    }),
  ) as Record<SettingsSection, SettingsChange>;

  const leads = Number(value("objectif_demandes_mois"));
  return {
    ratingsVisible: value("client_ratings_visible") === true,
    leadsTarget: Number.isInteger(leads) && leads > 0 ? leads : 4,
    reception,
    partners,
    commercials: commercials.data,
    launch: launch.data ?? {
      debut_recrutement: null,
      fin_recrutement: null,
      seuil_couverture: 3,
      seuil_fiche_complete: 100,
    },
    changes,
  };
}
