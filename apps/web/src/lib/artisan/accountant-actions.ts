"use server";

import { accountantSettingsSchema } from "@menao/validation";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { checkbox, text, type FormState } from "@/lib/auth/form";
import { requireArtisan } from "./requests";

const t = fr.pro.accountant;

/** Réglages de l'envoi au comptable (F-63) : adresse, rythme, parties envoyées. */
export async function saveAccountantSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = {
    email: text(formData, "email") ?? "",
    period: text(formData, "period") ?? "",
    enabled: checkbox(formData, "enabled") ? "on" : "",
    includeInvoices: checkbox(formData, "includeInvoices") ? "on" : "",
    includeExpenses: checkbox(formData, "includeExpenses") ? "on" : "",
  };
  const parsed = accountantSettingsSchema.safeParse({
    email: values.email,
    period: values.period,
    enabled: values.enabled === "on",
    includeInvoices: values.includeInvoices === "on",
    includeExpenses: values.includeExpenses === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("artisan_save_accountant_settings", {
    p_enabled: parsed.data.enabled,
    p_email: parsed.data.email,
    p_period: parsed.data.period,
    p_include_invoices: parsed.data.includeInvoices,
    p_include_expenses: parsed.data.includeExpenses,
  });
  if (error) return { error: fr.errors.generic, values };
  revalidatePath("/pro/comptable");
  return { success: t.saved, values };
}

export type AccountantSendResult =
  { status: "envoye"; period: string } | { status: keyof typeof t.sendErrors };

/**
 * « Envoyer maintenant » : export de la dernière période complète, préparé et envoyé par l'Edge
 * Function accountant-export avec le jeton de l'artisan.
 */
export async function sendAccountantExportNow(): Promise<AccountantSendResult> {
  const { supabase } = await requireArtisan();
  const { data, error } = await supabase.functions.invoke<{ status: string; period?: string }>(
    "accountant-export",
    { method: "POST", body: { mode: "manuel" } },
  );
  let payload = data;
  if (error instanceof FunctionsHttpError) {
    payload = (await error.context.json().catch(() => null)) as typeof data;
  } else if (error) {
    payload = null;
  }
  revalidatePath("/pro/comptable");
  if (payload?.status === "envoye" && payload.period) {
    return { status: "envoye", period: payload.period };
  }
  const status = payload?.status;
  return {
    status:
      status === "no_settings" || status === "rate_limited" || status === "echec"
        ? status
        : "unavailable",
  };
}
