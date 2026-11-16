import { DEMOLITION_LOT, noteMeasureHint } from "./plan-notes";
import { planNameKey } from "./plan-measure";

/**
 * Points à vérifier d'un appel d'offres créé depuis les plans (F-159, lot 56, ADR 0343) : pièces
 * estimées ou sans surface, ouvrages d'un lot sans quantité, types de symboles avec un groupe
 * douteux. L'artisan les valide un par un ; la base garde, pour chaque point validé, la valeur
 * validée (`tenders.plan_checks`). Un point est fait tant que la valeur n'a pas changé depuis : une
 * nouvelle lecture qui donne une autre surface le rouvre.
 */
export type VerifyRoom = {
  id: string;
  name: string;
  area_cm2: number | null;
  height_mm: number | null;
  source: string;
  uncertain: boolean;
};

export type VerifyWork = {
  id: string;
  name: string;
  kind: string;
  quantity_milli: number | null;
  trade_code: string | null;
  room: string | null;
  removal: boolean;
};

/** Type de symbole compté : combien, et s'il reste un groupe douteux. */
export type VerifySymbols = Record<string, { total: number; doubt: boolean } | undefined>;

/** Valeur validée de chaque point (surface en cm², quantité en millièmes ; null pour un symbole). */
export type PlanChecks = Record<string, number | null>;

export type VerifyPoint =
  | {
      key: string;
      kind: "room";
      done: boolean;
      id: string;
      name: string;
      /** Pourquoi : estimée par MENAO, ou sans surface. */
      reason: "estimated" | "missing";
      areaCm2: number | null;
      heightMm: number | null;
    }
  | {
      key: string;
      kind: "work";
      done: boolean;
      id: string;
      name: string;
      room: string | null;
      /** Lot de l'ouvrage : la démolition, ou le métier. */
      lot: string;
      workKind: string;
      quantityMilli: number | null;
      /** Ce qu'il faut mesurer sur le plan. */
      hint: "length" | "wall" | "facade" | "area" | null;
    }
  | {
      key: string;
      kind: "symbol";
      done: boolean;
      type: string;
      total: number;
    };

const ROOM_ESTIMATED = new Set(["estime", "photo"]);

/** Clé stable d'un point : le nom (et la pièce) plutôt que l'identifiant, recréé à chaque enregistrement. */
export const verifyRoomKey = (name: string) => `piece:${planNameKey(name)}`;
export const verifyWorkKey = (name: string, room: string | null) =>
  `ouvrage:${planNameKey(name)}|${room ? planNameKey(room) : ""}`;
export const verifySymbolKey = (type: string) => `symbole:${type}`;

/** Clés uniques : un deuxième ouvrage du même nom dans la même pièce reçoit « #2 ». */
function uniqueKeys<T>(items: T[], keyOf: (item: T) => string): string[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const key = keyOf(item);
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return n === 1 ? key : `${key}#${n}`;
  });
}

const checkedAs = (checks: PlanChecks, key: string, value: number | null) =>
  Object.prototype.hasOwnProperty.call(checks, key) && checks[key] === value;

/**
 * Liste des points, dans l'ordre du parcours : les pièces, puis les ouvrages (démolition d'abord,
 * puis les lots dans l'ordre donné), puis les symboles. Un point validé reste dans la liste, fait.
 */
export function planVerifyPoints({
  rooms,
  works,
  symbols = {},
  checks = {},
  lotOrder = [],
}: {
  rooms: VerifyRoom[];
  works: VerifyWork[];
  symbols?: VerifySymbols;
  checks?: PlanChecks;
  lotOrder?: string[];
}): VerifyPoint[] {
  const points: VerifyPoint[] = [];

  const roomKeys = uniqueKeys(rooms, (r) => verifyRoomKey(r.name));
  rooms.forEach((r, i) => {
    const key = roomKeys[i] ?? verifyRoomKey(r.name);
    const missing = r.area_cm2 === null;
    const estimated = ROOM_ESTIMATED.has(r.source) || r.uncertain;
    const done = !missing && checkedAs(checks, key, r.area_cm2);
    if (!missing && !estimated && !done) return;
    points.push({
      key,
      kind: "room",
      done,
      id: r.id,
      name: r.name,
      reason: missing ? "missing" : "estimated",
      areaCm2: r.area_cm2,
      heightMm: r.height_mm,
    });
  });

  // Ouvrages d'un lot (la démolition, ou un métier) : un ouvrage hors lot n'entre pas au DPGF.
  const inLot = works.filter((w) => w.removal || w.trade_code);
  const lotOf = (w: VerifyWork) => (w.removal ? DEMOLITION_LOT : (w.trade_code ?? ""));
  const order = [DEMOLITION_LOT, ...lotOrder];
  const rank = (lot: string) => {
    const at = order.indexOf(lot);
    return at === -1 ? order.length : at;
  };
  const workKeys = uniqueKeys(inLot, (w) => verifyWorkKey(w.name, w.room));
  inLot
    .map((w, i) => ({ w, key: workKeys[i] ?? verifyWorkKey(w.name, w.room), i }))
    .sort((a, b) => rank(lotOf(a.w)) - rank(lotOf(b.w)) || a.i - b.i)
    .forEach(({ w, key }) => {
      const done = w.quantity_milli !== null && checkedAs(checks, key, w.quantity_milli);
      if (w.quantity_milli !== null && !done) return;
      points.push({
        key,
        kind: "work",
        done,
        id: w.id,
        name: w.name,
        room: w.room,
        lot: lotOf(w),
        workKind: w.kind,
        quantityMilli: w.quantity_milli,
        hint: noteMeasureHint(w.name, w.kind),
      });
    });

  for (const [type, count] of Object.entries(symbols)) {
    if (!count || count.total === 0) continue;
    const key = verifySymbolKey(type);
    const checked = Object.prototype.hasOwnProperty.call(checks, key);
    // Un groupe douteux rouvre le point, même validé (nouvelle lecture).
    if (!count.doubt && !checked) continue;
    points.push({ key, kind: "symbol", done: !count.doubt, type, total: count.total });
  }
  return points;
}

/** Points faits et total, pour « 5 faits sur 12 ». */
export function verifyProgress(points: VerifyPoint[]): {
  done: number;
  total: number;
  open: number;
} {
  const done = points.filter((p) => p.done).length;
  return { done, total: points.length, open: points.length - done };
}

/**
 * Surface d'une cloison ou d'un doublage tracé sur le plan : longueur × hauteur de la pièce, en
 * millièmes de m² (la quantité d'un ouvrage en surface).
 */
export function wallQuantityMilli(lengthMm: number, heightMm: number): number | null {
  if (!(lengthMm > 0) || !(heightMm > 0)) return null;
  return Math.round((lengthMm * heightMm) / 1000);
}
