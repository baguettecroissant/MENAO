// DPGF créé depuis le relevé des plans (F-140, ADR 0292) : revêtements de chaque pièce, puis lots
// et postes calculés par métier. Chaque quantité dit d'où elle vient (lue sur le plan, calculée,
// tirée d'une photo, à compléter) et garde le détail de son calcul, pour que l'artisan le vérifie.
// Rien n'est deviné : une mesure absente laisse le poste « à compléter ».
import type { DpgfUnit } from "./dpgf";
import type { PlanCountKey, PlanCounts, PlanRoomSource } from "./plan-reading";
import { DEMOLITION_LOT } from "./plan-notes";
import { formatPlanMeasure, PLAN_WORK_UNITS, type PlanWork } from "./plan-works";

/**
 * « existant_nettoyer » et « parquet_poncer » : sol existant conservé (tomette à nettoyer, parquet
 * à poncer), sans fourniture de revêtement neuf : un poste de remise en état (ADR 0331).
 */
export const FLOOR_FINISHES = [
  "carrelage",
  "parquet",
  "sol_souple",
  "existant_nettoyer",
  "parquet_poncer",
  "aucun",
] as const;
export const WALL_FINISHES = ["peinture", "faience", "aucun"] as const;
export const CEILING_FINISHES = ["peinture", "plaque", "aucun"] as const;
export type FloorFinish = (typeof FLOOR_FINISHES)[number];
export type WallFinish = (typeof WALL_FINISHES)[number];
export type CeilingFinish = (typeof CEILING_FINISHES)[number];

/** Sols existants conservés : ni chape ni revêtement neuf. */
const KEPT_FLOORS: readonly FloorFinish[] = ["existant_nettoyer", "parquet_poncer"];

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
  /** Plafond rampant écrit sur le plan : la hauteur des autres pièces ne vaut pas pour elle. */
  sloped?: boolean;
  /** Hauteur reprise des autres pièces du plan (aucune lue pour celle-ci) : quantité estimée. */
  heightEstimated?: boolean;
};

/**
 * Pièces sans hauteur : la hauteur la plus fréquente des autres pièces du relevé leur est donnée,
 * marquée « estimée » (ADR 0333). Une pièce sous rampant, ou un relevé sans aucune hauteur, reste
 * à compléter.
 */
export function withPlanHeight(rooms: readonly TakeoffRoom[]): TakeoffRoom[] {
  const counted = new Map<number, number>();
  for (const r of rooms) {
    if (r.heightMm !== null) counted.set(r.heightMm, (counted.get(r.heightMm) ?? 0) + 1);
  }
  let usual: number | null = null;
  let best = 0;
  for (const [height, n] of counted) {
    if (n > best || (n === best && usual !== null && height < usual)) {
      usual = height;
      best = n;
    }
  }
  return rooms.map((r) =>
    r.heightMm === null && usual !== null && !r.sloped
      ? { ...r, heightMm: usual, heightEstimated: true }
      : r,
  );
}

/** Origine d'une quantité du DPGF (« saisi » : valeur de l'artisan, dans le relevé ou ensuite). */
/** « partiel » : total des pièces mesurées, une ou plusieurs pièces restant à compléter. */
export type TakeoffSource =
  "plan" | "calcul" | "photo" | "manque" | "saisi" | "estime" | "trace" | "partiel";

/**
 * Ouvrage mesuré du relevé (F-158) : va dans le lot de son métier. Un ouvrage écrit sur le plan
 * (F-159 lot 6) porte sa pièce ; une dépose va dans le lot « Démolition ».
 */
export type TakeoffWork = Pick<
  PlanWork,
  "name" | "kind" | "quantityMilli" | "source" | "detail" | "trade" | "page" | "uncertain"
> & { room?: string | null; removal?: boolean };

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

type Post = {
  quantityMilli: number | null;
  source: TakeoffSource;
  detail: string;
  /** Poste d'attente d'une règle : retiré dès que le lot a des ouvrages écrits sur le plan. */
  placeholder?: boolean;
};

function roomsSource(rooms: readonly TakeoffRoom[], derived: boolean): TakeoffSource {
  // Une seule pièce estimée à l'échelle suffit : la quantité entière est une estimation.
  if (rooms.some((r) => r.source === "estime")) return "estime";
  if (rooms.some((r) => r.source === "photo" || r.uncertain)) return "photo";
  // Toutes les pièces tracées à la main par l'artisan : la quantité est la sienne.
  if (rooms.length > 0 && rooms.every((r) => r.source === "trace")) return "trace";
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

/**
 * Total sur les pièces dont la mesure est connue. Une pièce sans mesure ne bloque plus le poste :
 * le total des autres est donné, marqué « partiel », et la pièce manquante est nommée. Sans aucune
 * pièce mesurée, le poste reste à compléter.
 */
function onKnown(
  rooms: readonly TakeoffRoom[],
  has: (r: TakeoffRoom) => boolean,
  what: string,
  compute: (known: readonly TakeoffRoom[]) => Post,
): Post | null {
  if (rooms.length === 0) return null;
  const known = rooms.filter(has);
  const absent = rooms.filter((r) => !has(r));
  if (known.length === 0) return missing(absent, what);
  const post = compute(known);
  if (absent.length === 0) return post;
  return {
    ...post,
    source: "partiel",
    detail: `${post.detail} · sans ${absent.map((r) => r.name).join(", ")} : ${what} à compléter.`,
  };
}

/** Poste qui n'est pas une mesure : une unité ou un ensemble, à choisir ou à chiffrer. */
const single = (detail: string): Post => ({ quantityMilli: 1000, source: "calcul", detail });

function join(terms: readonly string[]): string {
  const shown = terms.slice(0, 12);
  return (
    shown.join(" + ") +
    (terms.length > shown.length ? ` + ${terms.length - shown.length} autres` : "")
  );
}

/** Somme des surfaces au sol (ou de plafond) des pièces. */
function areaPost(rooms: readonly TakeoffRoom[]): Post | null {
  return onKnown(
    rooms,
    (r) => r.areaCm2 !== null,
    "la surface",
    (known) => {
      const total = known.reduce((s, r) => s + m2(r.areaCm2 ?? 0), 0);
      return {
        quantityMilli: total,
        source: roomsSource(known, false),
        detail: `${join(known.map((r) => `${r.name} ${fmt(m2(r.areaCm2 ?? 0))}`))} = ${fmt(total)} m²`,
      };
    },
  );
}

/** Linéaire de plinthes : périmètre des pièces moins une porte par pièce. */
function skirtingPost(rooms: readonly TakeoffRoom[]): Post | null {
  return onKnown(
    rooms,
    (r) => r.perimeterMm !== null,
    "le périmètre",
    (known) => {
      const sum = known.reduce((s, r) => s + (r.perimeterMm ?? 0), 0);
      const doors = known.length * TAKEOFF_RULES.doorWidthMm;
      const total = Math.max(0, sum - doors);
      return {
        quantityMilli: total,
        source: roomsSource(known, true),
        detail: `${join(known.map((r) => `${r.name} ${fmt(r.perimeterMm ?? 0)}`))} − ${known.length} porte${known.length > 1 ? "s" : ""} × ${fmt(TAKEOFF_RULES.doorWidthMm)} = ${fmt(total)} ml`,
      };
    },
  );
}

/** Faïence (mm²) d'une pièce : périmètre × hauteur, moins la porte sur cette hauteur. */
function tileMm2(r: TakeoffRoom): number {
  const height = r.finishes.tileHeightMm ?? TAKEOFF_RULES.bathTileHeightMm;
  const door = TAKEOFF_RULES.doorWidthMm * Math.min(height, TAKEOFF_RULES.doorHeightMm);
  return Math.max(0, (r.perimeterMm ?? 0) * height - door);
}

function tilePost(all: readonly TakeoffRoom[]): Post | null {
  return onKnown(all, (r) => r.perimeterMm !== null, "le périmètre", tileKnown);
}

function tileKnown(rooms: readonly TakeoffRoom[]): Post {
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
function wallPaintPost(all: readonly TakeoffRoom[], windows: number | null): Post | null {
  return onKnown(
    all,
    (r) => r.perimeterMm !== null && r.heightMm !== null,
    "le périmètre ou la hauteur",
    (known) => wallPaintKnown(known, windows),
  );
}

function wallPaintKnown(rooms: readonly TakeoffRoom[], windows: number | null): Post {
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
  const borrowed = rooms.filter((r) => r.heightEstimated);
  return {
    quantityMilli: total,
    source: borrowed.length ? "estime" : roomsSource(rooms, true),
    detail: `${parts.join(" − ")} = ${fmt(total)} m²${
      borrowed.length
        ? ` · hauteur ${fmt(borrowed[0]?.heightMm ?? 0)} m reprise des autres pièces pour ${borrowed.map((r) => r.name).join(", ")}`
        : ""
    }`,
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
  // Une règle par pièce : le nombre ne dépend pas des mesures, il n'est ni lu ni estimé.
  return {
    quantityMilli: total * 1000,
    source: "calcul",
    detail: `${rule} : ${join(terms.map(([r, n]) => `${r.name} ${n}`))} = ${total}`,
  };
}

const toComplete = (reason: string): Post => ({
  quantityMilli: null,
  source: "manque",
  detail: `À compléter : ${reason}`,
  placeholder: true,
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

type Spec = {
  designation: string;
  unit: DpgfUnit;
  unitLabel: string;
  post: Post | null;
  /**
   * Poste de convention remplacé par les ouvrages écrits sur le plan : retiré dès qu'un ouvrage du
   * lot correspond (le plan dit ce qui est prévu, MENAO ne l'ajoute pas une seconde fois).
   */
  replacedBy?: RegExp;
};
/** `written` : ouvrages écrits ou mesurés du lot, hors déposes. */
type Ctx = { rooms: readonly TakeoffRoom[]; counts: PlanCounts; written: readonly TakeoffWork[] };

/** Nom comparé sans accents, casse ni ponctuation. */
const nameKey = (text: string) =>
  plain(text)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Pièces qui ont un ouvrage écrit dont la désignation correspond. */
const roomsWith = (written: readonly TakeoffWork[], pattern: RegExp) =>
  new Set(
    written.flatMap((w) => (w.room && pattern.test(nameKey(w.name)) ? [nameKey(w.room)] : [])),
  );

/**
 * Métiers chiffrés sur des ouvrages mesurés (terrain, toiture, façades) : leur règle n'est qu'un
 * poste d'attente, remplacé par les ouvrages du relevé dès qu'il y en a.
 */
const MEASURED_TRADES = new Set([
  "charpentier",
  "couvreur",
  "facadier",
  "serrurier",
  "terrassier",
  "paysagiste",
]);

/** Poste d'un ouvrage mesuré : la quantité du relevé, son origine et son calcul. */
function workSpec(w: TakeoffWork): Spec {
  const unit = PLAN_WORK_UNITS[w.kind];
  const label = { m2: "m²", ml: "ml", m3: "m³", u: "u" }[unit];
  let post: Post;
  const designation = w.room ? `${w.name} — ${w.room}` : w.name;
  if (w.quantityMilli === null) {
    post = {
      ...toComplete(
        w.room !== undefined && w.room !== null
          ? "à mesurer d'un tracé sur le plan."
          : "quantité non écrite sur le plan.",
      ),
      placeholder: false,
    };
  } else if (w.source === "unite") {
    post = {
      quantityMilli: w.quantityMilli,
      source: "plan",
      detail: "Écrit sur le plan : un ouvrage par note.",
    };
  } else if (w.source === "trace") {
    post = {
      quantityMilli: w.quantityMilli,
      source: "trace",
      detail: "Tracé à la main sur le plan.",
    };
  } else if (w.source === "saisi") {
    post = {
      quantityMilli: w.quantityMilli,
      source: "saisi",
      detail: "Valeur saisie dans le relevé.",
    };
  } else if (w.source === "calcul") {
    post = {
      quantityMilli: w.quantityMilli,
      source: w.uncertain ? "photo" : "calcul",
      detail: `${w.detail ?? "Calculé avec des valeurs lues"} = ${formatPlanMeasure(w.quantityMilli)} ${label}`,
    };
  } else {
    const where = w.page ? `, page ${w.page}` : "";
    post = {
      quantityMilli: w.quantityMilli,
      source: w.source === "photo" || w.uncertain ? "photo" : "plan",
      detail:
        w.source === "compte"
          ? `Compté sur le plan : ${fmt(w.quantityMilli)}`
          : w.source === "photo"
            ? `Lu sur une photo${where}.`
            : `Écrit sur le plan${where}.`,
    };
  }
  return spec(designation, unit, post);
}

const spec = (
  designation: string,
  unit: DpgfUnit,
  post: Post | null,
  replacedBy?: RegExp,
): Spec => ({
  designation,
  unit,
  unitLabel: { m2: "m²", ml: "ml", u: "u", m3: "m³", forfait: "ens" }[unit as string] ?? unit,
  post,
  replacedBy,
});

const habitable = (rooms: readonly TakeoffRoom[]) => rooms.filter((r) => r.habitable);
const floorOf = (rooms: readonly TakeoffRoom[], floor: FloorFinish) =>
  rooms.filter((r) => r.finishes.floor === floor);

const CEILING_POST = "Faux plafond en plaques de plâtre";

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
        "Nettoyage et remise en état du sol existant",
        "m2",
        areaPost(floorOf(rooms, "existant_nettoyer")),
      ),
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
    spec(
      "Peinture des portes intérieures",
      "u",
      countPost(counts, "portes", "portes"),
      /\bportes?\b/,
    ),
  ],
  plaquiste: ({ rooms, written }) => {
    // Faux plafonds écrits pièce par pièce : le total ne garde que les autres pièces en plaque.
    const covered = roomsWith(written, /plafond/);
    return [
      spec(
        CEILING_POST,
        "m2",
        areaPost(
          rooms.filter((r) => r.finishes.ceiling === "plaque" && !covered.has(nameKey(r.name))),
        ),
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
    ];
  },
  menuisier: ({ rooms, counts }) => {
    const wood = floorOf(rooms, "parquet");
    return [
      spec("Parquet", "m2", areaPost(wood)),
      spec("Plinthes bois", "ml", skirtingPost(wood)),
      spec(
        "Ponçage et finition du parquet existant",
        "m2",
        areaPost(floorOf(rooms, "parquet_poncer")),
      ),
      spec(
        "Blocs-portes intérieurs",
        "u",
        countPost(counts, "portes", "portes"),
        /bloc porte|porte (interieure|de distribution|coulissante|a galandage)/,
      ),
      spec(
        "Fenêtres et portes-fenêtres",
        "u",
        countPost(counts, "fenetres", "fenêtres"),
        /fenetre|baie|chassis|velux/,
      ),
      spec("Escalier", "u", countPost(counts, "escaliers", "escaliers")),
    ];
  },
  plombier: ({ counts }) => [
    spec("WC", "u", countPost(counts, "wc", "WC"), /\bwc\b|cuvette|bati support/),
    spec("Lavabos et vasques", "u", countPost(counts, "lavabos", "lavabos"), /lavabo|vasque/),
    spec("Douches", "u", countPost(counts, "douches", "douches"), /douche|receveur/),
    spec("Baignoires", "u", countPost(counts, "baignoires", "baignoires"), /baignoire/),
    spec("Éviers", "u", countPost(counts, "eviers", "éviers"), /evier/),
    spec("Production d'eau chaude", "u", single("Un appareil par logement, à choisir.")),
    spec(
      "Alimentations et évacuations",
      "forfait",
      single("Forfait : un ensemble, à chiffrer selon les plans."),
    ),
  ],
  electricien: ({ rooms }) => {
    const living = habitable(rooms);
    return [
      spec(
        "Points lumineux",
        "u",
        perRoomPost(living, () => 1, "Un point par pièce (minimum NF C 15-100, à vérifier)"),
        /point lumineux|luminaire|spot|applique|plafonnier/,
      ),
      spec(
        "Prises de courant 16 A",
        "u",
        perRoomPost(rooms, socketsFor, "Minimum NF C 15-100 par pièce, à vérifier"),
        /\bprises?\b/,
      ),
      spec("Tableau électrique", "u", single("Un tableau par logement, à dimensionner.")),
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
        /radiateur|emetteur|convecteur|seche serviette|plancher chauffant/,
      ),
      spec("Générateur de chaleur", "u", single("Un générateur par logement, à choisir.")),
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
        /split|unite interieure|climatis|cassette|gainable/,
      ),
      spec("Groupe extérieur", "u", single("Un groupe par logement, puissance à calculer.")),
    ];
  },
  macon: ({ rooms }) => [
    spec(
      "Chape",
      "m2",
      areaPost(
        rooms.filter(
          (r) => r.finishes.floor !== "aucun" && !KEPT_FLOORS.includes(r.finishes.floor),
        ),
      ),
    ),
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
 * Lots et postes du DPGF, un lot par métier choisi (dans l'ordre donné) : postes calculés avec les
 * pièces, puis ouvrages mesurés du relevé rangés dans ce métier. Les déposes vont dans le lot
 * « Démolition », en tête, quand il est demandé (`DEMOLITION_LOT` parmi les métiers). Dès qu'un
 * lot a des ouvrages écrits, les postes d'attente de sa règle sont retirés. Un lot sans rien sur
 * les plans (démolition sans dépose, métier chiffré sur ouvrages mesurés sans ouvrage) n'est pas
 * créé, sauf s'il ne resterait aucun lot : il garde alors un poste « à compléter ».
 */
export function planTakeoff(
  rooms: readonly TakeoffRoom[],
  counts: PlanCounts,
  trades: readonly { code: string; label: string }[],
  works: readonly TakeoffWork[] = [],
): TakeoffLine[] {
  rooms = withPlanHeight(rooms);
  const ordered = [
    ...trades.filter((t) => t.code === DEMOLITION_LOT),
    ...trades.filter((t) => t.code !== DEMOLITION_LOT),
  ];
  const lots = ordered.map((trade) => {
    if (trade.code === DEMOLITION_LOT) {
      return { trade, specs: works.filter((w) => w.removal).map(workSpec), empty: false };
    }
    // Une dépose ne va que dans le lot « Démolition » : sans ce lot, elle n'est pas chiffrée.
    const written = works.filter((w) => w.trade === trade.code && !w.removal);
    // Peinture écrite pour les murs ou le plafond d'une pièce déjà peinte par la règle (périmètre ×
    // hauteur moins les ouvertures, surface du plafond) : la ligne écrite ferait double emploi.
    const painted = (w: TakeoffWork) => {
      const text = nameKey(w.name);
      if (!w.room || w.quantityMilli !== null || !/peind|peinture/.test(text)) return false;
      const room = rooms.find((r) => nameKey(r.name) === nameKey(w.room ?? ""));
      if (!room) return false;
      if (/\bmurs?\b/.test(text)) return room.finishes.walls !== "aucun";
      if (/plafonds?/.test(text)) return room.finishes.ceiling !== "aucun";
      return false;
    };
    const own = trade.code === "peintre" ? written.filter((w) => !painted(w)) : written;
    const measured = own.map(workSpec);
    const ruled =
      measured.length && MEASURED_TRADES.has(trade.code)
        ? []
        : (RULES[trade.code]?.({ rooms, counts, written: own }) ?? []).filter(
            (s) =>
              s.post !== null &&
              !(measured.length && s.post.placeholder) &&
              !(s.replacedBy && own.some((w) => s.replacedBy?.test(nameKey(w.name)))),
          );
    return {
      trade,
      specs: [...ruled, ...measured],
      // Rien sur les plans : aucun ouvrage, et la règle du métier n'est qu'un poste d'attente.
      empty: measured.length === 0 && MEASURED_TRADES.has(trade.code),
    };
  });
  const kept = lots.filter((lot) => lot.specs.length > 0 && !lot.empty);
  const created = kept.length ? kept : lots.filter((lot) => lot.trade.code !== DEMOLITION_LOT);

  const lines: TakeoffLine[] = [];
  created.forEach(({ trade, specs }, i) => {
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
        designation: s.designation.slice(0, 500),
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
    estimated: posts.filter((l) => l.source === "estime").length,
    partial: posts.filter((l) => l.source === "partiel").length,
  };
}
