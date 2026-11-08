import { SIGN_RATE_DAYS } from "./artisan-activity";

/**
 * Chiffres clés des onglets de la rubrique « Argent » (refonte « Nette », ADR 0247) : un bandeau
 * en tête de chaque liste. Calculs purs, montants en centimes ; mois et année au format de Paris
 * passés par l'appelant (`today` : AAAA-MM-JJ).
 */

/** Devis : à envoyer, en attente de signature (nombre et montant), taux de signature sur 6 mois. */
export function quoteFigures(
  quotes: readonly { status: string; totalTtcCents: number; sentAt: string | null }[],
  now: Date = new Date(),
): { toSendCount: number; pendingCount: number; pendingCents: number; signRate: number | null } {
  const since = now.getTime() - SIGN_RATE_DAYS * 86_400_000;
  // Comme le tableau de bord : les devis envoyés des 6 derniers mois, remplacés exclus.
  const recent = quotes.filter(
    (q) =>
      q.status !== "brouillon" &&
      q.status !== "remplace" &&
      q.sentAt !== null &&
      Date.parse(q.sentAt) >= since,
  );
  const pending = quotes.filter((q) => q.status === "envoye");
  return {
    toSendCount: quotes.filter((q) => q.status === "brouillon").length,
    pendingCount: pending.length,
    pendingCents: pending.reduce((sum, q) => sum + q.totalTtcCents, 0),
    signRate: recent.length
      ? Math.round((100 * recent.filter((q) => q.status === "signe").length) / recent.length)
      : null,
  };
}

/** Factures : facturé ce mois (montant, nombre) et depuis le début de l'année. */
export function invoiceFigures(
  invoices: readonly { issuedOn: string; totalTtcCents: number }[],
  today: string,
): { monthCents: number; monthCount: number; yearCents: number } {
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);
  const inMonth = invoices.filter((i) => i.issuedOn.slice(0, 7) === month);
  return {
    monthCents: inMonth.reduce((sum, i) => sum + i.totalTtcCents, 0),
    monthCount: inMonth.length,
    yearCents: invoices
      .filter((i) => i.issuedOn.slice(0, 4) === year)
      .reduce((sum, i) => sum + i.totalTtcCents, 0),
  };
}

/** Dépenses du mois : total TTC, TVA payée (récupérable si l'artisan y est assujetti), nombre. */
export function expenseMonthFigures(
  expenses: readonly { issuedOn: string; totalTtcCents: number; totalTvaCents: number }[],
  today: string,
): { monthCents: number; monthTvaCents: number; monthCount: number } {
  const month = today.slice(0, 7);
  const inMonth = expenses.filter((e) => e.issuedOn.slice(0, 7) === month);
  return {
    monthCents: inMonth.reduce((sum, e) => sum + e.totalTtcCents, 0),
    monthTvaCents: inMonth.reduce((sum, e) => sum + e.totalTvaCents, 0),
    monthCount: inMonth.length,
  };
}
