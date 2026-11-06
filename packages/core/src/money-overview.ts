/**
 * Suivi de l'argent de l'artisan (F-87, ADR 0237), agent comptable avancé : lecture défensive de
 * `my_money_overview` (chiffres du mois en cours et du précédent, tranches à encaisser, paiements
 * reçus sans facture), ancienneté d'une tranche due et palier de relance. Montants en centimes
 * (CLAUDE.md règle 5).
 */

export type MoneyMonth = {
  /** « 2026-11 ». */
  month: string;
  signedQuotes: number;
  signedCents: number;
  collectedCents: number;
  expensesCents: number;
  invoices: number;
};

export type MoneyOpenItem = {
  chantierId: string;
  chantier: string;
  kind: "acompte" | "solde";
  amountCents: number;
  /** Échéance : signature du devis (acompte) ou réception des travaux (solde). */
  since: string | null;
  /** Le dernier paiement de cette tranche a échoué. */
  failed: boolean;
};

export type MoneyPaidItem = {
  chantierId: string;
  chantier: string;
  kind: "acompte" | "solde";
  amountCents: number;
  paidAt: string | null;
};

export type MoneyOverview = {
  /** La formule comprend l'agent comptable avancé (Premium et Entreprise). */
  included: boolean;
  current: MoneyMonth;
  previous: MoneyMonth;
  open: MoneyOpenItem[];
  withoutInvoice: MoneyPaidItem[];
};

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const cents = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
const str = (value: unknown) => (typeof value === "string" ? value : "");
const kindOf = (value: unknown): "acompte" | "solde" => (value === "solde" ? "solde" : "acompte");

function month(raw: unknown): MoneyMonth {
  const m = record(raw);
  return {
    month: str(m.mois),
    signedQuotes: cents(m.devis_signes),
    signedCents: cents(m.devis_signes_cents),
    collectedCents: cents(m.encaisse_cents),
    expensesCents: cents(m.depenses_cents),
    invoices: cents(m.factures),
  };
}

export function parseMoneyOverview(raw: unknown): MoneyOverview | null {
  const r = record(raw);
  if (!("mois" in r)) return null;
  const list = (value: unknown) => (Array.isArray(value) ? value.map(record) : []);
  return {
    included: r.inclus === true,
    current: month(r.mois),
    previous: month(r.mois_precedent),
    open: list(r.a_encaisser)
      .filter((item) => str(item.chantier_id))
      .map((item) => ({
        chantierId: str(item.chantier_id),
        chantier: str(item.chantier),
        kind: kindOf(item.tranche),
        amountCents: cents(item.montant_cents),
        since: str(item.depuis) || null,
        failed: item.echec === true,
      })),
    withoutInvoice: list(r.sans_facture)
      .filter((item) => str(item.chantier_id))
      .map((item) => ({
        chantierId: str(item.chantier_id),
        chantier: str(item.chantier),
        kind: kindOf(item.tranche),
        amountCents: cents(item.montant_cents),
        paidAt: str(item.le) || null,
      })),
  };
}

/** Total à encaisser, en centimes. */
export function openTotalCents(items: readonly MoneyOpenItem[]): number {
  return items.reduce((sum, item) => sum + item.amountCents, 0);
}

/** Jours pleins écoulés depuis l'échéance (0 le jour même) ; null si inconnue. */
export function daysSince(since: string | null, now: Date): number | null {
  if (!since) return null;
  const at = Date.parse(since);
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.floor((now.getTime() - at) / 86_400_000));
}

/** Paliers des relances (ADR 0237) : J+7, J+15 et J+30 après l'échéance. */
export const MONEY_REMINDER_DAYS = [7, 15, 30] as const;

/** « recent » avant J+7, « a_relancer » ensuite, « en_retard » à partir de J+30. */
export function openItemLevel(days: number | null): "recent" | "a_relancer" | "en_retard" {
  if (days === null || days < MONEY_REMINDER_DAYS[0]) return "recent";
  return days >= MONEY_REMINDER_DAYS[2] ? "en_retard" : "a_relancer";
}

/** « 2026-11 » → « novembre » (ou « novembre 2026 » avec l'année). */
export function moneyMonthLabel(code: string, withYear = false): string {
  const match = /^(\d{4})-(\d{2})$/.exec(code);
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 15));
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(date);
}
