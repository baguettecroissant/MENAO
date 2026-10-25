import type { AccountantPeriod } from "@menao/core";
import type { AccountantSettings } from "@menao/validation";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type AccountantExportRow = {
  id: string;
  kind: "automatique" | "manuel";
  status: "envoye" | "echec";
  period_start: string;
  period_end: string;
  recipient: string;
  invoices_count: number | null;
  expenses_count: number | null;
  created_at: string;
};

export type AccountantView = {
  settings: {
    enabled: boolean;
    email: string;
    period: AccountantPeriod;
    include_invoices: boolean;
    include_expenses: boolean;
  } | null;
  exports: AccountantExportRow[];
};

/** Réglages et derniers envois (F-63), comme sur le site ; null en cas d'erreur. */
export async function loadAccountant(): Promise<AccountantView | null> {
  const [settings, exports] = await Promise.all([
    supabase
      .from("accountant_settings")
      .select("enabled, email, period, include_invoices, include_expenses")
      .maybeSingle(),
    supabase
      .from("accountant_exports")
      .select(
        "id, kind, status, period_start, period_end, recipient, invoices_count, expenses_count, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  if (settings.error || exports.error) return null;
  return { settings: settings.data, exports: exports.data ?? [] };
}

export async function saveAccountantSettings(settings: AccountantSettings): Promise<boolean> {
  const { error } = await supabase.rpc("artisan_save_accountant_settings", {
    p_enabled: settings.enabled,
    p_email: settings.email,
    p_period: settings.period,
    p_include_invoices: settings.includeInvoices,
    p_include_expenses: settings.includeExpenses,
  });
  return !error;
}

export type AccountantSendResult =
  | { status: "envoye"; period: string }
  | { status: "echec" | "no_settings" | "rate_limited" | "unavailable" };

/** « Envoyer maintenant » : dernière période complète, par l'Edge Function accountant-export. */
export async function sendAccountantExportNow(): Promise<AccountantSendResult> {
  const { data, error } = await supabase.functions.invoke<{ status: string; period?: string }>(
    "accountant-export",
    { body: { mode: "manuel" } },
  );
  let payload = data;
  if (error instanceof FunctionsHttpError) {
    payload = (await error.context.json().catch(() => null)) as typeof data;
  } else if (error) {
    payload = null;
  }
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
