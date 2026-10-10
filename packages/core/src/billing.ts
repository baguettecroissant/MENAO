/**
 * Abonnement des artisans (F-15, Stripe Billing).
 * Fichier autonome (aucun import) : il est aussi importé par l'Edge Function stripe-webhook.
 */

/** 3 mois offerts (business plan) : période d'essai Stripe de 90 jours. */
export const TRIAL_DAYS = 90;

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "canceled",
  "paused",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/**
 * Abonnement qui donne accès au service : essai, actif, ou impayé en cours de relance par
 * Stripe (délai de grâce). Impayé définitif, résilié ou incomplet : pas d'accès.
 */
export function subscriptionGrantsAccess(status: SubscriptionStatus | null): boolean {
  return status === "trialing" || status === "active" || status === "past_due";
}

export type SubscriptionSnapshot = {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: SubscriptionStatus;
  lookupKey: string | null;
  artisanId: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const iso = (v: unknown) => (typeof v === "number" ? new Date(v * 1000).toISOString() : null);

/** Lit un objet « subscription » de Stripe (webhook ou API). Lecture défensive : sinon null. */
export function subscriptionFromStripe(input: unknown): SubscriptionSnapshot | null {
  if (!isObj(input) || input.object !== "subscription" || typeof input.id !== "string") return null;
  const status = input.status;
  if (typeof status !== "string" || !(SUBSCRIPTION_STATUSES as readonly string[]).includes(status))
    return null;

  const customer = isObj(input.customer) ? input.customer.id : input.customer;
  if (typeof customer !== "string") return null;

  const items = isObj(input.items) && Array.isArray(input.items.data) ? input.items.data : [];
  const item = isObj(items[0]) ? items[0] : {};
  const price = isObj(item.price) ? item.price : {};
  const metadata = isObj(input.metadata) ? input.metadata : {};

  return {
    stripeSubscriptionId: input.id,
    stripeCustomerId: customer,
    status: status as SubscriptionStatus,
    lookupKey: typeof price.lookup_key === "string" ? price.lookup_key : null,
    artisanId: typeof metadata.artisan_id === "string" ? metadata.artisan_id : null,
    // Depuis l'API 2025-03-31, la fin de période est portée par l'élément d'abonnement.
    currentPeriodEnd: iso(item.current_period_end) ?? iso(input.current_period_end),
    trialEnd: iso(input.trial_end),
    cancelAtPeriodEnd: input.cancel_at_period_end === true,
  };
}

/**
 * Simulation de la page Espace Pro : commission qu'une plateforme prélèverait sur un montant
 * mensuel de chantiers, comparée à l'abonnement MENAO (montants en centimes, taux en points de
 * base). Indicatif : les frais de paiement Stripe restent à la charge de l'artisan dans les deux cas.
 */
export function commissionComparison(input: {
  monthlyRevenueCents: number;
  commissionRateBp: number;
  subscriptionCents: number;
}): { commissionCents: number; monthlySavingCents: number; yearlySavingCents: number } {
  const commissionCents = Math.round((input.monthlyRevenueCents * input.commissionRateBp) / 10_000);
  const monthlySavingCents = commissionCents - input.subscriptionCents;
  return { commissionCents, monthlySavingCents, yearlySavingCents: monthlySavingCents * 12 };
}
