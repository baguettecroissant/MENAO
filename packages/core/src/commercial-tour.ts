import { addDays } from "./agenda";
import { parisLocalToDate } from "./appointment";
import { parisToday } from "./project";

/**
 * Tournée des conseillers (F-194, lot 83, ADR 0394) : métiers ciblés (codes APE), choix des arrêts
 * autour d'un point de départ, ordre de passage, durée estimée, suite donnée à chaque visite et
 * bilan. La position du conseiller sert au calcul et n'est jamais enregistrée.
 */

/** Métiers proposés pour une tournée, par codes APE de la base de prospects. */
export const TOUR_TRADES = [
  { code: "plombiers", label: "Plombiers", ape: ["43.22A"] },
  { code: "chauffagistes", label: "Chauffagistes", ape: ["43.22B"] },
  { code: "electriciens", label: "Électriciens", ape: ["43.21A"] },
  { code: "macons", label: "Maçons", ape: ["43.99C", "41.20A"] },
  { code: "carreleurs", label: "Carreleurs", ape: ["43.33Z"] },
  { code: "peintres", label: "Peintres", ape: ["43.34Z"] },
  { code: "menuisiers", label: "Menuisiers", ape: ["43.32A", "43.32B"] },
  { code: "couvreurs", label: "Couvreurs", ape: ["43.91A", "43.91B", "43.99A"] },
  { code: "platriers", label: "Plâtriers", ape: ["43.31Z"] },
  { code: "isolation", label: "Isolation", ape: ["43.29A"] },
  { code: "paysagistes", label: "Paysagistes", ape: ["81.30Z"] },
] as const;
export type TourTrade = (typeof TOUR_TRADES)[number]["code"];

export const isTourTrade = (value: unknown): value is TourTrade =>
  TOUR_TRADES.some((t) => t.code === value);

/** Codes APE de métiers choisis (sans doublon) ; les deux formes, « 43.22A » et « 4322A ». */
export function tourApeCodes(trades: readonly string[]): string[] {
  const codes = new Set<string>();
  for (const trade of TOUR_TRADES) {
    if (!trades.includes(trade.code)) continue;
    for (const ape of trade.ape) {
      codes.add(ape);
      codes.add(ape.replace(".", ""));
    }
  }
  return [...codes];
}

/** Durées proposées : nombre d'arrêts visé et rayon de recherche autour du départ. */
export const TOUR_DURATIONS = {
  court: { stops: 8, radiusMeters: 2000 },
  matinee: { stops: 16, radiusMeters: 3500 },
  journee: { stops: 28, radiusMeters: 6000 },
} as const;
export type TourDuration = keyof typeof TOUR_DURATIONS;
export const TOUR_DURATION_KEYS = Object.keys(TOUR_DURATIONS) as TourDuration[];
export const isTourDuration = (value: unknown): value is TourDuration =>
  typeof value === "string" && value in TOUR_DURATIONS;

/** Arrêts au plus dans une tournée (ajouts compris). */
export const TOUR_MAX_STOPS = 30;
/** Pas de marche (km/h) et temps passé par arrêt (minutes) pour l'estimation. */
const WALK_KMH = 4.5;
const MINUTES_PER_STOP = 12;

export type GeoPoint = { lat: number; lng: number };

/** Distance à vol d'oiseau en mètres (formule de haversine). */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h))));
}

export type TourCandidate = GeoPoint & {
  id: string;
  /** Prospect déjà suivi par le conseiller, à recontacter : passe avant les autres. */
  mine?: boolean;
};

/** Ordre de passage : le plus proche à chaque fois, puis échanges 2-opt tant que ça raccourcit. */
export function orderStops<T extends GeoPoint>(start: GeoPoint, stops: readonly T[]): T[] {
  const rest = [...stops];
  const route: T[] = [];
  let here: GeoPoint = start;
  while (rest.length) {
    let best = 0;
    let bestDistance = Infinity;
    rest.forEach((stop, i) => {
      const d = distanceMeters(here, stop);
      if (d < bestDistance) [best, bestDistance] = [i, d];
    });
    const [next] = rest.splice(best, 1);
    if (!next) break;
    route.push(next);
    here = next;
  }
  // 2-opt : inverser un segment si la tournée (départ compris, sans retour) raccourcit.
  let improved = true;
  for (let pass = 0; improved && pass < 20; pass++) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const p: GeoPoint[] = [start, ...route];
        const [a, b, c, d] = [p[i], p[i + 1], p[k + 1], p[k + 2]];
        if (!a || !b || !c) continue;
        const before = distanceMeters(a, b) + (d ? distanceMeters(c, d) : 0);
        const after = distanceMeters(a, c) + (d ? distanceMeters(b, d) : 0);
        if (after + 1 < before) {
          route.splice(i, k - i + 1, ...route.slice(i, k + 1).reverse());
          improved = true;
        }
      }
    }
  }
  return route;
}

/** Longueur d'un parcours depuis le départ, en mètres, et chaque étape. */
export function routeMeters(start: GeoPoint, stops: readonly GeoPoint[]) {
  const legs: number[] = [];
  let here = start;
  for (const stop of stops) {
    legs.push(distanceMeters(here, stop));
    here = stop;
  }
  return { total: legs.reduce((s, l) => s + l, 0), legs };
}

/** Durée estimée en minutes : la marche plus un temps fixe par arrêt. */
export function tourMinutes(meters: number, stops: number): number {
  return Math.round((meters / 1000 / WALK_KMH) * 60 + stops * MINUTES_PER_STOP);
}

/**
 * Proposition de tournée : d'abord les prospects du conseiller à recontacter, puis les plus proches
 * du départ, jusqu'au nombre d'arrêts de la durée choisie ; enfin l'ordre de passage.
 */
export function planTour<T extends TourCandidate>(
  start: GeoPoint,
  candidates: readonly T[],
  duration: TourDuration,
) {
  const { stops: max, radiusMeters } = TOUR_DURATIONS[duration];
  const near = candidates
    .map((c) => ({ c, d: distanceMeters(start, c) }))
    .filter((x) => x.d <= radiusMeters)
    .sort((x, y) => Number(Boolean(y.c.mine)) - Number(Boolean(x.c.mine)) || x.d - y.d);
  const chosen = near.slice(0, max).map((x) => x.c);
  const ordered = orderStops(start, chosen);
  const { total, legs } = routeMeters(start, ordered);
  return {
    stops: ordered,
    legs,
    meters: total,
    minutes: tourMinutes(total, ordered.length),
    /** Candidats proches non retenus, pour « Ajouter ». */
    others: near.slice(max).map((x) => x.c),
  };
}

/** Suite d'une visite (enum `public.tour_outcome`). */
export const TOUR_OUTCOMES = ["interesse", "a_rappeler", "absent", "pas_interesse"] as const;
export type TourOutcome = (typeof TOUR_OUTCOMES)[number];
export const isTourOutcome = (value: unknown): value is TourOutcome =>
  typeof value === "string" && (TOUR_OUTCOMES as readonly string[]).includes(value);

/** Un absent est remis dans « Aujourd'hui » une semaine plus tard, à 10 h. */
export const TOUR_ABSENT_RETRY_DAYS = 7;

/**
 * Prochaine action proposée après une visite : « à rappeler » le lendemain à 18 h (modifiable),
 * « absent » dans une semaine à 10 h ; rien pour « intéressé » et « pas intéressé ».
 */
export function outcomeNextAction(outcome: TourOutcome, now: Date = new Date()): Date | null {
  const today = parisToday(now);
  if (outcome === "a_rappeler") return parisLocalToDate(addDays(today, 1), "18:00");
  if (outcome === "absent")
    return parisLocalToDate(addDays(today, TOUR_ABSENT_RETRY_DAYS), "10:00");
  return null;
}

/** Bilan d'une tournée : arrêts, vus (absents exclus), intéressés, rappels, absents, passés. */
export function tourSummary(outcomes: readonly (TourOutcome | null)[]) {
  const count = (o: TourOutcome) => outcomes.filter((x) => x === o).length;
  const absents = count("absent");
  const visited = outcomes.filter((x) => x !== null).length;
  return {
    stops: outcomes.length,
    seen: visited - absents,
    interested: count("interesse"),
    callBacks: count("a_rappeler"),
    absents,
    skipped: outcomes.length - visited,
  };
}

/** Lien d'itinéraire à pied vers un arrêt : Plans sur iPhone, Google Maps ailleurs. */
export function tourDirectionsUrl(to: GeoPoint, apple: boolean): string {
  const ll = `${to.lat.toFixed(6)},${to.lng.toFixed(6)}`;
  return apple
    ? `https://maps.apple.com/?daddr=${ll}&dirflg=w`
    : `https://www.google.com/maps/dir/?api=1&destination=${ll}&travelmode=walking`;
}

/** Point de départ : coordonnées plausibles (France métropolitaine et outre-mer larges). */
export function isValidStart(p: Partial<GeoPoint> | null | undefined): p is GeoPoint {
  return (
    !!p &&
    typeof p.lat === "number" &&
    typeof p.lng === "number" &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180
  );
}
