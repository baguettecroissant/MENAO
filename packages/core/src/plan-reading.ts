// Relevé d'un plan d'architecte (F-140, ADR 0291) : pièces, surfaces, périmètres, hauteurs et
// éléments comptés, lus par un modèle de langage puis remis en forme ici. Le modèle ne fait que
// relever ce qui est écrit ; une surface absente n'est calculée qu'avec des cotes lues, sinon elle
// reste vide (« à compléter »). Aucun import : ce fichier est aussi lu par Deno (tender-sheet).

/** Origine d'une mesure : écrite sur le plan, calculée avec les cotes, lue sur une photo, saisie. */
export type PlanRoomSource = "plan" | "cotes" | "photo" | "saisi";

export type PlanRoom = {
  level: string | null;
  name: string;
  /** Surface au sol en cm² (45,14 m² = 451 400). */
  areaCm2: number | null;
  perimeterMm: number | null;
  /** Hauteur sous plafond en mm. */
  heightMm: number | null;
  wet: boolean;
  habitable: boolean;
  source: PlanRoomSource;
  /** Fichier déposé (à partir de 1) et page de ce fichier où la pièce a été lue. */
  file: number | null;
  page: number | null;
  /** Le modèle n'est pas sûr de sa lecture : à vérifier en priorité. */
  uncertain: boolean;
};

export const PLAN_COUNT_KEYS = [
  "portes",
  "fenetres",
  "wc",
  "lavabos",
  "douches",
  "baignoires",
  "eviers",
  "escaliers",
] as const;
export type PlanCountKey = (typeof PLAN_COUNT_KEYS)[number];
export type PlanCounts = Record<PlanCountKey, number | null>;

export const MAX_PLAN_ROOMS = 200;
export const MAX_PLAN_FILES = 10;

/**
 * Réponse du modèle. La sortie structurée limite le nombre de champs facultatifs (16 au plus) :
 * l'échelle, les niveaux et les comptes absents sont des chaînes vides ou des éléments omis, et
 * seules les mesures d'une pièce peuvent être null. Les anciennes formes (null, objet de comptes)
 * restent acceptées.
 */
export type PlanReadingRaw = {
  lisible: boolean;
  est_un_plan: boolean;
  echelle: string | null;
  hauteurs: { niveau: string | null; hauteur_m: number | null }[];
  pieces: {
    fichier: number | null;
    page: number | null;
    niveau: string | null;
    nom: string;
    surface_m2: number | null;
    longueur_m: number | null;
    largeur_m: number | null;
    perimetre_m: number | null;
    hauteur_m: number | null;
    /**
     * Chaînes de cotes (F-159) : les cotes intérieures écrites, en centimètres, dont la somme fait
     * la longueur, puis la largeur, d'une pièce rectangulaire (« 247+156+247 »). Le cœur les
     * additionne. En texte : deux listes de nombres de plus rendaient le schéma trop lourd pour la
     * sortie structurée (erreur 400 « compiled grammar is too large »). Absentes des anciennes
     * réponses.
     */
    cotes_longueur?: string | null;
    cotes_largeur?: string | null;
    humide: boolean;
    habitable: boolean;
    certitude: "sure" | "incertaine";
  }[];
  comptes:
    Partial<Record<PlanCountKey, number | null>> | { element: PlanCountKey; nombre: number }[];
};

export type PlanReadingWarning =
  "illisible" | "pas_un_plan" | "sans_surfaces" | "tronque" | "photo";

export type PlanReading = {
  rooms: PlanRoom[];
  counts: PlanCounts;
  scale: string | null;
  warnings: PlanReadingWarning[];
};

/** Schéma JSON de la réponse attendue (sortie structurée du modèle). */
export function planReadingJsonSchema(): Record<string, unknown> {
  const nullable = (type: string) => ({ type: [type, "null"] });
  return {
    type: "object",
    additionalProperties: false,
    required: ["lisible", "est_un_plan", "echelle", "hauteurs", "pieces", "comptes"],
    properties: {
      lisible: { type: "boolean" },
      est_un_plan: { type: "boolean" },
      echelle: { type: "string" },
      hauteurs: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["niveau", "hauteur_m"],
          properties: { niveau: { type: "string" }, hauteur_m: { type: "number" } },
        },
      },
      pieces: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "fichier",
            "page",
            "niveau",
            "nom",
            "surface_m2",
            "longueur_m",
            "largeur_m",
            "perimetre_m",
            "hauteur_m",
            "cotes_longueur",
            "cotes_largeur",
            "humide",
            "habitable",
            "certitude",
          ],
          properties: {
            fichier: { type: "integer" },
            page: { type: "integer" },
            niveau: { type: "string" },
            nom: { type: "string" },
            surface_m2: nullable("number"),
            longueur_m: nullable("number"),
            largeur_m: nullable("number"),
            perimetre_m: nullable("number"),
            hauteur_m: nullable("number"),
            cotes_longueur: { type: "string" },
            cotes_largeur: { type: "string" },
            humide: { type: "boolean" },
            habitable: { type: "boolean" },
            certitude: { type: "string", enum: ["sure", "incertaine"] },
          },
        },
      },
      // Seuls les éléments comptés avec certitude : un élément absent reste « à compléter ».
      comptes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["element", "nombre"],
          properties: {
            element: { type: "string", enum: [...PLAN_COUNT_KEYS] },
            nombre: { type: "integer" },
          },
        },
      },
    },
  };
}

const text = (value: unknown, max: number): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** Nombre fini dans ]min, max], sinon null. */
function inRange(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > min && value <= max
    ? value
    : null;
}

/** Entier dans [min, max], sinon null. */
function intIn(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
    ? value
    : null;
}

/**
 * Somme, en mètres, d'une chaîne de cotes écrite en centimètres (« 247+156+247 », 12 cotes au
 * plus, décimales admises) ; null si la chaîne est vide, mal écrite ou hors bornes : une chaîne
 * douteuse n'est pas additionnée.
 */
export function chainSum(chain: unknown): number | null {
  if (typeof chain !== "string") return null;
  const parts = chain.replace(/\s+/g, "").replace(/,/g, ".").split("+");
  if (parts.length > 12) return null;
  let totalMm = 0;
  for (const part of parts) {
    if (!/^\d{1,5}(\.\d)?$/.test(part)) return null;
    const mm = Math.round(Number(part) * 10);
    if (mm <= 0) return null;
    totalMm += mm;
  }
  return totalMm > 0 && totalMm <= 200_000 ? totalMm / 1000 : null;
}

const levelKey = (level: string | null) =>
  (level ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+]/g, "");

/** Éléments comptés : entiers de 0 à 999, sinon null (« à compléter »). */
export function normalizePlanCounts(raw: unknown): PlanCounts {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(
    PLAN_COUNT_KEYS.map((k) => [k, intIn(source[k], 0, 999)]),
  ) as PlanCounts;
}

/**
 * Relevé du modèle remis en forme. `photoFiles` : numéros (à partir de 1) des fichiers qui sont
 * des photos ; les pièces qui en viennent sont marquées « photo » (à vérifier).
 */
export function normalizePlanReading(
  raw: PlanReadingRaw,
  fileCount: number,
  photoFiles: readonly number[] = [],
): PlanReading {
  const warnings: PlanReadingWarning[] = [];
  if (!raw.lisible) warnings.push("illisible");
  if (!raw.est_un_plan) warnings.push("pas_un_plan");

  // Hauteur sous plafond par niveau (coupes) ; une seule hauteur vaut pour tous les niveaux.
  const heights = new Map<string, number>();
  for (const h of raw.hauteurs ?? []) {
    const m = inRange(h.hauteur_m, 1.5, 10);
    if (m !== null) heights.set(levelKey(h.niveau), Math.round(m * 1000));
  }
  const onlyHeight = heights.size === 1 ? ([...heights.values()][0] ?? null) : null;

  const rooms: PlanRoom[] = [];
  for (const p of raw.pieces ?? []) {
    const name = text(p.nom, 80);
    if (!name) continue;
    if (rooms.length >= MAX_PLAN_ROOMS) {
      warnings.push("tronque");
      break;
    }
    const surface = inRange(p.surface_m2, 0, 10000);
    // Une cote écrite d'un seul tenant, sinon la somme de la chaîne de cotes lue le long du mur.
    const length = inRange(p.longueur_m, 0, 200) ?? chainSum(p.cotes_longueur);
    const width = inRange(p.largeur_m, 0, 200) ?? chainSum(p.cotes_largeur);
    const sides = length !== null && width !== null;
    const lengthMm = length === null ? 0 : Math.round(length * 1000);
    const widthMm = width === null ? 0 : Math.round(width * 1000);
    const areaCm2 =
      surface !== null
        ? Math.round(surface * 10000)
        : sides
          ? Math.round((lengthMm * widthMm) / 100)
          : null;
    const perimeter = inRange(p.perimetre_m, 0, 2000);
    const perimeterMm =
      perimeter !== null ? Math.round(perimeter * 1000) : sides ? 2 * (lengthMm + widthMm) : null;
    const height = inRange(p.hauteur_m, 1.5, 10);
    const level = text(p.niveau, 40) || null;
    const heightMm =
      height !== null
        ? Math.round(height * 1000)
        : (heights.get(levelKey(level)) ?? heights.get("") ?? onlyHeight);
    const file = intIn(p.fichier, 1, Math.max(1, fileCount));
    const fromPhoto = file !== null && photoFiles.includes(file);
    rooms.push({
      level,
      name,
      areaCm2: areaCm2 && areaCm2 > 0 ? areaCm2 : null,
      perimeterMm: perimeterMm && perimeterMm > 0 ? perimeterMm : null,
      heightMm,
      wet: p.humide === true,
      habitable: p.habitable !== false,
      source: fromPhoto ? "photo" : surface === null && sides ? "cotes" : "plan",
      file,
      page: intIn(p.page, 1, 999),
      uncertain: p.certitude === "incertaine",
    });
  }
  if (rooms.length > 0 && rooms.every((r) => r.areaCm2 === null)) warnings.push("sans_surfaces");
  if (rooms.some((r) => r.source === "photo")) warnings.push("photo");
  return {
    rooms,
    counts: normalizePlanCounts(
      Array.isArray(raw.comptes)
        ? Object.fromEntries(raw.comptes.map((c) => [c.element, c.nombre]))
        : raw.comptes,
    ),
    scale: text(raw.echelle, 40) || null,
    warnings,
  };
}

/** Chiffres du relevé : pièces, surfaces lues, calculées, à vérifier et à compléter. */
export function planReadingFigures(
  rooms: readonly Pick<PlanRoom, "areaCm2" | "perimeterMm" | "heightMm" | "source" | "uncertain">[],
) {
  return {
    rooms: rooms.length,
    read: rooms.filter((r) => r.source === "plan" && r.areaCm2 !== null).length,
    computed: rooms.filter((r) => r.source === "cotes").length,
    toCheck: rooms.filter((r) => r.source === "photo" || r.uncertain).length,
    missing: rooms.filter(
      (r) => r.areaCm2 === null || r.perimeterMm === null || r.heightMm === null,
    ).length,
  };
}
