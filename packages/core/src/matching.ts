/** Résultats de recherche et fiche artisan (F-09, F-10). */

/** Nombre maximal d'artisans proposés (spec F-09 : 5 en V1, configurable). */
export const MAX_SEARCH_RESULTS = 5;
/** Engagement de réponse de l'équipe au dossier « Envoyer mon dossier à MENAO ». */
export const TICKET_RESPONSE_DAYS = 7;
const SPECIALTIES_SHOWN = 2;

export type Availability =
  { kind: "immediate" } | { kind: "from"; date: string } | { kind: "paused" };

/** Badge « Dispo immédiate » ou date de disponibilité (today au format AAAA-MM-JJ, Paris). */
export function availability(
  a: { paused: boolean; availableFrom: string | null },
  today: string,
): Availability {
  if (a.paused) return { kind: "paused" };
  if (!a.availableFrom || a.availableFrom <= today) return { kind: "immediate" };
  return { kind: "from", date: a.availableFrom };
}

/** Spécialités de la carte artisan : celles demandées par le projet d'abord, 2 au plus, puis « +N ». */
export function specialtiesPreview(
  workTypes: { code: string; label: string }[],
  projectWorkTypes: string[],
): { shown: string[]; more: number } {
  const wanted = new Set(projectWorkTypes);
  const sorted = [...workTypes].sort(
    (a, b) => Number(wanted.has(b.code)) - Number(wanted.has(a.code)),
  );
  return {
    shown: sorted.slice(0, SPECIALTIES_SHOWN).map((w) => w.label),
    more: Math.max(0, sorted.length - SPECIALTIES_SHOWN),
  };
}

export function ticketDueDate(createdAt: Date): Date {
  return new Date(createdAt.getTime() + TICKET_RESPONSE_DAYS * 86_400_000);
}
