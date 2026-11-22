/**
 * Engagement de l'abonnement artisan (F-184, ADR 0383, décisions du 20 novembre 2026) : essai de
 * 60 jours à partir de la mise en ligne de la fiche, puis 12 mois fermes à compter du premier
 * paiement, reconduits tacitement par périodes de 12 mois. L'artisan arrête au plus tard 3 mois
 * avant l'échéance ; aucune sortie en cours de période. Les calculs portent sur des jours civils
 * à l'heure de Paris, au format AAAA-MM-JJ.
 * Fichier autonome (aucun import) : il est aussi importé par les Edge Functions.
 */

export const TERM_PERIOD_MONTHS = 12;
/** Préavis : l'arrêt se demande au plus tard 3 mois avant l'échéance. */
export const CANCEL_NOTICE_MONTHS = 3;
/** Rappel de reconduction : 30 jours avant la date limite d'arrêt (soit environ 4 mois avant). */
export const RENEWAL_REMINDER_DAYS = 30;
/** Rappels de fin d'essai, en jours avant le premier paiement. */
export const TRIAL_REMINDER_DAYS = [7, 1] as const;
/** Essai gratuit, à partir de la mise en ligne (même durée que `TRIAL_DAYS` de billing.ts). */
export const GO_LIVE_TRIAL_DAYS = 60;
/** Version du texte de la case d'engagement, conservée avec la preuve d'acceptation. */
export const TERM_TEXT_VERSION = "2026-11-20";
/**
 * Case d'engagement de l'inscription, distincte de l'acceptation des conditions de vente (CGV,
 * article 6). Texte affiché et texte conservé avec la preuve : une seule source.
 */
export const TERM_CHECKBOX = {
  lead: "Je m'engage pour douze mois à compter de mon premier paiement, à la fin de mon essai gratuit de deux mois.",
  detail: "Je peux renoncer sans frais à tout moment pendant l'essai.",
} as const;
export const TERM_CHECKBOX_TEXT = `${TERM_CHECKBOX.lead} ${TERM_CHECKBOX.detail}`;
/** Version des conditions de vente acceptées : version provisoire publiée, en attente de l'avocat (TODO(legal)). */
export const CGV_VERSION = "2026-11-22-provisoire";

const DAY_MS = 86_400_000;

function parts(day: string): [number, number, number] {
  const [y, m, d] = day.split("-").map(Number);
  return [y ?? 0, m ?? 1, d ?? 1];
}
const ymd = (y: number, m: number, d: number) =>
  `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Jour civil à Paris d'un instant (ISO ou Date). */
export function parisDay(at: string | Date): string {
  const date = typeof at === "string" ? new Date(at) : at;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addEngagementDays(day: string, n: number): string {
  const [y, m, d] = parts(day);
  const t = new Date(Date.UTC(y, m - 1, d) + n * DAY_MS);
  return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Ajoute des mois ; un jour qui n'existe pas dans le mois d'arrivée devient le dernier du mois. */
export function addEngagementMonths(day: string, n: number): string {
  const [y, m, d] = parts(day);
  const index = y * 12 + (m - 1) + n;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return ymd(year, month, Math.min(d, last));
}

/** Minuit (début du jour) à Paris, pour une date de fin transmise à Stripe. */
export function parisMidnight(day: string): Date {
  const [y, m, d] = parts(day);
  const guess = Date.UTC(y, m - 1, d);
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(guess));
  const get = (type: string) => Number(p.find((x) => x.type === type)?.value ?? 0);
  const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(guess - (wall - guess));
}

/** Fin de l'essai quand la fiche est mise en ligne. */
export function trialEndAfterGoLive(goLive: Date): Date {
  return new Date(goLive.getTime() + GO_LIVE_TRIAL_DAYS * DAY_MS);
}

export type EngagementDates = {
  /** Premier jour de la période de 12 mois en cours (ou de la première, avant le paiement). */
  start: string;
  /** Échéance : premier jour de la période suivante, date de la reconduction. */
  renewal: string;
  /** Dernier jour couvert par la période. */
  lastDay: string;
  /** Dernier jour pour demander l'arrêt à cette échéance. */
  cancelDeadline: string;
  /** Jour du rappel de reconduction. */
  reminderDay: string;
};

/** Nombre de périodes de 12 mois déjà écoulées à `today` (0 avant le premier paiement). */
function elapsedPeriods(firstPaymentDay: string, today: string): number {
  let n = 0;
  while (addEngagementMonths(firstPaymentDay, TERM_PERIOD_MONTHS * (n + 1)) <= today) n += 1;
  return n;
}

/**
 * Dates de la période d'engagement qui contient `today`. Chaque échéance se compte depuis le premier
 * paiement (comme Stripe et `app.subscription_term_dates` en base), sans dérive d'une fin de mois.
 */
export function engagementDates(firstPaymentDay: string, today: string): EngagementDates {
  const n = elapsedPeriods(firstPaymentDay, today);
  const start = addEngagementMonths(firstPaymentDay, TERM_PERIOD_MONTHS * n);
  const renewal = addEngagementMonths(firstPaymentDay, TERM_PERIOD_MONTHS * (n + 1));
  const cancelDeadline = addEngagementDays(addEngagementMonths(renewal, -CANCEL_NOTICE_MONTHS), -1);
  return {
    start,
    renewal,
    lastDay: addEngagementDays(renewal, -1),
    cancelDeadline,
    reminderDay: addEngagementDays(cancelDeadline, -RENEWAL_REMINDER_DAYS),
  };
}

export type CancellationPlan =
  /** Pendant l'essai : l'abonnement s'arrête tout de suite, rien n'est dû. */
  | { kind: "trial" }
  /** Engagé : l'abonnement s'arrête à l'échéance (`cancelAt`, date de fin pour Stripe). */
  | { kind: "renewal"; cancelAt: string; lastDay: string; late: boolean }
  /** Souscrit avant l'engagement : fin de la période déjà payée, comme avant. */
  | { kind: "periodEnd" };

/**
 * Effet d'une demande d'arrêt faite `today`. Avant le premier paiement : arrêt immédiat. Engagé :
 * à l'échéance de la période en cours si la date limite n'est pas passée, sinon à la suivante.
 */
export function cancellationPlan(input: {
  engaged: boolean;
  firstPaymentDay: string | null;
  today: string;
}): CancellationPlan {
  const { engaged, firstPaymentDay, today } = input;
  if (!firstPaymentDay || today < firstPaymentDay) return { kind: "trial" };
  if (!engaged) return { kind: "periodEnd" };
  const current = engagementDates(firstPaymentDay, today);
  if (today <= current.cancelDeadline) {
    return { kind: "renewal", cancelAt: current.renewal, lastDay: current.lastDay, late: false };
  }
  const n = elapsedPeriods(firstPaymentDay, today);
  const cancelAt = addEngagementMonths(firstPaymentDay, TERM_PERIOD_MONTHS * (n + 2));
  return { kind: "renewal", cancelAt, lastDay: addEngagementDays(cancelAt, -1), late: true };
}

export type SubscriptionTermSummary =
  /** Engagé, fiche pas encore en ligne : l'essai n'a pas commencé. */
  | { phase: "awaitingGoLive" }
  /** Pendant l'essai : renoncer sans frais jusqu'à la veille du premier paiement. */
  | { phase: "trial"; trialLastDay: string; firstPaymentDay: string; termLastDay: string }
  /** Pendant l'année d'engagement en cours. */
  | { phase: "engaged"; termLastDay: string; renewal: string; cancelDeadline: string }
  /** Arrêt demandé : dernier jour couvert. */
  | { phase: "stopping"; stopLastDay: string }
  /** Souscrit avant l'engagement, ou abonnement terminé : affichage d'avant. */
  | { phase: "legacy" };

/** Les dates qui comptent dans « Ma formule » (maquette du lot 74), en jours civils à Paris. */
export function subscriptionTermSummary(input: {
  engaged: boolean;
  status: string;
  trialEnd: string | null;
  goLiveAt: string | null;
  stopLastDay: string | null;
  today: string;
}): SubscriptionTermSummary {
  const { engaged, status, trialEnd, goLiveAt, stopLastDay, today } = input;
  const open = status === "trialing" || status === "active" || status === "past_due";
  if (!engaged || !open) return { phase: "legacy" };
  if (stopLastDay) return { phase: "stopping", stopLastDay };
  if (status === "trialing") {
    if (!goLiveAt || !trialEnd) return { phase: "awaitingGoLive" };
    const firstPaymentDay = parisDay(trialEnd);
    return {
      phase: "trial",
      trialLastDay: addEngagementDays(firstPaymentDay, -1),
      firstPaymentDay,
      termLastDay: addEngagementDays(addEngagementMonths(firstPaymentDay, TERM_PERIOD_MONTHS), -1),
    };
  }
  if (!trialEnd) return { phase: "legacy" };
  const dates = engagementDates(parisDay(trialEnd), today);
  return {
    phase: "engaged",
    termLastDay: dates.lastDay,
    renewal: dates.renewal,
    cancelDeadline: dates.cancelDeadline,
  };
}
