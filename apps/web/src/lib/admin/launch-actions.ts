"use server";

import {
  acquisitionCodeFormSchema,
  launchMemberFormSchema,
  launchSettingsFormSchema,
  launchTaskFormSchema,
} from "@menao/validation";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import {
  checkLaunchPlanFile,
  launchImportResultSchema,
  type LaunchImportResult,
} from "@/lib/launch/plan-file";
import { requireAdmin } from "./guard";

const t = fr.admin.launch;
const PATH = "/admin/lancement";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MEMBER_FIELDS = ["nom", "mission", "kind", "user_id", "objectif_valides", "ordre"] as const;
const TASK_FIELDS = [
  "titre",
  "member_id",
  "detail",
  "phase",
  "categorie",
  "debut",
  "echeance",
  "recurrence",
  "jalon",
  "partage",
  "statut",
] as const;
const CODE_FIELDS = ["code", "libelle", "canal", "member_id", "active"] as const;
const SETTINGS_FIELDS = [
  "debut_recrutement",
  "fin_recrutement",
  "seuil_couverture",
  "seuil_fiche_complete",
] as const;

/** Message d'erreur de la base : 22023 = règle métier, montré tel quel ; sinon message générique. */
const dbError = (error: { code: string; message: string }) =>
  error.code === "22023" ? error.message : t.errors.generic;

/** Champs du formulaire, renvoyés tels quels en cas d'erreur. */
const formValues = (formData: FormData, names: readonly string[]) =>
  Object.fromEntries(names.map((name) => [name, text(formData, name) ?? ""]));

/** Identifiant facultatif d'un champ caché : absent → undefined, invalide → null. */
function optionalUuid(formData: FormData, name: string): string | undefined | null {
  const value = text(formData, name) ?? "";
  if (!value) return undefined;
  return UUID.test(value) ? value : null;
}

/** Tableau d'un membre ou vue d'équipe, à jour après une action. */
function revalidateLaunch() {
  revalidatePath(PATH, "layout");
  revalidatePath("/commercial/planning");
}

/**
 * Retour avec le message de réussite dans l'adresse (comme les fiches des commerciaux) : sur le
 * tableau du membre concerné, ou sur la vue d'équipe pour une tâche de toute l'équipe.
 */
function backTo(memberId: string | null, done: string, n?: number): never {
  const query = `fait=${done}${n === undefined ? "" : `&n=${n}`}`;
  redirect((memberId ? `${PATH}/${memberId}?${query}` : `${PATH}?${query}`) as Route);
}

/**
 * Membre de l'équipe de lancement (F-66, ADR 0208), créé ou remplacé en entier. La base vérifie
 * l'admin (aal2), le compte relié (admin ou commercial, commercial pour un membre commercial, une
 * seule fois dans l'équipe) et journalise.
 */
export async function saveLaunchMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, MEMBER_FIELDS);
  const id = optionalUuid(formData, "id");
  if (id === null) return { error: t.errors.generic, values };
  const parsed = launchMemberFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: t.errors.invalid,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }
  const m = parsed.data;
  const { supabase } = await requireAdmin();
  // Champ vide : paramètre absent, donc nul en base (la fonction remplace tout ; ordre absent :
  // l'actuel est gardé). Jamais de null explicite (paramètres facultatifs).
  const { data, error } = await supabase.rpc("admin_save_launch_member", {
    p_nom: m.nom,
    p_kind: m.kind,
    p_id: id,
    p_mission: m.mission ?? undefined,
    p_user_id: m.user_id ?? undefined,
    p_objectif_valides: m.objectif_valides ?? undefined,
    p_ordre: m.ordre ?? undefined,
  });
  if (error || !data) return { error: error ? dbError(error) : t.errors.generic, values };
  revalidateLaunch();
  backTo(data, "membre");
}

/** Membre retiré de l'équipe : ses tâches restent, pour toute l'équipe. */
export async function deleteLaunchMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = optionalUuid(formData, "id");
  if (!id) return { error: t.errors.generic };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_delete_launch_member", { p_id: id });
  if (error) return { error: dbError(error) };
  revalidateLaunch();
  backTo(null, "membre-supprime");
}

/**
 * Tâche, jalon ou rendez-vous régulier, créé ou remplacé en entier ; la base garde la date à
 * laquelle une tâche déjà faite l'a été, et journalise.
 */
export async function saveLaunchTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, TASK_FIELDS);
  const id = optionalUuid(formData, "id");
  if (id === null) return { error: t.errors.generic, values };
  const parsed = launchTaskFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: t.errors.invalid,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }
  const task = parsed.data;
  const { supabase } = await requireAdmin();
  // Champ vide : paramètre absent, donc nul en base (la fonction remplace tout).
  const { data, error } = await supabase.rpc("admin_save_launch_task", {
    p_titre: task.titre,
    p_id: id,
    p_member_id: task.member_id ?? undefined,
    p_detail: task.detail ?? undefined,
    p_phase: task.phase,
    p_categorie: task.categorie,
    p_debut: task.debut ?? undefined,
    p_echeance: task.echeance ?? undefined,
    p_recurrence: task.recurrence ?? undefined,
    p_jalon: task.jalon,
    p_partage: task.partage,
    p_statut: task.statut,
  });
  if (error || !data) return { error: error ? dbError(error) : t.errors.generic, values };
  revalidateLaunch();
  backTo(task.member_id, "tache");
}

/** Suppression d'une tâche ; retour sur le tableau de son responsable (champ caché `member`). */
export async function deleteLaunchTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = optionalUuid(formData, "id");
  const member = optionalUuid(formData, "member");
  if (!id) return { error: t.errors.generic };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_delete_launch_task", { p_id: id });
  if (error) return { error: dbError(error) };
  revalidateLaunch();
  backTo(member ?? null, "tache-supprimee");
}

/**
 * Copie du planning d'un membre vers un autre (nouveau commercial) : toutes ses tâches, remises à
 * faire ; retour sur le tableau du destinataire avec le nombre de tâches copiées.
 */
export async function copyLaunchTasks(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["from", "to"]);
  const from = optionalUuid(formData, "from");
  const to = optionalUuid(formData, "to");
  if (!from) return { fieldErrors: { from: [t.copy.choose] }, values };
  if (!to) return { fieldErrors: { to: [t.copy.choose] }, values };
  if (from === to) return { fieldErrors: { to: [t.copy.same] }, values };
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_copy_launch_tasks", {
    p_from: from,
    p_to: to,
  });
  if (error) return { error: dbError(error), values };
  revalidateLaunch();
  backTo(to, "copie", data ?? 0);
}

export type LaunchImportResponse = { result: LaunchImportResult } | { error: string };

/**
 * Import du plan de lancement (fichier .json gardé hors du dépôt public, lu par le navigateur de
 * l'admin) : vérifié ici comme dans le navigateur, puis la base crée ou met à jour membres et
 * tâches par leur référence, sans toucher à ce qui a été coché, et ignore les lignes invalides.
 */
export async function importLaunchPlan(data: unknown): Promise<LaunchImportResponse> {
  const checked = checkLaunchPlanFile(data);
  if ("error" in checked) return { error: checked.error };
  const { supabase } = await requireAdmin();
  const { data: counts, error } = await supabase.rpc("admin_import_launch_plan", {
    p_plan: checked.plan,
  });
  if (error) return { error: error.code === "22023" ? error.message : t.import.errors.save };
  const result = launchImportResultSchema.safeParse(counts);
  if (!result.success) return { error: t.import.errors.save };
  revalidateLaunch();
  return { result: result.data };
}

/**
 * Code de suivi /p/<code> (F-66, lot 2, ADR 0209) : création, ou modification du libellé, du canal,
 * du responsable et de l'état (le code lui-même est définitif : renvoyé par un champ caché). La
 * base vérifie l'admin (aal2), le format et que le code n'est pas déjà pris dans l'espace des liens
 * /p/<code> (partenaires, commerciaux, parrainage), puis journalise. Retour sur la liste des codes.
 */
export async function saveAcquisitionCode(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData, CODE_FIELDS);
  const id = optionalUuid(formData, "id");
  if (id === null) return { error: t.errors.generic, values };
  // Case « Actif » : seulement en modification (absente car décochée : code désactivé) ; à la
  // création, pas de case et le code naît actif.
  const parsed = acquisitionCodeFormSchema.safeParse({
    ...values,
    id,
    active: text(formData, "active"),
  });
  if (!parsed.success) {
    return {
      error: t.errors.invalid,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }
  const c = parsed.data;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_save_acquisition_code", {
    p_code: c.code ?? "",
    p_libelle: c.libelle,
    p_canal: c.canal,
    p_id: c.id ?? undefined,
    p_member_id: c.member_id ?? undefined,
    p_active: c.active,
  });
  if (error || !data) return { error: error ? dbError(error) : t.errors.generic, values };
  revalidateLaunch();
  redirect(`${PATH}/codes?fait=${c.id ? "code-modifie" : "code-cree"}` as Route);
}

/**
 * Réglages des chiffres (lot 2, ADR 0209), remplacés en entier : période du recrutement et seuils
 * (vides : valeurs par défaut en base). Retour sur les chiffres, section des réglages ouverte.
 */
export async function saveLaunchSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, SETTINGS_FIELDS);
  const parsed = launchSettingsFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: t.errors.invalid,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }
  const r = parsed.data;
  const { supabase } = await requireAdmin();
  // Champ vide : paramètre absent, donc nul en base (seuils : valeur par défaut).
  const { error } = await supabase.rpc("admin_save_launch_settings", {
    p_debut_recrutement: r.debut_recrutement ?? undefined,
    p_fin_recrutement: r.fin_recrutement ?? undefined,
    p_seuil_couverture: r.seuil_couverture ?? undefined,
    p_seuil_fiche_complete: r.seuil_fiche_complete ?? undefined,
  });
  if (error) return { error: dbError(error), values };
  revalidateLaunch();
  redirect(`${PATH}/chiffres?fait=reglages#reglages` as Route);
}
