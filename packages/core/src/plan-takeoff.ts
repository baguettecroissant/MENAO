// DPGF créé depuis le relevé des plans (F-140, ADR 0292) : revêtements de chaque pièce, puis lots
// et postes calculés par métier. Chaque quantité dit d'où elle vient (lue sur le plan, calculée,
// tirée d'une photo, à compléter) et garde le détail de son calcul, pour que l'artisan le vérifie.
// Rien n'est deviné : une mesure absente laisse le poste « à compléter ».
import type { DpgfUnit } from "./dpgf";
import type { PlanCountKey, PlanCounts, PlanRoomSource } from "./plan-reading";

export const FLOOR_FINISHES = ["carrelage", "parquet", "sol_souple", "aucun"] as const;
export const WALL_FINISHES = ["peinture", "faience", "aucun"] as const;
export const CEILING_FINISHES = ["peinture", "plaque", "aucun"] as const;
export type FloorFinish = (typeof FLOOR_FINISHES)[number];
export type WallFinish = (typeof WALL_FINISHES)[number];
export type CeilingFinish = (typeof CEILING_FINISHES)[number];

export type RoomFinishes = {
  floor: FloorFinish;
  walls: WallFinish;
  ceiling: CeilingFinish;
  /** Hauteur de faïence en mm (murs « faience »). */
  tileHeightMm: number | null;
};

export type TakeoffRoom = {
  name: string;
  level: string | null;
  areaCm2: number | null;
  perimeterMm: number | null;
  heightMm: number | null;
  wet: boolean;
  habitable: boolean;
  source: PlanRoomSource;
  uncertain: boolean;
  finishes: RoomFinishes;
};

/** Origine d'une quantité du DPGF (« saisi » : corrigée ensuite par l'artisan). */
export type TakeoffSource = "plan" | "calcul" | "photo" | "manque";

export type TakeoffLine = {
  kind: "titre" | "poste";
  lot: string;
  code: string;
  designation: string;
  unit: DpgfUnit | null;
  unitLabel: string | null;
  quantityMilli: number | null;
  source: TakeoffSource | null;
  detail: string | null;
};

/** Conventions de calcul, rappelées dans le détail de chaque poste. */
export const TAKEOFF_RULES = {
  /** Une porte par pièce, de 0,83 × 2,04 m (déduite des plinthes, faïences et peintures). */
  doorWidthMm: 830,
  doorHeightMm: 2040,
  /** Surface moyenne d'une fenêtre déduite des peintures (1,5 m²). */
  windowAreaCm2: 15_000,
  bathTileHeightMm: 2100,
  wcTileHeightMm: 1200,
} as const;

const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const WC = /\bwc\b|toilette/;
const BATH = /bain|douche|salle d.?eau|\bsde\b|\bsdb\b/;
const KITCHEN = /cuisine|kitchenette/;
const LIVING = /sejour|salon|living|salle a manger/;
const BEDROOM = /chambre|bureau|dressing|mezzanine/;
const CIRCULATION = /entree|degagement|couloir|hall|palier|circulation|escalier/;

/** Revêtements proposés pour une pièce, que l'artisan corrige ensuite. */
export function defaultFinishes(room: {
  name: string;
  wet: boolean;
  habitable: boolean;
}): RoomFinishes {
  const name = plain(room.name);
  if (!room.habitable)
    return { floor: "aucun", walls: "aucun", ceiling: "aucun", tileHeightMm: null };
  if (WC.test(name)) {
    return {
      floor: "carrelage",
      walls: "faience",
      ceiling: "peinture",
      tileHeightMm: TAKEOFF_RULES.wcTileHeightMm,
    };
  }
  if (BATH.test(name)) {
    return {
      floor: "carrelage",
      walls: "faience",
      ceiling: "peinture",
      tileHeightMm: TAKEOFF_RULES.bathTileHeightMm,
    };
  }
  const floor: FloorFinish = BEDROOM.test(name) || /palier/.test(name) ? "parquet" : "carrelage";
  return { floor, walls: "peinture", ceiling: "peinture", tileHeightMm: null };
}

// ---------------------------------------------------------------------------------------------
// Calculs
// ---------------------------------------------------------------------------------------------

const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
/** Millièmes (m², ml, u) en texte : 45 140 → « 45,14 ». */
const fmt = (milli: number) => number.format(milli / 1000);
const m2 = (cm2: number) => Math.round(cm2 / 10);

type Post = { quantityMilli: number | null; source: TakeoffSource; detail: string };

function roomsSource(rooms: readonly TakeoffRoom[], derived: boolean): TakeoffSource {
  if (rooms.some((r) => r.source === "photo" || r.uncertain)) return "photo";
  if (derived || rooms.some((r) => r.source === "cotes")) return "calcul";
  return "plan";
}

function missing(rooms: readonly TakeoffRoom[], what: string): Post {
  return {
    quantityMilli: null,
    source: "manque",
    detail: `À compléter : ${what} de ${rooms.map((r) => r.name).join(", ")}.`,
  };
}

function join(terms: readonly string[]): string {
  const shown = terms.slice(0, 12);
  return (
    shown.join(" + ") +
    (terms.length > shown.length ? ` + ${terms.length - shown.length} autres` : "")
  );
}

/** Somme des surfaces au sol (ou de plafond) des pièces. */
function areaPost(rooms: readonly TakeoffRoom[]): Post | null {
  if (rooms.length === 0) return null;
  const absent = rooms.filter((r) => r.areaCm2 === null);
  if (absent.length) return missing(absent, "la surface");
  const total = rooms.reduce((s, r) => s + m2(r.areaCm2 ?? 0), 0);
  return {
    quantityMilli: total,
    source: roomsSource(rooms, false),
    detail: `${join(rooms.map((r) => `${r.name} ${fmt(m2(r.areaCm2 ?? 0))}`))} = ${fmt(total)} m²`,
  };
}

/** Linéaire de plinthes : périmètre des pièces moins une porte par pièce. */
function skirtingPost(rooms: readonly TakeoffRoom[]): Post | null {
  if (rooms.length === 0) return null;
  const absent = rooms.filter((r) => r.perimeterMm === null);
  if (absent.length) return missing(absent, "le périmètre");
  const sum = rooms.reduce((s, r) => s + (r.perimeterMm ?? 0), 0);
  const doors = rooms.length * TAKEOFF_RULES.doorWidthMm;
  const total = Math.max(0, sum - doors);
  return {
    quantityMilli: total,
    source: roomsSource(rooms, true),
    detail: `${join(rooms.map((r) => `${r.name} ${fmt(r.perimeterMm ?? 0)}`))} − ${rooms.length} porte${rooms.length > 1 ? "s" : ""} × ${fmt(TAKEOFF_RULES.doorWidthMm)} = ${fmt(total)} ml`,
  };
}

/** Faïence (mm²) d'une pièce : périmètre × hauteur, moins la porte sur cette hauteur. */
function tileMm2(r: TakeoffRoom): number {
  const height = r.finishes.tileHeightMm ?? TAKEOFF_RULES.bathTileHeightMm;
  const door = TAKEOFF_RULES.doorWidthMm * Math.min(height, TAKEOFF_RULES.doorHeightMm);
  return Math.max(0, (r.perimeterMm ?? 0) * height - door);
}

function tilePost(rooms: readonly TakeoffRoom[]): Post | null {
  if (rooms.length === 0) return null;
  const absent = rooms.filter((r) => r.perimeterMm === null);
  if (absent.length) return missing(absent, "le périmètre");
  const total = rooms.reduce((s, r) => s + Math.round(tileMm2(r) / 1000), 0);
  const terms = rooms.map(
    (r) =>
      `${r.name} ${fmt(r.perimeterMm ?? 0)} × ${fmt(r.finishes.tileHeightMm ?? TAKEOFF_RULES.bathTileHeightMm)}`,
  );
  return {
    quantityMilli: total,
    source: roomsSource(rooms, true),
    detail: `${join(terms)}, moins une porte par pièce = ${fmt(total)} m²`,
  };
}

/** Murs peints : périmètre × hauteur, moins faïence et une porte par pièce, moins les fenêtres. */
function wallPaintPost(rooms: readonly TakeoffRoom[], windows: number | null): Post | null {
  if (rooms.length === 0) return null;
  const absent = rooms.filter((r) => r.perimeterMm === null || r.heightMm === null);
  if (absent.length) return missing(absent, "le périmètre ou la hauteur");
  // Faïence : toute sa hauteur est déduite ; la porte, seulement au-dessus de la faïence.
  let gross = 0;
  let tiles = 0;
  let doors = 0;
  for (const r of rooms) {
    gross += (r.perimeterMm ?? 0) * (r.heightMm ?? 0);
    const tile =
      r.finishes.walls === "faience"
        ? (r.finishes.tileHeightMm ?? TAKEOFF_RULES.bathTileHeightMm)
        : 0;
    tiles += (r.perimeterMm ?? 0) * tile;
    doors += TAKEOFF_RULES.doorWidthMm * Math.max(0, TAKEOFF_RULES.doorHeightMm - tile);
  }
  // Fenêtres : surface moyenne (convention), mm² ; pas de déduction si leur nombre manque.
  const windowsMm2 = (windows ?? 0) * TAKEOFF_RULES.windowAreaCm2 * 100;
  const totalMm2 = Math.max(0, gross - tiles - doors - windowsMm2);
  const total = Math.round(totalMm2 / 1000);
  const parts = [
    `périmètres × hauteurs ${fmt(Math.round(gross / 1000))} m²`,
    tiles ? `faïence ${fmt(Math.round(tiles / 1000))}` : null,
    `${rooms.length} porte${rooms.length > 1 ? "s" : ""} ${fmt(Math.round(doors / 1000))}`,
    windows
      ? `${windows} fenêtre${windows > 1 ? "s" : ""} × 1,5 m² ${fmt(Math.round(windowsMm2 / 1000))}`
      : null,
  ].filter(Boolean);
  return {
    quantityMilli: total,
    source: roomsSource(rooms, true),
    detail: `${parts.join(" − ")} = ${fmt(total)} m²`,
  };
}

/** Nombre compté sur le plan (portes, appareils…). 0 : pas de poste. */
function countPost(counts: PlanCounts, key: PlanCountKey, label: string): Post | null {
  const n = counts[key];
  if (n === 0) return null;
  if (n === null) {
    return {
      quantityMilli: null,
      source: "manque",
      detail: `À compléter : ${label} non comptés sur le plan.`,
    };
  }
  return { quantityMilli: n * 1000, source: "plan", detail: `Compté sur le plan : ${n}` };
}

/** Nombre déduit des pièces (un émetteur, un point lumineux… par pièce). */
function perRoomPost(
  rooms: readonly TakeoffRoom[],
  per: (r: TakeoffRoom) => number,
  rule: string,
): Post | null {
  const terms = rooms.map((r) => [r, per(r)] as const).filter(([, n]) => n > 0);
  if (terms.length === 0) return null;
  const total = terms.reduce((s, [, n]) => s + n, 0);
  return {
    quantityMilli: total * 1000,
    source: roomsSource(
      terms.map(([r]) => r),
      true,
    ),
    detail: `${rule} : ${join(terms.map(([r, n]) => `${r.name} ${n}`))} = ${total}`,
  };
}

const toComplete = (reason: string): Post => ({
  quantityMilli: null,
  source: "manque",
  detail: `À compléter : ${reason}`,
});

/** Prises de courant au minimum de la norme NF C 15-100, par pièce (à vérifier). */
function socketsFor(r: TakeoffRoom): number {
  const name = plain(r.name);
  const areaM2 = r.areaCm2 === null ? 0 : r.areaCm2 / 10_000;
  if (!r.habitable) return 1;
  if (LIVING.test(name)) return Math.max(5, Math.ceil(areaM2 / 4)) + (KITCHEN.test(name) ? 6 : 0);
  if (KITCHEN.test(name)) return 6;
  if (BEDROOM.test(name)) return 3;
  if (WC.test(name)) return 0;
  if (BATH.test(name)) return 1;
  if (CIRCULATION.test(name)) return areaM2 > 4 ? 1 : 0;
  return 1;
}

// ---------------------------------------------------------------------------------------------
// Règles par métier
// ---------------------------------------------------------------------------------------------

type Spec = { designation: string; unit: DpgfUnit; unitLabel: string; post: Post | null };
type Ctx = { rooms: readonly TakeoffRoom[]; counts: PlanCounts };

const spec = (designation: string, unit: DpgfUnit, post: Post | null): Spec => ({
  designation,
  unit,
  unitLabel: { m2: "m²", ml: "ml", u: "u", m3: "m³", forfait: "ens" }[unit as string] ?? unit,
  post,
});

const habitable = (rooms: readonly TakeoffRoom[]) => rooms.filter((r) => r.habitable);
const floorOf = (rooms: readonly TakeoffRoom[], floor: FloorFinish) =>
  rooms.filter((r) => r.finishes.floor === floor);

const RULES: Record<string, (ctx: Ctx) => Spec[]> = {
  carreleur: ({ rooms, counts }) => {
    const tiled = floorOf(rooms, "carrelage");
    return [
      spec("Ragréage du sol", "m2", areaPost(tiled)),
      spec("Carrelage de sol", "m2", areaPost(tiled)),
      spec(
        "Plinthes carrelage assorties",
        "ml",
        skirtingPost(tiled.filter((r) => r.finishes.walls !== "faience")),
      ),
      spec("Faïence murale", "m2", tilePost(rooms.filter((r) => r.finishes.walls === "faience"))),
      spec(
        "Étanchéité (SPEC) sous douche",
        "m2",
        counts.douches ? toComplete("surface des douches non cotée sur le plan.") : null,
      ),
    ];
  },
  peintre: ({ rooms, counts }) => [
    spec(
      "Peinture des plafonds",
      "m2",
      areaPost(rooms.filter((r) => r.finishes.ceiling !== "aucun")),
    ),
    spec(
      "Peinture des murs",
      "m2",
      wallPaintPost(
        rooms.filter((r) => r.finishes.walls !== "aucun"),
        counts.fenetres,
      ),
    ),
    spec("Sol souple", "m2", areaPost(floorOf(rooms, "sol_souple"))),
    spec("Peinture des portes intérieures", "u", countPost(counts, "portes", "portes")),
  ],
  plaquiste: ({ rooms }) => [
    spec(
      "Faux plafond en plaques de plâtre",
      "m2",
      areaPost(rooms.filter((r) => r.finishes.ceiling === "plaque")),
    ),
    spec(
      "Cloisons de distribution",
      "m2",
      toComplete("longueur des cloisons à mesurer sur le plan."),
    ),
    spec(
      "Doublage isolant des murs extérieurs",
      "m2",
      toComplete("murs extérieurs à distinguer sur le plan."),
    ),
  ],
  menuisier: ({ rooms, counts }) => {
    const wood = floorOf(rooms, "parquet");
    return [
      spec("Parquet", "m2", areaPost(wood)),
      spec("Plinthes bois", "ml", skirtingPost(wood)),
      spec("Blocs-portes intérieurs", "u", countPost(counts, "portes", "portes")),
      spec("Fenêtres et portes-fenêtres", "u", countPost(counts, "fenetres", "fenêtres")),
      spec("Escalier", "u", countPost(counts, "escaliers", "escaliers")),
    ];
  },
  plombier: ({ counts }) => [
    spec("WC", "u", countPost(counts, "wc", "WC")),
    spec("Lavabos et vasques", "u", countPost(counts, "lavabos", "lavabos")),
    spec("Douches", "u", countPost(counts, "douches", "douches")),
    spec("Baignoires", "u", countPost(counts, "baignoires", "baignoires")),
    spec("Éviers", "u", countPost(counts, "eviers", "éviers")),
    spec("Production d'eau chaude", "u", toComplete("appareil à choisir.")),
    spec(
      "Alimentations et évacuations",
      "forfait",
      toComplete("réseaux à chiffrer selon les plans."),
    ),
  ],
  electricien: ({ rooms }) => {
    const living = habitable(rooms);
    return [
      spec(
        "Points lumineux",
        "u",
        perRoomPost(living, () => 1, "Un point par pièce (minimum NF C 15-100, à vérifier)"),
      ),
      spec(
        "Prises de courant 16 A",
        "u",
        perRoomPost(rooms, socketsFor, "Minimum NF C 15-100 par pièce, à vérifier"),
      ),
      spec("Tableau électrique", "u", toComplete("tableau à dimensionner.")),
    ];
  },
  chauffagiste: ({ rooms }) => {
    const heated = habitable(rooms);
    return [
      spec("Surface chauffée", "m2", areaPost(heated)),
      spec(
        "Émetteurs de chauffage",
        "u",
        perRoomPost(
          heated,
          (r) => (WC.test(plain(r.name)) || CIRCULATION.test(plain(r.name)) ? 0 : 1),
          "Un émetteur par pièce de vie et salle d'eau",
        ),
      ),
      spec("Générateur de chaleur", "u", toComplete("appareil à choisir.")),
    ];
  },
  climaticien: ({ rooms }) => {
    const cooled = habitable(rooms).filter(
      (r) => LIVING.test(plain(r.name)) || BEDROOM.test(plain(r.name)),
    );
    return [
      spec("Surface climatisée", "m2", areaPost(cooled)),
      spec(
        "Unités intérieures",
        "u",
        perRoomPost(cooled, () => 1, "Une unité par séjour et chambre"),
      ),
      spec("Groupe extérieur", "u", toComplete("puissance à calculer.")),
    ];
  },
  macon: ({ rooms }) => [
    spec("Chape", "m2", areaPost(rooms.filter((r) => r.finishes.floor !== "aucun"))),
    spec("Dallage et fondations", "m2", toComplete("emprise du bâtiment à mesurer.")),
    spec("Murs en maçonnerie", "m2", toComplete("murs à mesurer sur les plans et façades.")),
  ],
  charpentier: () => [spec("Charpente", "m2", toComplete("surface de toiture à mesurer."))],
  couvreur: () => [
    spec("Couverture", "m2", toComplete("surface de toiture à mesurer.")),
    spec("Gouttières et descentes", "ml", toComplete("linéaire à mesurer.")),
  ],
  facadier: () => [
    spec("Ravalement des façades", "m2", toComplete("surface des façades à mesurer.")),
  ],
  serrurier: () => [spec("Garde-corps", "ml", toComplete("linéaire à mesurer."))],
  terrassier: () => [spec("Terrassement", "m3", toComplete("volume à calculer."))],
  paysagiste: () => [spec("Aménagement des espaces verts", "m2", toComplete("surface à mesurer."))],
};

/**
 * Lots et postes du DPGF, un lot par métier choisi (dans l'ordre donné). Un métier sans règle,
 * ou dont aucun poste ne s'applique, garde un poste « à compléter ».
 */
export function planTakeoff(
  rooms: readonly TakeoffRoom[],
  counts: PlanCounts,
  trades: readonly { code: string; label: string }[],
): TakeoffLine[] {
  const lines: TakeoffLine[] = [];
  trades.forEach((trade, i) => {
    const n = i + 1;
    const code = `LOT ${String(n).padStart(2, "0")}`;
    const label = trade.label.toUpperCase();
    const lot = `${code} ${label}`;
    lines.push({
      kind: "titre",
      lot,
      code,
      designation: label,
      unit: null,
      unitLabel: null,
      quantityMilli: null,
      source: null,
      detail: null,
    });
    const specs = (RULES[trade.code]?.({ rooms, counts }) ?? []).filter((s) => s.post !== null);
    const posts = specs.length
      ? specs
      : [
          spec(
            `Ouvrages du lot ${trade.label.toLowerCase()}`,
            "forfait",
            toComplete("aucune mesure du relevé ne s'applique à ce lot."),
          ),
        ];
    posts.forEach((s, j) => {
      lines.push({
        kind: "poste",
        lot,
        code: `${n}.${j + 1}`,
        designation: s.designation,
        unit: s.unit,
        unitLabel: s.unitLabel,
        quantityMilli: s.post?.quantityMilli ?? null,
        source: s.post?.source ?? "manque",
        detail: s.post?.detail.slice(0, 1000) ?? null,
      });
    });
  });
  return lines;
}

/** Chiffres du DPGF créé : lots, postes, postes à compléter, quantités tirées d'une photo. */
export function takeoffFigures(lines: readonly Pick<TakeoffLine, "kind" | "source">[]) {
  const posts = lines.filter((l) => l.kind === "poste");
  return {
    lots: lines.filter((l) => l.kind === "titre").length,
    posts: posts.length,
    missing: posts.filter((l) => l.source === "manque").length,
    photo: posts.filter((l) => l.source === "photo").length,
  };
}
