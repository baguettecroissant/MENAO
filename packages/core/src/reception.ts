/**
 * Réception des travaux (F-25 à F-27) : procès-verbal signé par le client, sans ou avec réserves,
 * une fois la fin des travaux déclarée par l'artisan. Ordre de fin de chantier (F-27) : PV, puis
 * solde, puis avis ; l'avis ne conditionne jamais un paiement. Mêmes règles en base (migration
 * reception).
 */
import type { ChantierStatus } from "./chantier-state";

/** Réserves décrites par le client (texte libre), inscrites dans les observations du PV. */
export const RESERVES_LIMITS = { min: 10, max: 2000 } as const;

/** Le client réceptionne les travaux une fois leur fin déclarée par l'artisan. */
export function canStartReception(status: ChantierStatus): boolean {
  return status === "travaux_termines";
}

/** Numéro du PV : PV-AAAA-R01, séquence propre à chaque artisan et à chaque année. */
export function receptionNumber(year: number, sequence: number): string {
  return `PV-${year}-R${String(sequence).padStart(2, "0")}`;
}

/** Message facultatif de l'artisan quand il signale la levée des réserves (F-26). */
export const LIFT_MESSAGE_MAX_LENGTH = 1000;
/** Sans confirmation du client : relance après 7 jours, puis ticket pour l'équipe après 30 jours. */
export const RESERVES_REMINDER_DAYS = 7;
export const RESERVES_ESCALATION_DAYS = 30;

/** Levée des réserves : signalée par l'artisan, confirmée par le client, tant que le chantier y est. */
export function canLiftReserves(status: ChantierStatus): boolean {
  return status === "reserves_a_lever";
}

/**
 * Garanties légales qui courent à compter de la réception, selon la nature des travaux (Code civil,
 * art. 1792 et suivants) : parfait achèvement, bon fonctionnement des équipements, décennale.
 * TODO(legal) : formulation et calcul des échéances à faire valider (garanties applicables selon
 * la nature des travaux).
 */
export const WARRANTY_YEARS = {
  parfaitAchevement: 1,
  bonFonctionnement: 2,
  decennale: 10,
} as const;
export type Warranty = keyof typeof WARRANTY_YEARS;

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** Échéance N années après la réception (AAAA-MM-JJ) : même quantième, 29 février → 28 février. */
export function warrantyEnd(receivedOn: string, years: number): string {
  const [y, m, d] = receivedOn.split("-").map(Number) as [number, number, number];
  const year = y + years;
  const day = m === 2 && d === 29 && !isLeapYear(year) ? 28 : d;
  return `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Garanties d'un chantier réceptionné, avec leur échéance, en cours ou échues à la date donnée. */
export function warranties(
  receivedOn: string,
  today: string,
): { kind: Warranty; until: string; active: boolean }[] {
  return (Object.keys(WARRANTY_YEARS) as Warranty[]).map((kind) => {
    const until = warrantyEnd(receivedOn, WARRANTY_YEARS[kind]);
    return { kind, until, active: today <= until };
  });
}
