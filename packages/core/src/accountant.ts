/**
 * Envoi au comptable (F-63, ADR 0187) : chaque mois ou chaque trimestre, les factures et les
 * dépenses de la période écoulée (tableaux et pièces) partent chez le comptable de l'artisan, par un
 * lien sécurisé. Dates à l'heure de Paris (AAAA-MM-JJ).
 * Fichier autonome (aucun import) : il est aussi importé par l'Edge Function accountant-export.
 */

export const ACCOUNTANT_PERIODS = ["mensuel", "trimestriel"] as const;
export type AccountantPeriod = (typeof ACCOUNTANT_PERIODS)[number];

/** Durée de validité du lien envoyé au comptable. */
export const ACCOUNTANT_LINK_DAYS = 30;
/** Durée de conservation de l'archive, au-delà de la validité du lien. */
export const ACCOUNTANT_RETENTION_DAYS = 60;
/** Envoi automatique pendant les premiers jours qui suivent la fin de la période (rattrapage). */
export const ACCOUNTANT_SEND_WINDOW_DAYS = 7;

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
/** Dernier jour du mois `m` (1 à 12) de l'année `y`. */
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function parts(today: string): [number, number, number] {
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  return [y, m, d];
}

export type AccountantRange = {
  /** Premier jour de la période. */
  start: string;
  /** Dernier jour de la période (inclus). */
  end: string;
  /** « septembre 2026 », « 3e trimestre 2026 ». */
  label: string;
  /** Pour le nom du fichier : « 2026-09 », « 2026-T3 ». */
  key: string;
};

/** Dernière période complète avant `today` : le mois ou le trimestre précédent. */
export function accountantPeriodRange(period: AccountantPeriod, today: string): AccountantRange {
  const [y, m] = parts(today);
  if (period === "mensuel") {
    const year = m === 1 ? y - 1 : y;
    const month = m === 1 ? 12 : m - 1;
    return {
      start: iso(year, month, 1),
      end: iso(year, month, lastDay(year, month)),
      label: `${MONTHS[month - 1]} ${year}`,
      key: `${year}-${pad(month)}`,
    };
  }
  const quarter = Math.floor((m - 1) / 3) + 1;
  const year = quarter === 1 ? y - 1 : y;
  const previous = quarter === 1 ? 4 : quarter - 1;
  const firstMonth = (previous - 1) * 3 + 1;
  return {
    start: iso(year, firstMonth, 1),
    end: iso(year, firstMonth + 2, lastDay(year, firstMonth + 2)),
    label: `${previous === 1 ? "1er" : `${previous}e`} trimestre ${year}`,
    key: `${year}-T${previous}`,
  };
}

/** Libellé d'une période enregistrée (historique) : un mois, un trimestre, sinon les dates. */
export function accountantRangeLabel(start: string, end: string): string {
  const [y, m] = parts(start);
  const [ey, em, ed] = parts(end);
  const monthEnd = ed === lastDay(ey, em);
  if (start.endsWith("-01") && monthEnd && y === ey && m === em) return `${MONTHS[m - 1]} ${y}`;
  if (start.endsWith("-01") && monthEnd && y === ey && em === m + 2 && m % 3 === 1) {
    const quarter = (m + 2) / 3;
    return `${quarter === 1 ? "1er" : `${quarter}e`} trimestre ${y}`;
  }
  return `${start} – ${end}`;
}

/**
 * Envoi automatique dû aujourd'hui : dans les 7 premiers jours du mois (mensuel) ou du trimestre
 * (trimestriel : janvier, avril, juillet, octobre). Au-delà, l'artisan peut envoyer à la main.
 */
export function accountantSendDue(period: AccountantPeriod, today: string): boolean {
  const [, m, d] = parts(today);
  if (d > ACCOUNTANT_SEND_WINDOW_DAYS) return false;
  return period === "mensuel" || m % 3 === 1;
}

/** Prochain envoi automatique (le 1er du mois ou du trimestre qui suit `today`). */
export function nextAccountantSend(period: AccountantPeriod, today: string): string {
  const [y, m] = parts(today);
  let month = m + 1;
  if (period === "trimestriel") while (month % 3 !== 1) month += 1;
  return month > 12 ? iso(y + 1, month - 12, 1) : iso(y, month, 1);
}

/** Prochain envoi automatique en toutes lettres : « 1er novembre 2026 ». */
export function nextAccountantSendLabel(period: AccountantPeriod, today: string): string {
  const [y, m] = parts(nextAccountantSend(period, today));
  return `1er ${MONTHS[m - 1]} ${y}`;
}
