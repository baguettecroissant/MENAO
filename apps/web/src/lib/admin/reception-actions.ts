"use server";

import { hoursErrors } from "@menao/core";
import { hoursSchema, receptionClosuresSchema } from "@menao/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { checkbox, text, type FormState } from "@/lib/auth/form";
import { requireAdmin } from "./guard";
import { getReception } from "./reception";

const t = fr.admin.tickets.reception;
const errors = fr.pro.agenda.availability.hours.errors;

const dbError = (error: { code: string; message: string }): FormState => ({
  error: error.code === "22023" ? error.message : fr.errors.generic,
});

type Saved = {
  hours: z.output<typeof hoursSchema>;
  closedDates: string[];
  holidaysClosed: boolean;
};

/** La base enregistre tout le réglage en une fois : ce qui ne change pas est repris tel quel. */
async function save(change: (current: Saved) => Saved): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const reception = await getReception(supabase);
  if (!reception) return { error: fr.errors.generic };
  const next = change(reception.settings);
  const { error } = await supabase.rpc("admin_save_reception_settings", {
    p_hours: next.hours.map((h) => ({ jour: h.weekday, debut: h.start, fin: h.end })),
    p_closed_dates: next.closedDates,
    p_holidays_closed: next.holidaysClosed,
  });
  if (error) return dbError(error);
  revalidatePath("/admin/tickets");
  return { success: t.saved };
}

/** Plages de la semaine (même éditeur et mêmes contrôles que l'agenda des artisans). */
export async function saveReceptionHours(_prev: FormState, formData: FormData): Promise<FormState> {
  let raw: unknown;
  try {
    raw = JSON.parse(text(formData, "hours") ?? "");
  } catch {
    return { error: errors.format };
  }
  const parsed = hoursSchema.safeParse(raw);
  if (!parsed.success) return { error: errors.format };
  const issue = hoursErrors(parsed.data);
  if (issue) return { error: errors[issue] };
  return save((current) => ({ ...current, hours: parsed.data }));
}

/** Fermetures exceptionnelles et jours fériés. */
export async function saveReceptionClosures(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = { fermetures: text(formData, "fermetures") ?? "" };
  const parsed = receptionClosuresSchema.safeParse({
    ...values,
    feries: checkbox(formData, "feries"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  return save((current) => ({
    ...current,
    closedDates: parsed.data.closedDates,
    holidaysClosed: parsed.data.holidaysClosed,
  }));
}
