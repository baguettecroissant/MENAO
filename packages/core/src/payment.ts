/**
 * Paiements des chantiers (F-30 à F-32) : directement sur le compte Stripe de l'artisan, sans
 * commission (ADR 0011, CLAUDE.md règle 12). Logique pure, aussi chargée par Deno.
 */

export const PAYMENT_KINDS = ["acompte", "solde"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

export const PAYMENT_STATUSES = ["en_attente", "en_cours", "paye", "echoue", "annule"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * État d'un paiement d'après un événement Stripe Checkout (compte de l'artisan). Paiement
 * différé (virement, prélèvement) : « en_cours » jusqu'à la réception effective des fonds.
 */
export function paymentStatusFromCheckout(
  eventType: string,
  paymentStatus: string | null | undefined,
): PaymentStatus | null {
  switch (eventType) {
    case "checkout.session.completed":
      if (paymentStatus === "paid") return "paye";
      return paymentStatus === "unpaid" ? "en_cours" : null;
    case "checkout.session.async_payment_succeeded":
      return "paye";
    case "checkout.session.async_payment_failed":
      return "echoue";
    case "checkout.session.expired":
      return "annule";
    default:
      return null;
  }
}

const parisMonth = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
});

/** Montant encaissé pendant le mois en cours, heure de Paris (paiements reçus, en centimes). */
export function collectedThisMonth(
  payments: readonly { amountCents: number; paidAt: string | null }[],
  now: Date,
): number {
  const month = parisMonth.format(now);
  return payments.reduce(
    (sum, p) =>
      p.paidAt && parisMonth.format(new Date(p.paidAt)) === month ? sum + p.amountCents : sum,
    0,
  );
}
