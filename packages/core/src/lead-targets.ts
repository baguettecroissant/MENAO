/**
 * Objectif de demandes par artisan (F-131, ADR 0282) : chaque artisan validé doit recevoir un
 * minimum de demandes de devis par mois. La base renvoie les chiffres (admin_lead_targets) ; ce
 * module en tire l'objectif du mois, l'avancement, les alertes et la cause probable d'un manque.
 *
 * - L'objectif d'un artisan validé en cours de mois est réduit au prorata des jours restants.
 * - En cours de mois, l'avancement est comparé au rythme attendu à date (« dans les temps » ou
 *   « en retard ») ; un mois terminé est « atteint » ou « manqué ».
 * - Alertes : en retard sur le mois en cours à partir du 10, ou deux mois terminés de suite sous
 *   l'objectif (seuil de sortie sans frais de la garantie, ADR 0200).
 */

/** Objectif par défaut, en demandes par mois (garantie des formules : 4 demandes). */
export const DEFAULT_MONTHLY_REQUEST_TARGET = 4;
/** Jour du mois à partir duquel un retard déclenche une alerte (avant : trop tôt pour juger). */
export const LEAD_ALERT_FROM_DAY = 10;

export const LEAD_STATUSES = [
  "manque",
  "en_retard",
  "dans_les_temps",
  "atteint",
  "hors_suivi",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type LeadProgress = {
  /** Premier jour du mois (AAAA-MM-01). */
  month: string;
  /** Objectif du mois, réduit au prorata pour un artisan validé dans le mois ; null : hors suivi. */
  target: number | null;
  received: number;
  /** Demandes attendues à date au rythme de l'objectif (mois en cours), sinon l'objectif. */
  expected: number | null;
  /** Demandes qui manquent pour atteindre l'objectif. */
  missing: number;
  status: LeadStatus;
  /** Mois terminé. */
  closed: boolean;
};

const DAY_MS = 86_400_000;
const day = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;
function nextMonth(month: string): string {
  const d = new Date(day(month));
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Objectif du mois pour un artisan validé le `validatedOn` (AAAA-MM-JJ) : null s'il n'était pas
 * encore validé à la fin du mois ou si son objectif est 0 ; au prorata des jours restants (arrondi
 * au-dessus) s'il a été validé dans le mois.
 */
export function monthTarget(target: number, month: string, validatedOn: string): number | null {
  if (target <= 0) return null;
  const start = day(monthStart(month));
  const end = day(nextMonth(month));
  const validated = day(validatedOn);
  if (validated >= end) return null;
  if (validated <= start) return target;
  const share = (end - validated) / (end - start);
  return Math.max(1, Math.ceil(target * share));
}

/** Avancement d'un mois, à la date `today` (AAAA-MM-JJ, heure de Paris). */
export function leadProgress(input: {
  month: string;
  today: string;
  validatedOn: string;
  target: number;
  received: number;
}): LeadProgress {
  const month = monthStart(input.month);
  const target = monthTarget(input.target, month, input.validatedOn);
  const closed = day(nextMonth(month)) <= day(input.today);
  const base = { month, target, received: input.received, closed };
  if (target === null) return { ...base, expected: null, missing: 0, status: "hors_suivi" };
  const missing = Math.max(0, target - input.received);
  if (input.received >= target) return { ...base, expected: target, missing, status: "atteint" };
  if (closed) return { ...base, expected: target, missing, status: "manque" };
  // Rythme attendu : de la validation (ou du 1er) à aujourd'hui inclus, sur le reste du mois.
  const from = Math.max(day(month), day(input.validatedOn));
  const end = day(nextMonth(month));
  const elapsed = Math.min(end - from, Math.max(0, day(input.today) + DAY_MS - from));
  const expected = Math.floor((target * elapsed) / (end - from));
  return {
    ...base,
    expected,
    missing,
    status: input.received >= expected ? "dans_les_temps" : "en_retard",
  };
}

export const LEAD_ALERTS = ["deux_mois", "en_retard"] as const;
export type LeadAlert = (typeof LEAD_ALERTS)[number];

/**
 * Alertes d'un artisan d'après son historique (du plus ancien au plus récent, le dernier étant le
 * mois suivi) : deux mois terminés de suite sous l'objectif, retard sur le mois en cours à partir
 * du jour LEAD_ALERT_FROM_DAY.
 */
export function leadAlerts(history: readonly LeadProgress[], today: string): LeadAlert[] {
  const alerts: LeadAlert[] = [];
  const closed = history.filter((m) => m.closed);
  const [before, last] = closed.slice(-2);
  if (before && last && before.status === "manque" && last.status === "manque") {
    alerts.push("deux_mois");
  }
  const current = history.at(-1);
  if (
    current &&
    !current.closed &&
    current.status === "en_retard" &&
    Number(today.slice(8, 10)) >= LEAD_ALERT_FROM_DAY
  ) {
    alerts.push("en_retard");
  }
  return alerts;
}

export const LEAD_CAUSES = [
  "en_pause",
  "absent",
  "invisible",
  "aucune_recherche",
  "peu_choisi",
] as const;
export type LeadCause = (typeof LEAD_CAUSES)[number];

/**
 * Cause probable d'un manque de demandes, dans l'ordre où elle se vérifie : l'artisan ne peut pas
 * en recevoir (pause, absence, fiche invisible), personne ne cherche son métier dans sa zone, ou
 * on le cherche sans le choisir. Null si rien ne manque.
 */
export function leadCause(input: {
  progress: LeadProgress;
  paused: boolean;
  absent: boolean;
  visible: boolean;
  searches: number;
}): LeadCause | null {
  const { progress } = input;
  if (progress.status !== "en_retard" && progress.status !== "manque") return null;
  if (input.paused) return "en_pause";
  if (input.absent) return "absent";
  if (!input.visible) return "invisible";
  if (input.searches === 0) return "aucune_recherche";
  return "peu_choisi";
}
