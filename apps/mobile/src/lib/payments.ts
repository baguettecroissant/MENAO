import {
  collectedTotals,
  connectAccountStatus,
  connectRequirementGroups,
  connectTokenId,
  connectTokenRequest,
  parisToday,
  type ConnectAccountStatus,
  type ConnectAccountTokenData,
  type ConnectPersonTokenData,
  type ConnectTokenPrefill,
  type ConnectTokens,
  type ConnectOverview,
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
  /** Compte actif : solde et virements lus chez Stripe, encaissé via MENAO (ADR 0152). */
  money: Money | null;
};

export type Money = {
  /** Null si Stripe ne répond pas : l'écran le dit, sans bloquer le reste. */
  overview: ConnectOverview | null;
  collected: { monthCents: number; yearCents: number };
};

/** Solde, virements et frais du mois (connect-overview), avec l'encaissé via MENAO. */
async function loadMoney(): Promise<Money> {
  const [overview, payments] = await Promise.all([
    supabase.functions.invoke<{ status: string; overview?: ConnectOverview }>("connect-overview", {
      body: {},
    }),
    supabase.from("payments").select("amount_cents, paid_at").eq("status", "paye"),
  ]);
  return {
    overview: overview.data?.overview ?? null,
    collected: collectedTotals(
      (payments.data ?? []).map((p) => ({ amountCents: p.amount_cents, paidAt: p.paid_at })),
      parisToday(),
    ),
  };
}

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
  const status = connectAccountStatus({
    hasAccount: a.stripe_account_id !== null,
    chargesEnabled: a.connect_charges_enabled,
    detailsSubmitted: a.connect_details_submitted,
    requirementsDue: a.connect_requirements_due,
    requirementsPending: a.connect_requirements_pending,
    disabledReason: a.connect_disabled_reason,
  });
  const validated = a.status === "valide" || a.status === "suspendu";
  return {
    validated,
    status,
    payoutsEnabled: a.connect_payouts_enabled,
    due: connectRequirementGroups(a.connect_requirements_due),
    pending: connectRequirementGroups(a.connect_requirements_pending),
    deadline: a.connect_requirements_deadline,
    money: validated && status === "actif" ? await loadMoney() : null,
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

async function createToken(
  publishableKey: string,
  kind: "account" | "person",
  data: ConnectAccountTokenData | ConnectPersonTokenData | null,
): Promise<string | undefined> {
  if (!data) return undefined;
  try {
    const { url, init } = connectTokenRequest(publishableKey, kind, data);
    const response = await fetch(url, init);
    return connectTokenId(kind, await response.json()) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Avant la création du compte : jetons Stripe du pré-remplissage, créés par l'application avec la
 * clé publique (ADR 0204). Un échec laisse l'artisan saisir ces informations chez Stripe.
 */
async function connectTokens(): Promise<ConnectTokens> {
  const { data } = await supabase.functions.invoke<{
    status: string;
    prefill?: ConnectTokenPrefill | null;
  }>("connect-onboarding", { body: { action: "prefill" } });
  const prefill = data?.status === "ok" ? data.prefill : null;
  if (!prefill) return {};
  const [accountToken, personToken] = await Promise.all([
    createToken(prefill.publishableKey, "account", prefill.account),
    createToken(prefill.publishableKey, "person", prefill.person),
  ]);
  return { accountToken, personToken };
}

/**
 * Lien d'inscription Stripe, avec retour dans l'application (page de retour du site).
 * `prefill` : premier passage, le compte va être créé et pré-rempli.
 */
export async function startConnect(prefill = false): Promise<{ url: string } | { error: string }> {
  const tokens = prefill ? await connectTokens().catch(() => ({})) : {};
  const { data, error } = await supabase.functions.invoke<{ status: string; url?: string }>(
    "connect-onboarding",
    { body: { action: "link", origin: env.siteUrl, app: true, ...tokens } },
  );
  if (error || !data?.url) return { error: await failure(error) };
  return { url: data.url };
}

/** Relit l'état du compte auprès de Stripe, sans attendre le webhook (retour de Stripe). */
export async function refreshConnect(): Promise<void> {
  await supabase.functions.invoke("connect-onboarding", { body: { action: "refresh" } });
}
