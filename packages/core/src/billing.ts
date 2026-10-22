/**
 * Abonnement des artisans (F-15, Stripe Billing).
 * Fichier autonome (aucun import) : il est aussi importé par l'Edge Function stripe-webhook.
 */

/** 2 mois offerts (décision des associés du 22 octobre 2026, ADR 0153) : essai Stripe de 60 jours. */
export const TRIAL_DAYS = 60;

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
  /** Fin effective de l'abonnement (résilié), pour dater les résiliations (ADR 0051). */
  endedAt: string | null;
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
    endedAt: iso(input.ended_at),
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

/**
 * Facture d'abonnement réellement payée (F-59) : premier paiement après l'essai, qui déclenche la
 * prime du prescripteur. Abonnement lu dans `parent.subscription_details` (API Stripe récente) ou
 * dans l'ancien champ `subscription`. Facture à 0 € (essai) ou non payée : null.
 */
export function paidSubscriptionInvoice(
  input: unknown,
): { stripeSubscriptionId: string; amountPaidCents: number } | null {
  if (!isObj(input) || input.object !== "invoice" || input.status !== "paid") return null;
  const amount = input.amount_paid;
  if (typeof amount !== "number" || amount <= 0) return null;
  const parent = isObj(input.parent) ? input.parent : {};
  const details = isObj(parent.subscription_details) ? parent.subscription_details : {};
  const subscription =
    typeof details.subscription === "string"
      ? details.subscription
      : typeof input.subscription === "string"
        ? input.subscription
        : null;
  return subscription ? { stripeSubscriptionId: subscription, amountPaidCents: amount } : null;
}

/** Coupon Stripe « 1 mois offert » du parrainage (F-60), créé par `pnpm stripe:setup`. */
export const REFERRAL_COUPON_ID = "menao-parrainage-1-mois";

/** Abonnement d'une facture payée, quel que soit son montant (un mois offert donne 0 €). */
export function invoiceSubscriptionId(input: unknown): string | null {
  if (!isObj(input) || input.object !== "invoice" || input.status !== "paid") return null;
  const parent = isObj(input.parent) ? input.parent : {};
  const details = isObj(parent.subscription_details) ? parent.subscription_details : {};
  if (typeof details.subscription === "string") return details.subscription;
  return typeof input.subscription === "string" ? input.subscription : null;
}

/** Coupon d'une remise Stripe : `source.coupon` (API récente) ou `coupon` (ancien format). */
function discountCoupon(discount: unknown): string | null {
  if (!isObj(discount)) return null;
  const source = isObj(discount.source) ? discount.source : {};
  if (typeof source.coupon === "string") return source.coupon;
  if (isObj(source.coupon) && typeof source.coupon.id === "string") return source.coupon.id;
  if (typeof discount.coupon === "string") return discount.coupon;
  if (isObj(discount.coupon) && typeof discount.coupon.id === "string") return discount.coupon.id;
  return null;
}

/**
 * Mois offert à poser sur un abonnement (F-60, ADR 0137), lu avec ses remises développées :
 * - aucun mois offert en attente : l'appliquer, en gardant les autres remises ;
 * - le mois offert en attente est ce crédit (nouvel essai du webhook) : déjà appliqué ;
 * - un autre mois offert attend la prochaine facture : patienter, il sera posé après elle.
 * Le crédit en cours est noté dans les métadonnées de l'abonnement (`menao_free_month_grant`).
 */
export function freeMonthAction(
  subscription: unknown,
  grantId: string,
): { action: "apply"; keep: string[] } | { action: "already_applied" } | { action: "wait" } {
  if (!isObj(subscription) || subscription.object !== "subscription") return { action: "wait" };
  const discounts = Array.isArray(subscription.discounts) ? subscription.discounts : [];
  if (discounts.some((d) => discountCoupon(d) === REFERRAL_COUPON_ID)) {
    const metadata = isObj(subscription.metadata) ? subscription.metadata : {};
    return metadata.menao_free_month_grant === grantId
      ? { action: "already_applied" }
      : { action: "wait" };
  }
  const keep = discounts.flatMap((d) => (isObj(d) && typeof d.id === "string" ? [d.id] : []));
  return { action: "apply", keep };
}
