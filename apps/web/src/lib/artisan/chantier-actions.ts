"use server";

import { appointmentInputError, chantierStartInputError } from "@menao/core";
import {
  appointmentNotesSchema,
  appointmentSchema,
  cancelChantierSchema,
  chantierMessageSchema,
  chantierStartSchema,
  expertiseSchema,
  messages,
} from "@menao/validation";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireArtisan } from "./requests";

const t = fr.pro.appointment;
const tf = fr.pro.followUp;

/** Erreur de la base affichable telle quelle (règle métier), sinon message générique. */
const rpcError = (error: { code?: string; message: string }): FormState => ({
  error: error.code === "22023" ? error.message : fr.errors.generic,
});

/**
 * Date et heure saisies : format (Zod), puis à venir et au plus 180 jours (@menao/core). Les
 * valeurs saisies sont renvoyées avec les erreurs : React vide le formulaire après l'envoi.
 */
function readAppointment(
  formData: FormData,
):
  | { ok: true; date: string; time: string; values: Record<string, string> }
  | { ok: false; state: FormState } {
  const values = { date: text(formData, "date") ?? "", time: text(formData, "time") ?? "" };
  const parsed = appointmentSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, state: { fieldErrors: z.flattenError(parsed.error).fieldErrors, values } };
  }
  const issue = appointmentInputError(parsed.data.date, parsed.data.time, new Date());
  if (issue) {
    const message = issue === "invalide" ? messages.appointmentDate : t.errors[issue];
    return { ok: false, state: { fieldErrors: { date: [message] }, values } };
  }
  return { ok: true, ...parsed.data, values };
}

/** F-17 « Fixer un rendez-vous » : crée le chantier puis ouvre la vue du rendez-vous. */
export async function fixAppointment(
  requestId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(requestId).success) return { error: fr.errors.generic };
  const input = readAppointment(formData);
  if (!input.ok) return input.state;
  const { supabase } = await requireArtisan();
  const { data: chantierId, error } = await supabase.rpc("artisan_fix_appointment", {
    p_request_id: requestId,
    p_date: input.date,
    p_time: input.time,
  });
  if (error || !chantierId) {
    return { ...(error ? rpcError(error) : { error: fr.errors.generic }), values: input.values };
  }
  revalidatePath("/pro", "layout");
  redirect(`/pro/chantiers/${chantierId}` as Route);
}

export async function rescheduleAppointment(
  chantierId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(chantierId).success) return { error: fr.errors.generic };
  const input = readAppointment(formData);
  if (!input.ok) return input.state;
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("artisan_reschedule_appointment", {
    p_chantier_id: chantierId,
    p_date: input.date,
    p_time: input.time,
  });
  if (error) return { ...rpcError(error), values: input.values };
  revalidatePath("/pro", "layout");
  return { success: t.rescheduled };
}

/** F-18 « Annuler le chantier » : la demande est annulée, le particulier retrouve une place. */
export async function cancelChantier(
  chantierId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(chantierId).success) return { error: fr.errors.generic };
  const values = { reason: text(formData, "reason") ?? "" };
  const parsed = cancelChantierSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("artisan_cancel_chantier", {
    p_chantier_id: chantierId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ...rpcError(error), values };
  revalidatePath("/pro", "layout");
  return { success: t.cancelTitle };
}

/** F-18 « Ajouter des notes » : notes privées de l'artisan. */
export async function saveAppointmentNotes(
  chantierId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(chantierId).success) return { error: fr.errors.generic };
  const values = { notes: text(formData, "notes") ?? "" };
  const parsed = appointmentNotesSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("artisan_save_appointment_notes", {
    p_chantier_id: chantierId,
    p_notes: parsed.data.notes,
  });
  if (error) return { ...rpcError(error), values };
  revalidatePath(`/pro/chantiers/${chantierId}`);
  return { success: t.notesSaved };
}

/** « Ce chantier a besoin d'une expertise » : ticket pour l'équipe MENAO. */
export async function reportExpertise(
  requestId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(requestId).success) return { error: fr.errors.generic };
  const values = { trade: text(formData, "trade") ?? "", message: text(formData, "message") ?? "" };
  const parsed = expertiseSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("artisan_report_expertise", {
    p_request_id: requestId,
    p_trade_code: parsed.data.trade,
    p_message: parsed.data.message,
  });
  if (error) return { ...rpcError(error), values };
  return { success: fr.pro.expertise.sent };
}

/** Date et heure de démarrage saisies : format (Zod), puis à venir et au plus un an (@menao/core). */
async function saveChantierStart(chantierId: string, formData: FormData): Promise<FormState> {
  if (!z.uuid().safeParse(chantierId).success) return { error: fr.errors.generic };
  const values = { date: text(formData, "date") ?? "", time: text(formData, "time") ?? "" };
  const parsed = chantierStartSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const issue = chantierStartInputError(parsed.data.date, parsed.data.time, new Date());
  if (issue) {
    const message = issue === "invalide" ? messages.chantierStartDate : tf.errors[issue];
    return { fieldErrors: { date: [message] }, values };
  }
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("artisan_confirm_start", {
    p_chantier_id: chantierId,
    p_date: parsed.data.date,
    p_time: parsed.data.time,
  });
  if (error) return { ...rpcError(error), values };
  revalidatePath("/pro", "layout");
  return { success: tf.saved };
}

/**
 * F-22 « Confirmez la date de démarrage » (après l'acompte, le chantier passe « planifié ») : la
 * fiche affiche ensuite la confirmation. Le client est notifié par la base.
 */
export async function confirmChantierStart(
  chantierId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const state = await saveChantierStart(chantierId, formData);
  if (!state.success) return state;
  redirect(`/pro/chantiers/${chantierId}?demarrage=confirme` as Route);
}

/** Modification de la date de démarrage tant que les travaux n'ont pas commencé (client prévenu). */
export async function editChantierStart(
  chantierId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return saveChantierStart(chantierId, formData);
}

/** F-22 « Ajouter un message » au journal du chantier, visible par le client. */
export async function addChantierMessage(
  chantierId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(chantierId).success) return { error: fr.errors.generic };
  const values = { message: text(formData, "message") ?? "" };
  const parsed = chantierMessageSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("artisan_add_chantier_message", {
    p_chantier_id: chantierId,
    p_message: parsed.data.message,
  });
  if (error) return { ...rpcError(error), values };
  revalidatePath(`/pro/chantiers/${chantierId}`);
  return { success: tf.messageSent };
}

/** F-22 « Déclarer le chantier terminé » : le client est invité à réceptionner les travaux. */
export async function declareChantierFinished(chantierId: string): Promise<FormState> {
  if (!z.uuid().safeParse(chantierId).success) return { error: fr.errors.generic };
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("artisan_declare_finished", { p_chantier_id: chantierId });
  if (error) return rpcError(error);
  revalidatePath("/pro", "layout");
  return { success: tf.finished };
}
