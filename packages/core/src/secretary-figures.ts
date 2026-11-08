import { parisToday } from "./project";

/**
 * Chiffres clés de la rubrique « Secrétaire » (refonte « Nette », lot 4, ADR 0249) : appels à
 * traiter (dont urgents), et ce mois-ci à Paris les appels pris (message ou rendez-vous) et les
 * rendez-vous pris dans l'agenda.
 */
export function secretaryFigures(
  todo: readonly { urgent: boolean }[],
  recent: readonly { kind: string; created_at: string }[],
  now: Date = new Date(),
): { toHandle: number; urgent: number; monthCalls: number; monthAppointments: number } {
  const month = parisToday(now).slice(0, 7);
  const inMonth = recent.filter((m) => parisToday(new Date(m.created_at)).slice(0, 7) === month);
  return {
    toHandle: todo.length,
    urgent: todo.filter((m) => m.urgent).length,
    monthCalls: inMonth.length,
    monthAppointments: inMonth.filter((m) => m.kind === "rendez_vous").length,
  };
}
