// Comptage des symboles sur les plans (F-159, lot 7, ADR 0336) : points lumineux, spots, prises,
// interrupteurs… Le modèle de langage liste chaque symbole avec son centre en pixels ; ce fichier
// remet la lecture en forme, fusionne la lecture du plan entier et celle des zones agrandies,
// rattache chaque symbole à sa pièce par les contours tracés (ADR 0326) et compte par type et par
// pièce. Rien n'est deviné : un symbole non vu n'est pas compté, un désaccord est signalé.
// Aucun import : ce fichier est aussi lu par Deno (tender-sheet).

export const SYMBOL_KINDS = [
  "point_lumineux",
  "spot",
  "applique",
  "prise",
  "prise_specialisee",
  "interrupteur",
  "detecteur",
  "commande_volet",
  "prise_rj45_tv",
  "tableau",
  "vmc",
  "radiateur",
  "wc",
  "lavabo",
  "douche",
  "baignoire",
  "evier",
  "porte",
  "fenetre",
] as const;
export type SymbolKind = (typeof SYMBOL_KINDS)[number];

/** Symboles du lot de l'électricien (les seuls repris dans le DPGF pour l'instant). */
export const ELECTRICAL_SYMBOLS: readonly SymbolKind[] = [
  "point_lumineux",
  "spot",
  "applique",
  "prise",
  "prise_specialisee",
  "interrupteur",
  "detecteur",
  "commande_volet",
  "prise_rj45_tv",
  "tableau",
];

/** Symboles au plus par image, et en tout sur un appel d'offres. */
export const MAX_SYMBOLS_PER_IMAGE = 600;
export const MAX_SYMBOLS = 3000;

/** Symbole lu : type, centre en pixels de l'image du plan, pièce lue par le modèle. */
export type FoundSymbol = { type: SymbolKind; x: number; y: number; room: string | null };
/** Symbole gardé : sa page de plan, sa pièce, et s'il fait partie d'un groupe à vérifier. */
export type PlanSymbol = {
  file: number;
  page: number;
  type: SymbolKind;
  x: number;
  y: number;
  room: string | null;
  doubt: boolean;
};

export type SymbolReadingRaw = {
  legende?: string[] | null;
  symboles?: { type: string; x: number; y: number; piece: string }[] | null;
};

/** Schéma JSON de la lecture des symboles (sortie structurée du modèle). */
export function symbolsJsonSchema(): Record<string, unknown> {
  const text = { type: "string" };
  return {
    type: "object",
    additionalProperties: false,
    required: ["legende", "symboles"],
    properties: {
      legende: { type: "array", items: text },
      symboles: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["type", "x", "y", "piece"],
          properties: {
            type: { type: "string", enum: [...SYMBOL_KINDS] },
            x: { type: "number" },
            y: { type: "number" },
            piece: text,
          },
        },
      },
    },
  };
}

const clean = (value: unknown, max: number): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

const key = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Symboles d'une lecture, ramenés aux pixels du plan entier. `width` × `height` : l'image lue ;
 * `zone` : position et agrandissement de la zone dans le plan (lecture d'une zone agrandie).
 */
export function normalizeSymbols(
  raw: SymbolReadingRaw,
  width: number,
  height: number,
  zone: { x: number; y: number; scale: number } = { x: 0, y: 0, scale: 1 },
): FoundSymbol[] {
  const list = Array.isArray(raw?.symboles) ? raw.symboles : [];
  const out: FoundSymbol[] = [];
  for (const s of list) {
    if (!s || !(SYMBOL_KINDS as readonly string[]).includes(s.type)) continue;
    const { x, y } = s;
    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) {
      continue;
    }
    if (x < 0 || y < 0 || x > width || y > height) continue;
    if (out.length >= MAX_SYMBOLS_PER_IMAGE) break;
    out.push({
      type: s.type as SymbolKind,
      x: Math.round(zone.x + x / zone.scale),
      y: Math.round(zone.y + y / zone.scale),
      room: clean(s.piece, 80) || null,
    });
  }
  return out;
}

/** Familles fusionnées : un même symbole peut être lu « spot » dans une lecture, « point » dans l'autre. */
const FAMILY: Record<SymbolKind, string> = {
  point_lumineux: "lumiere",
  spot: "lumiere",
  applique: "lumiere",
  prise: "prise",
  prise_specialisee: "prise",
  prise_rj45_tv: "prise",
  interrupteur: "commande",
  commande_volet: "commande",
  detecteur: "detecteur",
  tableau: "tableau",
  vmc: "vmc",
  radiateur: "radiateur",
  wc: "wc",
  lavabo: "lavabo",
  douche: "douche",
  baignoire: "baignoire",
  evier: "evier",
  porte: "porte",
  fenetre: "fenetre",
};

/** Une lecture sans doublons : un symbole de la même famille à moins de `radius` pixels est le même. */
function distinct(items: readonly FoundSymbol[], radius: number): FoundSymbol[] {
  const kept: FoundSymbol[] = [];
  for (const s of items) {
    if (
      !kept.some(
        (k) => FAMILY[k.type] === FAMILY[s.type] && Math.hypot(k.x - s.x, k.y - s.y) < radius,
      )
    ) {
      kept.push(s);
    }
  }
  return kept;
}

/**
 * Fusion de la lecture du plan entier et de celle des zones agrandies (essai du 15/11/2026) : la
 * lecture entière reconnaît le mieux le type (elle voit la taille relative des symboles), les zones
 * séparent les symboles serrés. Par groupe de symboles voisins de la même famille, on garde le
 * nombre le plus grand des deux lectures et le type de la lecture entière ; quand les deux lectures
 * ont vu le groupe sans s'accorder sur le nombre, le groupe est « à vérifier ».
 */
export function mergeSymbolReadings(
  full: readonly FoundSymbol[],
  zones: readonly FoundSymbol[],
  width: number,
  height: number,
): (FoundSymbol & { doubt: boolean })[] {
  const side = Math.max(width, height, 1);
  const same = side * 0.005;
  const group = side * 0.01;
  type Tagged = FoundSymbol & { from: "full" | "zones" };
  const a: Tagged[] = distinct(full, same).map((s) => ({ ...s, from: "full" }));
  const b: Tagged[] = distinct(zones, same).map((s) => ({ ...s, from: "zones" }));
  const clusters: Tagged[][] = [];
  for (const s of [...a, ...b]) {
    const hit = clusters.find(
      (c) =>
        FAMILY[c[0]?.type ?? s.type] === FAMILY[s.type] &&
        c.some((o) => Math.hypot(o.x - s.x, o.y - s.y) < group),
    );
    if (hit) hit.push(s);
    else clusters.push([s]);
  }
  const out: (FoundSymbol & { doubt: boolean })[] = [];
  for (const c of clusters) {
    const fromFull = c.filter((s) => s.from === "full");
    const fromZones = c.filter((s) => s.from === "zones");
    const base = fromZones.length > fromFull.length ? fromZones : fromFull;
    const types = (fromFull.length ? fromFull : fromZones).map((s) => s.type);
    const doubt =
      fromFull.length > 0 && fromZones.length > 0 && fromFull.length !== fromZones.length;
    base.forEach((s, i) =>
      out.push({
        type: types[i % types.length] ?? s.type,
        x: s.x,
        y: s.y,
        room: s.room ?? fromFull[0]?.room ?? null,
        doubt,
      }),
    );
  }
  return out;
}

/** Point dans un polygone (règle du nombre de croisements). */
function inside(x: number, y: number, points: readonly { x: number; y: number }[]): boolean {
  let hit = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const p = points[i];
    const q = points[j];
    if (!p || !q) continue;
    if (p.y > y !== q.y > y && x < ((q.x - p.x) * (y - p.y)) / (q.y - p.y) + p.x) hit = !hit;
  }
  return hit;
}

const contourPoints = (text: string) =>
  text
    .trim()
    .split(/\s+/)
    .map((part) => part.split(",").map(Number))
    .filter((xy): xy is [number, number] => xy.length === 2 && xy.every(Number.isFinite))
    .map(([x, y]) => ({ x, y }));

/**
 * Pièce de chaque symbole : celle dont le contour tracé sur la même page le contient, sinon la
 * pièce lue par le modèle. `traces` : tracés gardés (PlanTrace, ADR 0326).
 */
export function symbolsInRooms<
  T extends { file: number; page: number; x: number; y: number; room: string | null },
>(
  symbols: readonly T[],
  traces: readonly {
    file: number;
    page: number;
    rooms: readonly { name: string; contour: string }[];
  }[],
): T[] {
  const shapes = traces.map((t) => ({
    file: t.file,
    page: t.page,
    rooms: t.rooms.map((r) => ({ name: r.name, points: contourPoints(r.contour) })),
  }));
  return symbols.map((s) => {
    const trace = shapes.find((t) => t.file === s.file && t.page === s.page);
    const room = trace?.rooms.find((r) => r.points.length >= 3 && inside(s.x, s.y, r.points));
    return room ? { ...s, room: room.name } : s;
  });
}

export type SymbolCount = { total: number; doubt: boolean; rooms: Record<string, number> };

/** Compte par type, puis par pièce ("" : pièce inconnue), et groupe à vérifier par type. */
export function symbolCounts(
  symbols: readonly { type: SymbolKind; room: string | null; doubt: boolean }[],
): Partial<Record<SymbolKind, SymbolCount>> {
  const out: Partial<Record<SymbolKind, SymbolCount>> = {};
  for (const s of symbols) {
    const c = (out[s.type] ??= { total: 0, doubt: false, rooms: {} });
    c.total++;
    c.doubt ||= s.doubt;
    const room = s.room ?? "";
    c.rooms[room] = (c.rooms[room] ?? 0) + 1;
  }
  return out;
}

/** Plans à compter pour l'électricien : ceux dont le type dit « électricité », sinon ceux qui
 * portent au moins `min` symboles électriques. */
export function electricalPages(
  pages: readonly { file: number; page: number; planType: string; electrical: number }[],
  min = 5,
): { file: number; page: number }[] {
  const named = pages.filter((p) => /electri/.test(key(p.planType)));
  return (named.length ? named : pages.filter((p) => p.electrical >= min)).map((p) => ({
    file: p.file,
    page: p.page,
  }));
}

/** Dimensions d'une image JPEG ou PNG lues dans son en-tête, sinon null. */
export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const at = (i: number) => bytes[i] ?? 0;
  if (bytes.length >= 24 && at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) {
    const width = (at(16) << 24) | (at(17) << 16) | (at(18) << 8) | at(19);
    const height = (at(20) << 24) | (at(21) << 16) | (at(22) << 8) | at(23);
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (bytes.length < 4 || at(0) !== 0xff || at(1) !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (at(i) !== 0xff) return null;
    const marker = at(i + 1);
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      const height = (at(i + 5) << 8) | at(i + 6);
      const width = (at(i + 7) << 8) | at(i + 8);
      return width > 0 && height > 0 ? { width, height } : null;
    }
    i += 2 + ((at(i + 2) << 8) | at(i + 3));
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Zones agrandies pour la seconde lecture (PR A2, ADR 0338)
// ---------------------------------------------------------------------------------------------

/** Plus grand côté et nombre de pixels d'une zone envoyée au modèle (il ne la réduit pas). */
export const SYMBOL_ZONE_SIDE = 2200;
export const SYMBOL_ZONE_MAX_PIXELS = 3_600_000;
/** Agrandissement le plus fort d'une zone : au-delà, l'image n'apporte plus rien. */
export const MAX_SYMBOL_ZONE_UPSCALE = 3;
/** Images de plan découpées en zones au plus par appel d'offres (coût du dépôt). */
export const MAX_SYMBOL_ZONE_IMAGES = 6;

/** Rectangle d'une zone, en pixels de l'image du plan (vue d'ensemble ou page rendue). */
export type SymbolZone = { x: number; y: number; w: number; h: number };

/** Quatre zones qui se chevauchent de 10 % (2 × 2) ; aucune pour une image trop petite. */
export function symbolZoneGrid(width: number, height: number): SymbolZone[] {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 200 || height < 200) {
    return [];
  }
  const w = Math.round(width * 0.55);
  const h = Math.round(height * 0.55);
  const xs = [0, width - w];
  const ys = [0, height - h];
  return ys.flatMap((y) => xs.map((x) => ({ x, y, w, h })));
}

/** Agrandissement d'une zone de `w` × `h` pixels pour la lecture : borné par le côté, les pixels
 * et `MAX_SYMBOL_ZONE_UPSCALE`. */
export function symbolZoneScale(w: number, h: number): number {
  if (w <= 0 || h <= 0) return 1;
  return Math.min(
    MAX_SYMBOL_ZONE_UPSCALE,
    SYMBOL_ZONE_SIDE / Math.max(w, h),
    Math.sqrt(SYMBOL_ZONE_MAX_PIXELS / (w * h)),
  );
}

// ---------------------------------------------------------------------------------------------
// Portes, menuiseries et appareils sanitaires (ADR 0339)
// ---------------------------------------------------------------------------------------------

/** Compte du relevé (« Aussi relevé sur les plans ») rempli par chaque type de symbole. */
export const FIXTURE_COUNTS: readonly [SymbolKind, string][] = [
  ["porte", "portes"],
  ["fenetre", "fenetres"],
  ["wc", "wc"],
  ["lavabo", "lavabos"],
  ["douche", "douches"],
  ["baignoire", "baignoires"],
  ["evier", "eviers"],
];

/**
 * Comptes des portes, menuiseries extérieures et appareils sanitaires : ils se répètent d'un plan à
 * l'autre (démolition, cloisons, sols…), donc on garde le compte du plan le plus complet, jamais
 * la somme. Seuls les comptes non nuls sont rendus : un appareil non vu reste à compléter.
 */
export function fixtureCounts(
  pages: readonly { found: readonly FoundSymbol[]; width: number; height: number }[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const page of pages) {
    const kept = mergeSymbolReadings(page.found, [], page.width, page.height);
    for (const [kind, key] of FIXTURE_COUNTS) {
      const n = kept.filter((s) => s.type === kind).length;
      if (n > (out[key] ?? 0)) out[key] = n;
    }
  }
  return out;
}
