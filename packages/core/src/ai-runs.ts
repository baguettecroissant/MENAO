/** Suivi des appels à l'IA dans le back-office (ADR 0052), à partir du journal ai_runs. */
import { percent } from "./overview";

/**
 * Part des échecs (réponse illisible, refus du modèle, erreur d'appel) et part des réponses peu
 * sûres, qui déclenchent un second appel au modèle de repli.
 */
export function aiRates(c: {
  calls: number;
  unsure: number;
  invalid: number;
  refused: number;
  errors: number;
}): { failure: number | null; unsure: number | null } {
  return {
    failure: percent(c.invalid + c.refused + c.errors, c.calls),
    unsure: percent(c.unsure, c.calls),
  };
}
