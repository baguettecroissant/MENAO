import {
  connectAccountStatus,
  connectRequirementGroups,
  type ConnectAccountStatus,
  type ConnectRequirementGroup,
} from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { fr } from "@/i18n/fr";
import { env } from "./env";
import { supabase } from "./supabase";

/**
 * Compte de paiement Stripe de l'artisan (ADR 0124), comme l'étape « Paiements » du site : état du
 * compte (connectAccountStatus) et rubriques que Stripe attend encore. Paiements directs sur le
 * compte de l'artisan, sans commission MENAO (CLAUDE.md règle 12).
 */
export type Payments = {
  validated: boolean;
  status: ConnectAccountStatus;
  payoutsEnabled: boolean;
  due: ConnectRequirementGroup[];
  pending: ConnectRequirementGroup[];
  deadline: string | null;
};

export async function loadPayments(): Promise<Payments | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: a } = await supabase
    .from("artisans")
    .select(
      "status, stripe_account_id, connect_charges_enabled, connect_payouts_enabled, connect_details_submitted, connect_requirements_due, connect_requirements_pending, connect_requirements_deadline, connect_disabled_reason",
    )
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!a) return null;
  return {
    validated: a.status === "valide" || a.status === "suspendu",
    status: connectAccountStatus({
      hasAccount: a.stripe_account_id !== null,
      chargesEnabled: a.connect_charges_enabled,
      detailsSubmitted: a.connect_details_submitted,
      requirementsDue: a.connect_requirements_due,
      requirementsPending: a.connect_requirements_pending,
      disabledReason: a.connect_disabled_reason,
    }),
    payoutsEnabled: a.connect_payouts_enabled,
    due: connectRequirementGroups(a.connect_requirements_due),
    pending: connectRequirementGroups(a.connect_requirements_pending),
    deadline: a.connect_requirements_deadline,
  };
}

async function failure(error: unknown): Promise<string> {
  const t = fr.proPayments.errors;
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { status?: string } | null;
    const message = body?.status ? t[body.status] : undefined;
    if (message) return message;
  }
  return t.unavailable ?? fr.errors.generic;
}

/** Lien d'inscription Stripe, avec retour dans l'application (page de retour du site). */
export async function startConnect(): Promise<{ url: string } | { error: string }> {
  const { data, error } = await supabase.functions.invoke<{ status: string; url?: string }>(
    "connect-onboarding",
    { body: { action: "link", origin: env.siteUrl, app: true } },
  );
  if (error || !data?.url) return { error: await failure(error) };
  return { url: data.url };
}

/** Relit l'état du compte auprès de Stripe, sans attendre le webhook (retour de Stripe). */
export async function refreshConnect(): Promise<void> {
  await supabase.functions.invoke("connect-onboarding", { body: { action: "refresh" } });
}
