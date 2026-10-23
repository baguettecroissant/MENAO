"use server";

import { DATE_SOUHAIT_MODES, MAX_PROJECT_LOTS, parisToday } from "@menao/core";
import type { Database } from "@menao/db";
import { messages, projectCriteriaSchema, type ProjectCriteriaInput } from "@menao/validation";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/server";

type SaveArgs = Database["public"]["Functions"]["save_project_criteria"]["Args"];
// Les types générés ne marquent pas les paramètres SQL facultatifs comme pouvant être nuls.
type NullableArgs<T> = { [K in keyof T]: T[K] | null };

export type CriteriaResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Message lisible pour une erreur levée par les fonctions SQL (codes 22023 / 42501). */
function sqlError(error: { code?: string; message: string }): string {
  if (error.code === "22023") return error.message;
  return fr.errors.generic;
}

/** F-07 : chaque carte enregistre l'ensemble des critères (validés ici, puis en base). */
export async function saveProjectCriteria(
  projectId: string,
  input: ProjectCriteriaInput,
): Promise<CriteriaResult> {
  if (!UUID.test(projectId)) return { ok: false, error: fr.errors.generic };
  const parsed = projectCriteriaSchema(parisToday()).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? fr.errors.generic };
  }
  const c = parsed.data;
  const supabase = await createClient();
  const args: NullableArgs<SaveArgs> = {
    p_project_id: projectId,
    p_trade_code: c.tradeCode,
    p_lieu_type: c.lieuType,
    p_room_codes: c.roomCodes,
    p_work_type_codes: c.workTypeCodes,
    p_surface: c.surface,
    p_ville_code_insee: c.ville?.code ?? null,
    p_ville_nom: c.ville?.nom ?? null,
    p_code_postal: c.ville?.codePostal ?? null,
    p_ville_lon: c.ville?.lon ?? null,
    p_ville_lat: c.ville?.lat ?? null,
    p_adresse: c.adresse?.label ?? null,
    p_lon: c.adresse?.lon ?? null,
    p_lat: c.adresse?.lat ?? null,
    p_date_mode: c.dateMode,
    p_date_souhaitee: c.dateSouhaitee,
    p_budget: c.budget,
  };
  const { error } = await supabase.rpc("save_project_criteria", args as SaveArgs);
  if (error) return { ok: false, error: sqlError(error) };
  revalidatePath(`/recherche/${projectId}`);
  return { ok: true };
}

/** Autres métiers du chantier choisis par le particulier (ADR 0167), créés au lancement. */
export async function saveProjectLots(
  projectId: string,
  tradeCodes: string[],
): Promise<CriteriaResult> {
  const codes = z
    .array(z.string().regex(/^[a-z0-9-]{1,60}$/))
    .max(MAX_PROJECT_LOTS)
    .safeParse(tradeCodes);
  if (!UUID.test(projectId) || !codes.success) return { ok: false, error: fr.errors.generic };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_project_lot_trades", {
    p_project_id: projectId,
    p_trade_codes: codes.data,
  });
  if (error) return { ok: false, error: sqlError(error) };
  revalidatePath(`/recherche/${projectId}`);
  return { ok: true };
}

type LotStartArgs = Database["public"]["Functions"]["set_lot_start"]["Args"];

/** Date de début propre à un lot (ADR 0169) ; mode null : celle du chantier. */
export async function saveLotStart(
  projectId: string,
  tradeCode: string,
  dateMode: (typeof DATE_SOUHAIT_MODES)[number] | null,
  date: string | null,
): Promise<CriteriaResult> {
  const input = z
    .object({
      tradeCode: z.string().regex(/^[a-z0-9-]{1,60}$/),
      dateMode: z.enum(DATE_SOUHAIT_MODES).nullable(),
      date: z.iso.date().nullable(),
    })
    .safeParse({ tradeCode, dateMode, date });
  if (!UUID.test(projectId) || !input.success) return { ok: false, error: fr.errors.generic };
  if (input.data.dateMode === "date" && !input.data.date) {
    return { ok: false, error: messages.required };
  }
  const supabase = await createClient();
  const args: NullableArgs<LotStartArgs> = {
    p_project_id: projectId,
    p_trade_code: input.data.tradeCode,
    p_date_mode: input.data.dateMode,
    p_date: input.data.dateMode === "date" ? input.data.date : null,
  };
  const { error } = await supabase.rpc("set_lot_start", args as LotStartArgs);
  if (error) return { ok: false, error: sqlError(error) };
  revalidatePath(`/recherche/${projectId}/artisans`);
  return { ok: true };
}

/** « Trouver l'artisan idéal » : métier et ville obligatoires (vérifiés en base). */
export async function launchSearch(projectId: string): Promise<CriteriaResult> {
  if (!UUID.test(projectId)) return { ok: false, error: fr.errors.generic };
  const supabase = await createClient();
  const { error } = await supabase.rpc("validate_project_criteria", { p_project_id: projectId });
  if (error) return { ok: false, error: sqlError(error) };
  redirect(`/recherche/${projectId}/artisans` as Route);
}

export async function deleteProjectPhoto(
  projectId: string,
  photoId: string,
): Promise<CriteriaResult> {
  if (!UUID.test(projectId) || !UUID.test(photoId)) return { ok: false, error: fr.errors.generic };
  const supabase = await createClient();
  const { data: photo } = await supabase
    .from("project_photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!photo) return { ok: false, error: fr.errors.generic };
  const { error } = await supabase.from("project_photos").delete().eq("id", photo.id);
  if (error) return { ok: false, error: fr.errors.generic };
  await supabase.storage.from("project-photos").remove([photo.storage_path]);
  revalidatePath(`/recherche/${projectId}`);
  return { ok: true };
}

export type TicketState = { error?: string; success?: string };

/** « Envoyer mon dossier à MENAO » (F-09, F-56) : e-mail obligatoire pour une session anonyme. */
export async function sendProjectToMenao(
  projectId: string,
  _prev: TicketState,
  formData: FormData,
): Promise<TicketState> {
  if (!UUID.test(projectId)) return { error: fr.errors.generic };
  const message = String(formData.get("message") ?? "").slice(0, 2000);
  const email = String(formData.get("email") ?? "").trim();
  if (email && !z.email().safeParse(email).success) return { error: messages.emailInvalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_project_to_menao", {
    p_project_id: projectId,
    p_message: message,
    p_contact_email: email,
  });
  if (error) return { error: error.code === "22023" ? messages.emailInvalid : fr.errors.generic };
  return { success: fr.search.results.ticket.sent };
}
