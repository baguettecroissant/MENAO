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

const parisDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Montant encaissé du 1er du mois à aujourd'hui, et pendant la même période du mois précédent,
 * heure de Paris (F-16 « chiffre généré ce mois et évolution ») : comparer un mois entamé à un
 * mois complet donnerait une baisse trompeuse en début de mois. Le dernier jour du mois précédent
 * borne la comparaison (31 mars ↔ 1er au 28 février). Paiements reçus, en centimes.
 */
export function monthToDateRevenue(
  payments: readonly { amountCents: number; paidAt: string | null }[],
  now: Date,
): { currentCents: number; previousCents: number; previousMonth: string } {
  const today = parisDay.format(now);
  const [year, month, day] = today.split("-").map(Number) as [number, number, number];
  const previousMonth = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
  const previousLastDay = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  const previousCutoff = `${previousMonth}-${String(Math.min(day, previousLastDay)).padStart(2, "0")}`;
  const currentMonth = today.slice(0, 7);
  let currentCents = 0;
  let previousCents = 0;
  for (const p of payments) {
    if (!p.paidAt) continue;
    const paidOn = parisDay.format(new Date(p.paidAt));
    if (paidOn.startsWith(currentMonth) && paidOn <= today) currentCents += p.amountCents;
    else if (paidOn.startsWith(previousMonth) && paidOn <= previousCutoff) {
      previousCents += p.amountCents;
    }
  }
  return { currentCents, previousCents, previousMonth };
}

export type RevenueTrend =
  | { kind: "hausse" | "baisse" | "stable"; percent: number }
  | { kind: "nouveau"; deltaCents: number }
  | null;

/** Évolution en % (arrondi) ; sans encaissement le mois précédent, le montant gagné. */
export function revenueTrend(currentCents: number, previousCents: number): RevenueTrend {
  if (previousCents === 0) {
    return currentCents > 0 ? { kind: "nouveau", deltaCents: currentCents } : null;
  }
  const percent = Math.round(((currentCents - previousCents) / previousCents) * 100);
  if (percent === 0) return { kind: "stable", percent: 0 };
  return { kind: percent > 0 ? "hausse" : "baisse", percent: Math.abs(percent) };
}

/**
 * Conseil au client (ADR 0158, plan anti-problèmes A6) : ne pas verser plus de 30 % d'acompte
 * avant le début des travaux. Pourcentage de la tranche à la signature au-delà de ce seuil, sinon
 * null.
 */
export const DEPOSIT_ADVICE_MAX_PERCENT = 30;

export function depositAboveAdvice(
  schedule: readonly { percent: number; trigger: "signature" | "reception" }[],
): number | null {
  const deposit = schedule.find((s) => s.trigger === "signature")?.percent ?? 0;
  return deposit > DEPOSIT_ADVICE_MAX_PERCENT ? deposit : null;
}
