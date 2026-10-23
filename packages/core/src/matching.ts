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

/**
 * Place réservée aux nouveaux artisans (ADR 0151). Un artisan est « nouveau » pendant ses 90
 * premiers jours après la validation de son dossier, ou tant qu'il a moins de 3 chantiers menés à
 * terme. Si aucun nouveau ne figure parmi les MAX_SEARCH_RESULTS premiers, l'un d'eux prend la
 * 3e place : il reçoit ses premières demandes, donc ses premiers avis. Mêmes règles en base
 * (app.artisan_is_newcomer, public.match_artisans).
 */
export const NEWCOMER = { days: 90, completedChantiers: 3, position: 3 } as const;

export function isNewcomer(
  daysSinceValidation: number | null,
  completedChantiers: number,
): boolean {
  return (
    daysSinceValidation === null ||
    daysSinceValidation < NEWCOMER.days ||
    completedChantiers < NEWCOMER.completedChantiers
  );
}

export type MatchCandidate = {
  id: string;
  availableNow: boolean;
  /** AAAA-MM-JJ, null si aucune date. */
  availableFrom: string | null;
  /** Score de la charte (ADR 0105), de 0 à 100. */
  score: number;
  distanceKm: number | null;
  /** Tirage propre au projet (md5 du projet et de l'artisan en base). */
  draw: string;
  newcomer: boolean;
};

const nullsLast = (a: number | null, b: number | null) =>
  a === b ? 0 : a === null ? 1 : b === null ? -1 : a - b;
const nullsFirst = (a: string | null, b: string | null) =>
  a === b ? 0 : a === null ? -1 : b === null ? 1 : a < b ? -1 : 1;
const byDraw = (a: MatchCandidate, b: MatchCandidate) =>
  a.draw < b.draw ? -1 : a.draw > b.draw ? 1 : 0;

/** Ordre au mérite : disponibles tout de suite d'abord, puis score, date de disponibilité, distance, tirage. */
function byMerit(a: MatchCandidate, b: MatchCandidate): number {
  return (
    Number(b.availableNow) - Number(a.availableNow) ||
    b.score - a.score ||
    nullsFirst(a.availableFrom, b.availableFrom) ||
    nullsLast(a.distanceKm, b.distanceKm) ||
    byDraw(a, b)
  );
}

/** Ordre des artisans proposés pour une demande, place des nouveaux comprise (ADR 0151). */
export function rankCandidates<T extends MatchCandidate>(candidates: readonly T[]): T[] {
  const merit = [...candidates].sort(byMerit);
  if (merit.slice(0, MAX_SEARCH_RESULTS).some((c) => c.newcomer)) return merit;
  // Le nouveau retenu : disponible tout de suite d'abord, puis le tirage (rotation entre projets).
  const chosen = merit
    .filter((c) => c.newcomer)
    .sort((a, b) => Number(b.availableNow) - Number(a.availableNow) || byDraw(a, b))[0];
  if (!chosen) return merit;
  const others = merit.filter((c) => c !== chosen);
  return [
    ...others.slice(0, NEWCOMER.position - 1),
    chosen,
    ...others.slice(NEWCOMER.position - 1),
  ];
}

/**
 * Zone élargie (ADR 0165) : quand plus aucun artisan de la zone n'est à contacter pour un projet,
 * des artisans dont la zone s'arrête à 20 km au plus du chantier sont proposés (`hors_zone` de
 * `match_artisans`). Ils peuvent décliner « hors zone » sans pénalité.
 */
export const ZONE_WIDENING_KM = 20;

/**
 * Artisans de la zone élargie montrés : seulement s'il reste des places et qu'aucun artisan de la
 * zone n'est encore à contacter (tous déjà sollicités, ou aucun).
 */
export function showWiderZone(c: {
  inZoneToContact: number;
  slots: number;
  nearby: number;
}): boolean {
  return c.inZoneToContact === 0 && c.slots > 0 && c.nearby > 0;
}
