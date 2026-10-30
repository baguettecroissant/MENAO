import "server-only";
import {
  LAUNCH_CHANNELS,
  LAUNCH_INDICATORS,
  LAUNCH_MEMBER_KINDS,
  type LaunchCoverage,
  type LaunchFigures,
} from "@menao/core";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Chiffres du lancement en direct (F-66, lot 2, ADR 0209), calculés en base sur les vraies données
 * de MENAO (admin_launch_figures, admin_launch_coverage ; lecture admin, aal2) puis vérifiés ici :
 * une réponse inattendue donne null (message d'erreur sur la page), jamais des chiffres faux.
 * Les cibles sont des données importées avec le plan, jamais écrites dans le dépôt public.
 */

const n = z.number().int().nonnegative();
const day = z.iso.date();

const figuresSchema: z.ZodType<LaunchFigures> = z.object({
  today: day,
  settings: z.object({
    debut_recrutement: day.nullable(),
    fin_recrutement: day.nullable(),
    seuil_couverture: n,
    seuil_fiche_complete: n,
  }),
  targets: z.array(
    z.object({
      indicateur: z.enum(LAUNCH_INDICATORS),
      member_id: z.string().nullable(),
      jour: day.nullable(),
      valeur: z.number().nonnegative(),
    }),
  ),
  totals: z.object({
    inscrits: n,
    dossiers_envoyes: n,
    valides: n,
    fiches_completes: n,
    en_essai: n,
    abonnes: n,
  }),
  weeks: z.array(
    z.object({
      semaine: day,
      inscrits: n,
      valides: n,
      inscrits_cumul: n,
      valides_cumul: n,
    }),
  ),
  channels: z.array(
    z.object({
      canal: z.enum(LAUNCH_CHANNELS),
      inscrits: n,
      valides: n,
      valides_semaine: n,
    }),
  ),
  members: z.array(
    z.object({
      member_id: z.string(),
      nom: z.string(),
      kind: z.enum(LAUNCH_MEMBER_KINDS),
      objectif: n.nullable(),
      inscrits: n,
      valides: n,
      valides_semaine: n,
      weeks: z.array(z.object({ semaine: day, valides: n })),
      dossiers_traites: n,
      dossiers_mesurables: n,
      dossiers_48h: n,
    }),
  ),
  quality: z.object({
    dossiers_decides: n,
    dossiers_48h: n,
    en_attente: n,
    en_attente_48h: n,
    fiches_completes: n,
    valides: n,
    app_installee: n,
    premier_devis_perso: n,
  }),
  activity: z.object({
    demandes_semaine: n,
    demandes_semaine_precedente: n,
    artisans_actifs: n,
    artisans_4_demandes: n,
    // Médiane : une demi-demande possible (nombre pair d'artisans).
    demandes_par_artisan_mediane: z.number().nonnegative(),
    demandes_72h: n,
    demandes_repondues_72h: n,
    artisans_devis_envoye: n,
    essais: n,
    essais_termines: n,
    abonnes_apres_essai: n,
    abonnes: n,
  }),
});

const coverageSchema: z.ZodType<LaunchCoverage> = z.object({
  seuil: n,
  communes: z.array(z.object({ code_insee: z.string(), nom: z.string() })),
  trades: z.array(z.object({ code: z.string(), label: z.string() })),
  cells: z.array(z.object({ trade: z.string(), code_insee: z.string(), n })),
});

/** Chiffres du lancement ; null si la base refuse ou répond autre chose que prévu. */
export async function getLaunchFigures(supabase: Client): Promise<LaunchFigures | null> {
  const { data, error } = await supabase.rpc("admin_launch_figures");
  if (error) return null;
  const parsed = figuresSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Couverture métier × commune pilote ; null si la base refuse ou répond autre chose que prévu. */
export async function getLaunchCoverage(supabase: Client): Promise<LaunchCoverage | null> {
  const { data, error } = await supabase.rpc("admin_launch_coverage");
  if (error) return null;
  const parsed = coverageSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Codes de suivi /p/<code>, avec leur responsable, leurs inscrits et leurs validés. */
export async function listAcquisitionCodes(supabase: Client) {
  const { data } = await supabase.rpc("admin_acquisition_codes");
  return data ?? [];
}
export type AcquisitionCodeRow = Awaited<ReturnType<typeof listAcquisitionCodes>>[number];
