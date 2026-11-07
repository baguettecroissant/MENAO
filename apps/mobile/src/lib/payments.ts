import {
  collectedTotals,
  connectAccountStatus,
  connectOnboardingOpen,
  connectRequirementGroups,
  connectTokenId,
  connectTokenRequest,
  parisToday,
  type ConnectAccountStatus,
  type ConnectAccountTokenData,
  type ConnectBankAccountTokenData,
  type ConnectPersonTokenData,
  type ConnectTokenData,
  type ConnectTokenKind,
  type ConnectTokenPrefill,
  type ConnectTokens,
  type ConnectOverview,
  type ConnectRequirementGroup,
} from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { fr } from "@/i18n/fr";
import { env } from "./env";
import { supabase } from "./supabase";
import { myArtisanKey } from "./team";

/**
 * Compte de paiement Stripe de l'artisan (ADR 0124), comme l'étape « Paiements » du site : état du
 * compte (connectAccountStatus) et rubriques que Stripe attend encore. Ouvert dès l'envoi du
 * dossier (ADR 0215). Paiements directs sur le compte de l'artisan, sans commission MENAO
 * (CLAUDE.md règle 12).
 */
export type Payments = {
  /** Dossier envoyé ou validé : le compte de paiement peut être configuré (ADR 0215). */
  open: boolean;
  status: ConnectAccountStatus;
  payoutsEnabled: boolean;
  due: ConnectRequirementGroup[];
  pending: ConnectRequirementGroup[];
  deadline: string | null;
  /** Compte actif : solde et virements lus chez Stripe, encaissé via MENAO (ADR 0152). */
  money: Money | null;
  /** Avant la création du compte : de quoi pré-remplir Stripe (ADR 0204, ADR 0215). */
  prefill: ConnectTokenPrefill | null;
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
    .eq("id", await myArtisanKey())
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
  const open = connectOnboardingOpen(a.status);
  const [money, prefill] = await Promise.all([
    open && status === "actif" ? loadMoney() : null,
    open && status === "a_demarrer" ? loadPrefill().catch(() => null) : null,
  ]);
  return {
    open,
    status,
    payoutsEnabled: a.connect_payouts_enabled,
    due: connectRequirementGroups(a.connect_requirements_due),
    pending: connectRequirementGroups(a.connect_requirements_pending),
    deadline: a.connect_requirements_deadline,
    money,
    prefill,
  };
}

/**
 * Avant la création du compte : données d'identité à transformer en jetons avec la clé publique
 * (ADR 0204), et de quoi présenter le formulaire des compléments (ADR 0215).
 */
async function loadPrefill(): Promise<ConnectTokenPrefill | null> {
  const { data } = await supabase.functions.invoke<{
    status: string;
    prefill?: ConnectTokenPrefill | null;
  }>("connect-onboarding", { body: { action: "prefill" } });
  return data?.status === "ok" ? (data.prefill ?? null) : null;
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
  kind: ConnectTokenKind,
  data: ConnectAccountTokenData | ConnectPersonTokenData | ConnectBankAccountTokenData | null,
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
 * Jetons Stripe du pré-remplissage, créés par l'application avec la clé publique (ADR 0204,
 * ADR 0215) : identité et IBAN vont directement à Stripe, sans passer par MENAO. Un échec laisse
 * l'artisan les saisir chez Stripe.
 */
export async function createConnectTokens(
  publishableKey: string,
  data: ConnectTokenData,
): Promise<ConnectTokens> {
  const [accountToken, personToken, bankToken] = await Promise.all([
    createToken(publishableKey, "account", data.account),
    createToken(publishableKey, "person", data.person),
    createToken(publishableKey, "bank_account", data.bankAccount),
  ]);
  return { accountToken, personToken, bankToken };
}

/**
 * Crée le compte Stripe, pré-rempli par les jetons et le site web (ou la page Facebook ou
 * Instagram) saisi, avant le formulaire Stripe intégré.
 */
export async function createConnect(
  tokens: ConnectTokens,
  website: string | null = null,
): Promise<{ error: string } | null> {
  const { error } = await supabase.functions.invoke("connect-onboarding", {
    body: { action: "create", ...tokens, website },
  });
  return error ? { error: await failure(error) } : null;
}

/**
 * Session du formulaire Stripe intégré à l'application (ADR 0215) : secret à durée courte, propre
 * au compte de l'artisan connecté, et clé publique. Une nouvelle à chaque ouverture et expiration.
 */
export async function openConnectSession(): Promise<
  { clientSecret: string; publishableKey: string } | { error: string }
> {
  const { data, error } = await supabase.functions.invoke<{
    status: string;
    clientSecret?: string;
    publishableKey?: string;
  }>("connect-onboarding", { body: { action: "session" } });
  if (error || !data?.clientSecret || !data.publishableKey) return { error: await failure(error) };
  return { clientSecret: data.clientSecret, publishableKey: data.publishableKey };
}

/**
 * Lien d'inscription sur le site de Stripe, avec retour dans l'application (page de retour du
 * site) : secours du formulaire intégré, quand il ne se charge pas.
 */
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
