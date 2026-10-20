/**
 * Aperçu du compte Stripe de l'artisan (ADR 0152), en lecture seule : solde, virements vers sa
 * banque, calendrier des virements, compte bancaire et frais Stripe du mois. Les paiements des
 * chantiers sont faits directement sur son compte (ADR 0011) : MENAO lit, ne déplace rien.
 * Fichier autonome (aucun import) : importé par l'Edge Function connect-overview. Montants en
 * centimes, en euros seulement.
 */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown): Obj[] => (isObj(v) && Array.isArray(v.data) ? v.data.filter(isObj) : []);
const cents = (v: unknown): number => (typeof v === "number" && Number.isInteger(v) ? v : 0);
const isEur = (o: Obj) => o.currency === "eur";

const parisDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" });

export type PayoutStatus = "pending" | "in_transit" | "paid" | "failed" | "canceled";
export type Payout = { amountCents: number; arrivalDate: string; status: PayoutStatus };
export type PayoutSchedule = {
  interval: "daily" | "weekly" | "monthly" | "manual";
  delayDays: number | null;
  weeklyAnchor: string | null;
  monthlyAnchor: number | null;
};

export type ConnectOverview = {
  availableCents: number;
  pendingCents: number;
  /** Le prochain virement attendu sur le compte bancaire (en attente ou en route). */
  nextPayout: Payout | null;
  /** Les derniers virements, du plus récent au plus ancien (5 au plus). */
  recentPayouts: Payout[];
  schedule: PayoutSchedule | null;
  bank: { name: string | null; last4: string } | null;
  feesThisMonthCents: number;
};

const PAYOUT_STATUSES: readonly PayoutStatus[] = [
  "pending",
  "in_transit",
  "paid",
  "failed",
  "canceled",
];
const INTERVALS: readonly PayoutSchedule["interval"][] = ["daily", "weekly", "monthly", "manual"];

function payout(o: Obj): Payout | null {
  if (!isEur(o) || typeof o.arrival_date !== "number") return null;
  const status = PAYOUT_STATUSES.find((s) => s === o.status);
  if (!status) return null;
  return {
    amountCents: cents(o.amount),
    arrivalDate: parisDay.format(new Date(o.arrival_date * 1000)),
    status,
  };
}

function schedule(account: unknown): PayoutSchedule | null {
  if (!isObj(account) || !isObj(account.settings) || !isObj(account.settings.payouts)) return null;
  const s = account.settings.payouts.schedule;
  if (!isObj(s)) return null;
  const interval = INTERVALS.find((i) => i === s.interval);
  if (!interval) return null;
  return {
    interval,
    delayDays: typeof s.delay_days === "number" ? s.delay_days : null,
    weeklyAnchor:
      interval === "weekly" && typeof s.weekly_anchor === "string" ? s.weekly_anchor : null,
    monthlyAnchor:
      interval === "monthly" && typeof s.monthly_anchor === "number" ? s.monthly_anchor : null,
  };
}

function bank(account: unknown): ConnectOverview["bank"] {
  if (!isObj(account)) return null;
  const banks = list(account.external_accounts).filter(
    (b) => b.object === "bank_account" && typeof b.last4 === "string",
  );
  const chosen = banks.find((b) => b.default_for_currency === true && isEur(b)) ?? banks[0];
  if (!chosen) return null;
  return {
    name: typeof chosen.bank_name === "string" ? chosen.bank_name : null,
    last4: chosen.last4 as string,
  };
}

/** Lit les réponses Stripe (balance, payouts, account, balance_transactions du mois). */
export function connectOverviewFromStripe(input: {
  balance: unknown;
  payouts: unknown;
  account: unknown;
  transactions: unknown;
}): ConnectOverview {
  const sum = (v: unknown) =>
    (Array.isArray(v) ? v.filter(isObj) : [])
      .filter(isEur)
      .reduce((t, b) => t + cents(b.amount), 0);
  const balanceObj = isObj(input.balance) ? input.balance : {};
  const recentPayouts = list(input.payouts)
    .map(payout)
    .filter((p): p is Payout => p !== null)
    .sort((a, b) => (a.arrivalDate < b.arrivalDate ? 1 : a.arrivalDate > b.arrivalDate ? -1 : 0))
    .slice(0, 5);
  const upcoming = recentPayouts
    .filter((p) => p.status === "pending" || p.status === "in_transit")
    .sort((a, b) => (a.arrivalDate < b.arrivalDate ? -1 : a.arrivalDate > b.arrivalDate ? 1 : 0));
  return {
    availableCents: sum(balanceObj.available),
    pendingCents: sum(balanceObj.pending),
    nextPayout: upcoming[0] ?? null,
    recentPayouts,
    schedule: schedule(input.account),
    bank: bank(input.account),
    feesThisMonthCents: list(input.transactions)
      .filter(isEur)
      .reduce((t, tx) => t + cents(tx.fee), 0),
  };
}

/** Début du mois en cours à Paris, en secondes Unix (filtre des frais du mois). */
export function parisMonthStart(now: Date): number {
  const [year, month] = parisDay.format(now).split("-").map(Number) as [number, number];
  // Minuit à Paris = 22 h ou 23 h UTC la veille : on cherche l'heure UTC qui tombe le 1er à 0 h.
  for (const offset of [2, 1]) {
    const candidate = new Date(Date.UTC(year, month - 1, 1, -offset));
    const hour = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(candidate);
    if (
      parisDay.format(candidate) === `${year}-${String(month).padStart(2, "0")}-01` &&
      hour === "00"
    ) {
      return candidate.getTime() / 1000;
    }
  }
  return Date.UTC(year, month - 1, 1) / 1000;
}

/** Encaissé via MENAO (acomptes et soldes payés) : ce mois et depuis le 1er janvier, à Paris. */
export function collectedTotals(
  payments: readonly { amountCents: number; paidAt: string | null }[],
  today: string,
): { monthCents: number; yearCents: number } {
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);
  let monthCents = 0;
  let yearCents = 0;
  for (const p of payments) {
    if (!p.paidAt) continue;
    const day = parisDay.format(new Date(p.paidAt));
    if (day > today) continue;
    if (day.startsWith(year)) yearCents += p.amountCents;
    if (day.startsWith(month)) monthCents += p.amountCents;
  }
  return { monthCents, yearCents };
}
