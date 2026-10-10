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
