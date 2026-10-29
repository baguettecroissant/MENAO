"use server";

import { PROSPECT_STATUSES, isValidDate, parisLocalToDate } from "@menao/core";
import { normalizePhone } from "@menao/validation";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { getCommercialSpace } from "./space";

const t = fr.commercialProspects;
const LIST = "/commercial/prospects";
const DAY = "/commercial/journee";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Erreur de la base : les refus métier (22023) sont déjà rédigés pour l'écran. */
function rpcError(error: { code?: string; message: string }): FormState {
  if (error.code === "22023") return { error: error.message };
  if (error.code === "42501") return { error: t.errors.suspended };
  return { error: t.errors.unavailable };
}

/** Commercial connecté (les autres rôles retournent à leur accueil) et prospect visé. */
async function context(formData: FormData) {
  const id = text(formData, "id") ?? "";
  const space = await getCommercialSpace();
  const refused = !UUID.test(id) ? t.errors.unavailable : !space.active ? t.errors.suspended : null;
  return { id, space, refused };
}

function refresh(id: string) {
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
  revalidatePath(DAY);
}

/** Suivre un prospect libre (F-65, lot 2, ADR 0206) : un prospect, un seul commercial. */
export async function followProspect(_prev: FormState, formData: FormData): Promise<FormState> {
  const { id, space, refused } = await context(formData);
  if (refused) return { error: refused };
  const { error } = await space.supabase.rpc("commercial_follow_prospect", { p_id: id });
  if (error) return rpcError(error);
  refresh(id);
  return {};
}

/**
 * Mettre à jour mon suivi : étape, prochaine action (saisie à l'heure de Paris), téléphone (un
 * numéro français est mis au format international) et notes. La base refait tous les contrôles.
 */
export async function updateProspect(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    status: text(formData, "status") ?? "",
    nextActionAt: text(formData, "nextActionAt")?.trim() ?? "",
    phone: text(formData, "phone")?.trim() ?? "",
    notes: text(formData, "notes") ?? "",
  };
  const { id, space, refused } = await context(formData);
  if (refused) return { error: refused, values };
  const status = PROSPECT_STATUSES.find((s) => s === values.status);
  if (!status) return { error: t.errors.unavailable, values };

  let nextActionAt: string | null = null;
  if (values.nextActionAt) {
    const [date = "", time = ""] = values.nextActionAt.split("T");
    if (!isValidDate(date) || !TIME.test(time.slice(0, 5))) {
      return { fieldErrors: { nextActionAt: [t.errors.date] }, values };
    }
    nextActionAt = parisLocalToDate(date, time.slice(0, 5)).toISOString();
  }
  const phone = values.phone ? normalizePhone(values.phone) : null;
  if (values.phone && !phone) return { fieldErrors: { phone: [t.errors.phone] }, values };

  const { error } = await space.supabase.rpc("commercial_update_prospect", {
    p_id: id,
    p_status: status,
    // Absents : effacés (valeurs par défaut nulles de la fonction).
    p_next_action_at: nextActionAt ?? undefined,
    p_phone: phone ?? undefined,
    // Retours à la ligne du navigateur (CRLF) comptés une fois, comme en base.
    p_notes: values.notes?.replace(/\r\n?/g, "\n") || undefined,
  });
  if (error) return { ...rpcError(error), values };
  refresh(id);
  return { success: t.detail.saved };
}

/** Ne plus suivre : le prospect redevient libre, mes notes sont effacées. */
export async function releaseProspect(_prev: FormState, formData: FormData): Promise<FormState> {
  const { id, space, refused } = await context(formData);
  if (refused) return { error: refused };
  const { error } = await space.supabase.rpc("commercial_release_prospect", { p_id: id });
  if (error) return rpcError(error);
  refresh(id);
  return {};
}

/**
 * « Ne plus contacter » (définitif, à la demande de l'artisan) : seul le SIRET est gardé pour ne
 * plus jamais l'importer ; retour à la liste avec la confirmation.
 */
export async function doNotContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const { id, space, refused } = await context(formData);
  if (refused) return { error: refused };
  const { error } = await space.supabase.rpc("commercial_do_not_contact", { p_id: id });
  if (error) return rpcError(error);
  refresh(id);
  redirect(`${LIST}?retire=1` as Route);
}
