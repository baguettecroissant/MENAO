import "server-only";
import {
  leadAlerts,
  leadCause,
  leadProgress,
  type LeadAlert,
  type LeadCause,
  type LeadProgress,
} from "@menao/core";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

const n = z.number().int().nonnegative();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Réponse de admin_lead_targets (F-131, ADR 0282). */
const leadTargetsSchema = z.object({
  mois: isoDate,
  aujourdhui: isoDate,
  objectif_defaut: n,
  artisans: z.array(
    z.object({
      id: z.string(),
      nom: z.string(),
      ville: z.string().nullable(),
      metiers: z.array(z.string()),
      valide_le: isoDate,
      objectif: n,
      objectif_propre: z.boolean(),
      en_pause: z.boolean(),
      absent: z.boolean(),
      visible: z.boolean(),
      recherches_zone: n,
      recues: n,
      directes: n,
      acceptees: n,
      historique: z.array(z.object({ mois: isoDate, recues: n })),
    }),
  ),
});

export type LeadArtisan = {
  id: string;
  name: string;
  city: string | null;
  trades: string[];
  validatedOn: string;
  target: number;
  ownTarget: boolean;
  paused: boolean;
  absent: boolean;
  visible: boolean;
  searches: number;
  direct: number;
  accepted: number;
  /** Mois suivi. */
  progress: LeadProgress;
  /** Les 6 mois, du plus ancien au mois suivi. */
  history: LeadProgress[];
  alerts: LeadAlert[];
  cause: LeadCause | null;
};

export type LeadTargets = {
  month: string;
  today: string;
  defaultTarget: number;
  artisans: LeadArtisan[];
};

/**
 * Suivi des objectifs d'un mois (le mois en cours par défaut), pour tous les artisans validés ou
 * un seul : chiffres de la base, avancement et alertes calculés par @menao/core. Null si la
 * fonction est indisponible (rôle ou migration).
 */
export async function getLeadTargets(
  supabase: Client,
  { month = null, artisanId = null }: { month?: string | null; artisanId?: string | null } = {},
): Promise<LeadTargets | null> {
  const { data, error } = await supabase.rpc("admin_lead_targets", {
    ...(month ? { p_month: month } : {}),
    ...(artisanId ? { p_artisan_id: artisanId } : {}),
  });
  if (error) return null;
  const parsed = leadTargetsSchema.safeParse(data);
  if (!parsed.success) return null;
  const d = parsed.data;
  return {
    month: d.mois,
    today: d.aujourdhui,
    defaultTarget: d.objectif_defaut,
    artisans: d.artisans.map((a) => {
      const history = a.historique.map((m) =>
        leadProgress({
          month: m.mois,
          today: d.aujourdhui,
          validatedOn: a.valide_le,
          target: a.objectif,
          received: m.recues,
        }),
      );
      const progress =
        history.at(-1) ??
        leadProgress({
          month: d.mois,
          today: d.aujourdhui,
          validatedOn: a.valide_le,
          target: a.objectif,
          received: a.recues,
        });
      return {
        id: a.id,
        name: a.nom,
        city: a.ville,
        trades: a.metiers,
        validatedOn: a.valide_le,
        target: a.objectif,
        ownTarget: a.objectif_propre,
        paused: a.en_pause,
        absent: a.absent,
        visible: a.visible,
        searches: a.recherches_zone,
        direct: a.directes,
        accepted: a.acceptees,
        progress,
        history,
        alerts: leadAlerts(history, d.aujourdhui),
        cause: leadCause({
          progress,
          paused: a.en_pause,
          absent: a.absent,
          visible: a.visible,
          searches: a.recherches_zone,
        }),
      };
    }),
  };
}

export const LEAD_FILTERS = [
  "tous",
  "alertes",
  "en_retard",
  "manque",
  "dans_les_temps",
  "atteint",
  "hors_suivi",
] as const;
export type LeadFilter = (typeof LEAD_FILTERS)[number];

export function parseLeadFilter(value: unknown): LeadFilter {
  return LEAD_FILTERS.includes(value as LeadFilter) ? (value as LeadFilter) : "tous";
}

export function matchesLeadFilter(artisan: LeadArtisan, filter: LeadFilter): boolean {
  if (filter === "tous") return true;
  if (filter === "alertes") return artisan.alerts.length > 0;
  return artisan.progress.status === filter;
}

/** Les plus en difficulté d'abord : alertes, puis demandes manquantes, puis nom. */
export function sortLeadArtisans(list: readonly LeadArtisan[]): LeadArtisan[] {
  const rank = (a: LeadArtisan) =>
    a.alerts.includes("deux_mois")
      ? 0
      : a.alerts.length
        ? 1
        : a.progress.status === "hors_suivi"
          ? 3
          : 2;
  return [...list].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      b.progress.missing - a.progress.missing ||
      a.name.localeCompare(b.name, "fr"),
  );
}

/** Les 6 derniers mois, du plus récent au plus ancien (AAAA-MM-01), pour le choix du mois. */
export function recentMonths(today: string, count = 6): string[] {
  const [year, month] = today.split("-").map(Number) as [number, number];
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    return d.toISOString().slice(0, 10);
  });
}

/** Mois demandé dans l'adresse (`?mois=AAAA-MM`), s'il est valide. */
export function parseLeadMonth(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? `${value}-01` : null;
}
