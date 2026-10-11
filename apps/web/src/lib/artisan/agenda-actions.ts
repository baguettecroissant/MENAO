"use server";

import {
  AGENDA_MAX_DAYS_AHEAD,
  absenceError,
  addDays,
  blockedSlotError,
  hoursErrors,
  isValidDate,
  parisToday,
} from "@menao/core";
import {
  absenceSchema,
  availableFromSchema,
  blockedSlotSchema,
  hoursSchema,
} from "@menao/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireArtisan } from "./requests";

const t = fr.pro.agenda;
const ta = t.availability;

/** Erreur de la base affichable telle quelle (règle métier), sinon message générique. */
const rpcError = (error: { code?: string; message: string }): FormState => ({
  error: error.code === "22023" ? error.message : fr.errors.generic,
});

/** Le statut de disponibilité s'affiche dans le menu de toutes les pages de l'espace pro. */
const refresh = () => revalidatePath("/pro", "layout");

/** F-44 : pause (retiré des recherches) ou reprise des demandes. */
export async function savePause(_prev: FormState, formData: FormData): Promise<FormState> {
  const paused = text(formData, "paused") === "oui";
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("set_artisan_paused", { p_paused: paused });
  if (error) return rpcError(error);
  refresh();
  return { success: paused ? ta.status.paused : ta.status.resumed };
}

/** F-44 : « Nouveaux chantiers à partir du » (vide ou date passée : dès maintenant). */
export async function saveAvailableFrom(_prev: FormState, formData: FormData): Promise<FormState> {
  const value = text(formData, "availableFrom") ?? "";
  const values = { availableFrom: value };
  const parsed = availableFromSchema.safeParse(value);
  if (!parsed.success || (parsed.data !== "" && !isValidDate(parsed.data))) {
    return { fieldErrors: { availableFrom: [ta.from.errors.invalide] }, values };
  }
  const today = parisToday();
  if (parsed.data > addDays(today, AGENDA_MAX_DAYS_AHEAD)) {
    return { fieldErrors: { availableFrom: [ta.from.errors.tropLoin] }, values };
  }
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc(
    "set_artisan_available_from",
    parsed.data > today ? { p_date: parsed.data } : {},
  );
  if (error) return { ...rpcError(error), values };
  refresh();
  return { success: ta.from.saved };
}

/** F-44 : horaires de la semaine, envoyés en JSON par l'éditeur ; remplacés en une fois. */
export async function saveHours(_prev: FormState, formData: FormData): Promise<FormState> {
  let raw: unknown;
  try {
    raw = JSON.parse(text(formData, "hours") ?? "");
  } catch {
    return { error: ta.hours.errors.format };
  }
  const parsed = hoursSchema.safeParse(raw);
  if (!parsed.success) return { error: ta.hours.errors.format };
  const issue = hoursErrors(parsed.data);
  if (issue) return { error: ta.hours.errors[issue] };
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("set_artisan_hours", { p_hours: parsed.data });
  if (error) return rpcError(error);
  refresh();
  return { success: ta.hours.saved };
}

/** F-44 : absence sur des journées entières (congés, formation, fermeture…). */
export async function addAbsence(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    startsOn: text(formData, "startsOn") ?? "",
    endsOn: text(formData, "endsOn") ?? "",
    label: text(formData, "label") ?? "",
  };
  const parsed = absenceSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const issue = absenceError(parsed.data.startsOn, parsed.data.endsOn, parisToday());
  if (issue) {
    const field = issue === "invalide" || issue === "trop_loin" ? "startsOn" : "endsOn";
    return { fieldErrors: { [field]: [ta.absences.errors[issue]] }, values };
  }
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("add_artisan_absence", {
    p_starts_on: parsed.data.startsOn,
    p_ends_on: parsed.data.endsOn,
    ...(parsed.data.label ? { p_label: parsed.data.label } : {}),
  });
  if (error) return { ...rpcError(error), values };
  refresh();
  return { success: ta.absences.added };
}

export async function deleteAbsence(id: string): Promise<FormState> {
  if (!z.uuid().safeParse(id).success) return { error: fr.errors.generic };
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("delete_artisan_absence", { p_id: id });
  if (error) return rpcError(error);
  refresh();
  return { success: ta.absences.removed };
}

/** F-44 : créneau bloqué sur une journée (n'est plus proposé pour les rendez-vous). */
export async function addBlockedSlot(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    date: text(formData, "date") ?? "",
    start: text(formData, "start") ?? "",
    end: text(formData, "end") ?? "",
    label: text(formData, "label") ?? "",
  };
  const parsed = blockedSlotSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const { date, start, end, label } = parsed.data;
  const issue = blockedSlotError(date, start, end, new Date());
  if (issue) {
    const field = issue === "ordre" ? "end" : "date";
    return { fieldErrors: { [field]: [t.block.errors[issue]] }, values };
  }
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("add_artisan_blocked_slot", {
    p_date: date,
    p_start: start,
    p_end: end,
    ...(label ? { p_label: label } : {}),
  });
  if (error) return { ...rpcError(error), values };
  refresh();
  return { success: t.block.added };
}

export async function deleteBlockedSlot(id: string): Promise<FormState> {
  if (!z.uuid().safeParse(id).success) return { error: fr.errors.generic };
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("delete_artisan_blocked_slot", { p_id: id });
  if (error) return rpcError(error);
  refresh();
  return { success: t.block.removed };
}

/** F-44 : crée le lien d'abonnement .ics, ou le remplace (l'ancien cesse de fonctionner). */
export async function renewCalendarFeed(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("renew_artisan_calendar_feed");
  if (error) return rpcError(error);
  refresh();
  return { success: text(formData, "renouveler") === "oui" ? ta.sync.renewed : ta.sync.created };
}

export async function disableCalendarFeed(): Promise<FormState> {
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("disable_artisan_calendar_feed");
  if (error) return rpcError(error);
  refresh();
  return { success: ta.sync.disabled };
}
