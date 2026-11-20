"use server";

import { commercialPaceFormSchema, paceSettingsFormSchema } from "@menao/validation";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireAdmin } from "./guard";

const t = fr.admin.launch.pace;
const PATH = "/admin/lancement/rythme";
const SETTINGS_FIELDS = [
  "objectif_valides",
  "debut_recrutement",
  "fin_recrutement",
  "rythme_semaine",
  "rythme_demarrage",
  "semaines_demarrage",
  "repere_visites_jour",
  "email_lundi",
  "classement_visible",
  "alerte_retard",
] as const;
const OWN_FIELDS = ["commercial_id", "rythme_semaine", "rythme_raison"] as const;

/** Message d'erreur de la base : 22023 = règle métier, montré tel quel ; sinon message générique. */
const dbError = (error: { code: string; message: string }) =>
  error.code === "22023" ? error.message : t.errors.generic;

const formValues = (formData: FormData, names: readonly string[]) =>
  Object.fromEntries(names.map((name) => [name, text(formData, name) ?? ""]));

/** Rythme, chiffres et « Mes résultats » des conseillers, à jour après un réglage. */
function revalidatePace() {
  revalidatePath("/admin/lancement", "layout");
  revalidatePath("/admin");
  revalidatePath("/commercial/resultats");
}

/**
 * Réglages du rythme (F-184, ADR 0381), remplacés en entier : objectif commun et ses dates (début
 * et fin du recrutement, partagés avec l'onglet Chiffres), rythme, démarrage, repère et suivi. La
 * base vérifie l'admin (aal2) et journalise. Retour sur l'onglet Rythme.
 */
export async function savePaceSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, SETTINGS_FIELDS);
  const parsed = paceSettingsFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: t.errors.invalid,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }
  const r = parsed.data;
  const { supabase } = await requireAdmin();
  // Champ vide : paramètre absent, donc nul en base.
  const { error } = await supabase.rpc("admin_save_pace_settings", {
    p_objectif_valides: r.objectif_valides ?? undefined,
    p_debut_recrutement: r.debut_recrutement ?? undefined,
    p_fin_recrutement: r.fin_recrutement ?? undefined,
    p_rythme_semaine: r.rythme_semaine,
    p_rythme_demarrage: r.rythme_demarrage,
    p_semaines_demarrage: r.semaines_demarrage,
    p_repere_visites_jour: r.repere_visites_jour,
    p_email_lundi: r.email_lundi,
    p_classement_visible: r.classement_visible,
    p_alerte_retard: r.alerte_retard,
  });
  if (error) return { error: dbError(error), values };
  revalidatePace();
  redirect(`${PATH}?fait=reglages` as Route);
}

/**
 * Objectif propre d'un conseiller (temps partiel…) ; nombre vide : il reprend le rythme commun.
 * Retour sur les réglages, à la liste des objectifs propres.
 */
export async function saveCommercialPace(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, OWN_FIELDS);
  const parsed = commercialPaceFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: t.errors.invalid,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }
  const r = parsed.data;
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_set_commercial_pace", {
    p_commercial: r.commercial_id,
    p_rythme_semaine: r.rythme_semaine ?? undefined,
    p_rythme_raison: r.rythme_raison ?? undefined,
  });
  if (error) return { error: dbError(error), values };
  revalidatePace();
  redirect(`${PATH}/reglages?fait=objectif#objectifs-propres` as Route);
}
