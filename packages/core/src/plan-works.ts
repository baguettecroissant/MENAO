// Ouvrages mesurés relevés sur les plans (F-158, ADR 0322) : surfaces, linéaires, volumes et
// nombres d'un plan de masse, d'une coupe de terrain ou d'un plan de réseaux, pour les métiers qui
// ne travaillent pas pièce par pièce (terrassier, paysagiste…). Le modèle de langage relève ce qui
// est écrit ; un volume absent n'est calculé ici qu'avec une surface et une épaisseur (ou deux
// altitudes) lues sur les plans, et le calcul est gardé. Façades et toiture (PR 2, ADR 0323) : une
// surface absente n'est calculée qu'avec deux cotes écrites (longueur × hauteur d'une façade), ou
// avec la surface au sol et la pente écrites (surface d'un versant). Rien n'est deviné : une
// quantité qui n'est pas écrite reste vide (« à compléter »).
// Aucun import : ce fichier est aussi lu par Deno (tender-sheet).

/** Type d'une page de plan, reconnu par le modèle. */
export const PLAN_PAGE_TYPES = [
  "niveau",
  "coupe",
  "facade",
  "toiture",
  "masse",
  "coupe_terrain",
  "reseaux",
  "autre",
] as const;
export type PlanPageType = (typeof PLAN_PAGE_TYPES)[number];
export type PlanPage = { file: number; page: number; type: PlanPageType };

export const PLAN_WORK_KINDS = ["surface", "lineaire", "volume", "nombre"] as const;
export type PlanWorkKind = (typeof PLAN_WORK_KINDS)[number];

/** Unité de chaque mesure (unités des devis et du DPGF). */
export const PLAN_WORK_UNITS = {
  surface: "m2",
  lineaire: "ml",
  volume: "m3",
  nombre: "u",
} as const satisfies Record<PlanWorkKind, string>;

/**
 * Origine d'une quantité : écrite sur le plan, calculée avec des valeurs lues, comptée (symboles),
 * lue sur une photo, ou saisie par l'artisan.
 */
export type PlanWorkSource = "plan" | "calcul" | "compte" | "photo" | "saisi";

export type PlanWork = {
  name: string;
  kind: PlanWorkKind;
  /** Quantité en millièmes de l'unité (186,00 m² = 186 000 ; 6 arbres = 6 000) ; null : à compléter. */
  quantityMilli: number | null;
  source: PlanWorkSource;
  /** Calcul affiché d'une quantité calculée (« 186,00 m² × 0,30 m »). */
  detail: string | null;
  /** Métier du lot où va l'ouvrage ; null : repère, dans aucun lot. */
  trade: string | null;
  file: number | null;
  page: number | null;
  uncertain: boolean;
};

/** Altitude lue sur les plans (terrain naturel, plateforme…), en mm. */
export type PlanLevel = { name: string; altitudeMm: number };

export const MAX_PLAN_WORKS = 200;
export const MAX_PLAN_PAGES = 100;
export const MAX_PLAN_LEVELS = 20;

/** Partie « ouvrages » de la réponse du modèle. */
export type PlanWorksRaw = {
  pages?: { fichier: number | null; page: number | null; type: string }[] | null;
  altitudes?: { nom: string; altitude_m: number | null }[] | null;
  ouvrages?:
    | {
        fichier: number | null;
        page: number | null;
        nom: string;
        mesure: string;
        quantite: number | null;
        compte: boolean;
        surface_m2: number | null;
        epaisseur_m: number | null;
        altitude_haute_m: number | null;
        altitude_basse_m: number | null;
        /** Deux cotes écrites d'une surface (façade, versant) ; absentes des anciennes réponses. */
        longueur_m?: number | null;
        largeur_m?: number | null;
        /** Pente écrite d'un versant et son unité (« pourcent », « degres », vide si absente). */
        pente?: number | null;
        pente_unite?: string;
        metier: string;
        certitude: "sure" | "incertaine";
      }[]
    | null;
};

export type PlanWorksReading = { works: PlanWork[]; pages: PlanPage[]; levels: PlanLevel[] };

/** Propriétés à ajouter au schéma JSON de la lecture des plans (sortie structurée du modèle). */
export function planWorksJsonSchema(): {
  required: string[];
  properties: Record<string, unknown>;
} {
  const nullable = (type: string) => ({ type: [type, "null"] });
  return {
    required: ["pages", "altitudes", "ouvrages"],
    properties: {
      pages: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["fichier", "page", "type"],
          properties: {
            fichier: { type: "integer" },
            page: { type: "integer" },
            type: { type: "string", enum: [...PLAN_PAGE_TYPES] },
          },
        },
      },
      altitudes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["nom", "altitude_m"],
          properties: { nom: { type: "string" }, altitude_m: { type: "number" } },
        },
      },
      ouvrages: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "fichier",
            "page",
            "nom",
            "mesure",
            "quantite",
            "compte",
            "surface_m2",
            "epaisseur_m",
            "altitude_haute_m",
            "altitude_basse_m",
            "longueur_m",
            "largeur_m",
            "pente",
            "pente_unite",
            "metier",
            "certitude",
          ],
          properties: {
            fichier: { type: "integer" },
            page: { type: "integer" },
            nom: { type: "string" },
            mesure: { type: "string", enum: [...PLAN_WORK_KINDS] },
            quantite: nullable("number"),
            compte: { type: "boolean" },
            surface_m2: nullable("number"),
            epaisseur_m: nullable("number"),
            altitude_haute_m: nullable("number"),
            altitude_basse_m: nullable("number"),
            longueur_m: nullable("number"),
            largeur_m: nullable("number"),
            pente: nullable("number"),
            pente_unite: { type: "string", enum: ["", "pourcent", "degres"] },
            metier: { type: "string" },
            certitude: { type: "string", enum: ["sure", "incertaine"] },
          },
        },
      },
    },
  };
}

const clean = (value: unknown, max: number): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** Nombre fini dans ]min, max], sinon null. */
function within(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > min && value <= max
    ? value
    : null;
}

function whole(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
    ? value
    : null;
}

const two = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});
/** Millièmes en texte à deux décimales : 186 000 → « 186,00 ». */
export const formatPlanMeasure = (milli: number) => two.format(milli / 1000);

const three = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
  useGrouping: false,
});
const plainNumber = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
  useGrouping: false,
});

/**
 * Coefficient de pente d'un versant, en millièmes (surface du versant ÷ surface au sol) :
 * √(1 + p²) pour une pente en pourcentage, 1 ÷ cos(angle) pour une pente en degrés. Null hors
 * bornes (pente nulle, plus de 300 % ou de 75°).
 */
export function slopeFactorMilli(slope: unknown, unit: unknown): number | null {
  if (typeof slope !== "number" || !Number.isFinite(slope) || slope <= 0) return null;
  if (unit === "pourcent" && slope <= 300) {
    return Math.round(Math.sqrt(1 + (slope / 100) ** 2) * 1000);
  }
  if (unit === "degres" && slope <= 75) {
    return Math.round(1000 / Math.cos((slope * Math.PI) / 180));
  }
  return null;
}

/** Quantité la plus grande acceptée, en millièmes (10 000 000 m², ml ou m³). */
export const MAX_WORK_MILLI = 10_000_000_000;

/**
 * Ouvrages du modèle remis en forme. `photoFiles` : numéros (à partir de 1) des fichiers qui sont
 * des photos ; `trades` : métiers choisis par l'artisan (un métier hors liste est ignoré).
 */
export function normalizePlanWorks(
  raw: PlanWorksRaw,
  fileCount: number,
  photoFiles: readonly number[] = [],
  trades: readonly string[] = [],
): PlanWorksReading {
  const lastFile = Math.max(1, fileCount);

  const pages: PlanPage[] = [];
  for (const p of raw.pages ?? []) {
    const file = whole(p.fichier, 1, lastFile);
    const page = whole(p.page, 1, 999);
    const type = (PLAN_PAGE_TYPES as readonly string[]).includes(p.type)
      ? (p.type as PlanPageType)
      : null;
    if (file === null || page === null || type === null) continue;
    if (pages.some((x) => x.file === file && x.page === page)) continue;
    if (pages.length >= MAX_PLAN_PAGES) break;
    pages.push({ file, page, type });
  }

  const levels: PlanLevel[] = [];
  for (const a of raw.altitudes ?? []) {
    const name = clean(a.nom, 60);
    const altitude =
      typeof a.altitude_m === "number" && Number.isFinite(a.altitude_m) ? a.altitude_m : null;
    if (!name || altitude === null || altitude < -500 || altitude > 9000) continue;
    if (levels.length >= MAX_PLAN_LEVELS) break;
    levels.push({ name, altitudeMm: Math.round(altitude * 1000) });
  }

  const works: PlanWork[] = [];
  for (const o of raw.ouvrages ?? []) {
    const name = clean(o.nom, 120);
    const kind = (PLAN_WORK_KINDS as readonly string[]).includes(o.mesure)
      ? (o.mesure as PlanWorkKind)
      : null;
    if (!name || kind === null) continue;
    if (works.length >= MAX_PLAN_WORKS) break;
    const file = whole(o.fichier, 1, lastFile);
    const fromPhoto = file !== null && photoFiles.includes(file);

    let quantityMilli: number | null = null;
    let source: PlanWorkSource = fromPhoto ? "photo" : "plan";
    let detail: string | null = null;
    if (kind === "nombre") {
      const n = whole(o.quantite, 1, 99_999);
      if (n !== null) {
        quantityMilli = n * 1000;
        if (o.compte === true && !fromPhoto) source = "compte";
      }
    } else {
      const written = within(o.quantite, 0, MAX_WORK_MILLI / 1000);
      if (written !== null) {
        quantityMilli = Math.round(written * 1000) || null;
      } else if (kind === "surface") {
        // Surface non écrite : deux cotes écrites, ou surface au sol écrite × coefficient de pente.
        const length = within(o.longueur_m, 0, 1000);
        const width = within(o.largeur_m, 0, 1000);
        const ground = within(o.surface_m2, 0, 1_000_000);
        const factor = slopeFactorMilli(o.pente, o.pente_unite);
        if (length !== null && width !== null) {
          const lengthMm = Math.round(length * 1000);
          const widthMm = Math.round(width * 1000);
          const area = Math.round((lengthMm * widthMm) / 1000);
          if (area > 0 && area <= MAX_WORK_MILLI) {
            quantityMilli = area;
            source = "calcul";
            detail = `${formatPlanMeasure(lengthMm)} m × ${formatPlanMeasure(widthMm)} m`;
          }
        } else if (ground !== null && factor !== null) {
          const groundMilli = Math.round(ground * 1000);
          const area = Math.round((groundMilli * factor) / 1000);
          if (area > 0 && area <= MAX_WORK_MILLI) {
            quantityMilli = area;
            source = "calcul";
            const slope = `${plainNumber.format(o.pente as number)}${o.pente_unite === "degres" ? "°" : " %"}`;
            detail = `${formatPlanMeasure(groundMilli)} m² × ${three.format(factor / 1000)} (pente ${slope})`;
          }
        }
      } else if (kind === "volume") {
        // Volume non écrit : surface lue × épaisseur lue, ou × différence de deux altitudes lues.
        const area = within(o.surface_m2, 0, 1_000_000);
        const areaMilli = area === null ? 0 : Math.round(area * 1000);
        const thickness = within(o.epaisseur_m, 0, 50);
        const high = typeof o.altitude_haute_m === "number" ? o.altitude_haute_m : null;
        const low = typeof o.altitude_basse_m === "number" ? o.altitude_basse_m : null;
        const highMm = high === null || !Number.isFinite(high) ? null : Math.round(high * 1000);
        const lowMm = low === null || !Number.isFinite(low) ? null : Math.round(low * 1000);
        let heightMm = 0;
        let factor = "";
        if (thickness !== null) {
          heightMm = Math.round(thickness * 1000);
          factor = `${formatPlanMeasure(heightMm)} m`;
        } else if (
          highMm !== null &&
          lowMm !== null &&
          highMm > lowMm &&
          highMm - lowMm <= 50_000
        ) {
          heightMm = highMm - lowMm;
          factor = `(${formatPlanMeasure(highMm)} − ${formatPlanMeasure(lowMm)})`;
        }
        const volume = Math.round((areaMilli * heightMm) / 1000);
        if (areaMilli > 0 && heightMm > 0 && volume > 0 && volume <= MAX_WORK_MILLI) {
          quantityMilli = volume;
          source = "calcul";
          detail = `${formatPlanMeasure(areaMilli)} m² × ${factor}`;
        }
      }
    }
    const trade = clean(o.metier, 60);
    works.push({
      name,
      kind,
      quantityMilli,
      source,
      detail,
      trade: trade && trades.includes(trade) ? trade : null,
      file,
      page: whole(o.page, 1, 999),
      uncertain: o.certitude === "incertaine" || (fromPhoto && source === "calcul"),
    });
  }
  return { works, pages, levels };
}

/** Chiffres du relevé d'ouvrages : écrits, calculés, comptés, à vérifier et à compléter. */
export function planWorksFigures(
  works: readonly Pick<PlanWork, "quantityMilli" | "source" | "uncertain">[],
) {
  const filled = works.filter((w) => w.quantityMilli !== null);
  return {
    works: works.length,
    written: filled.filter((w) => w.source === "plan").length,
    computed: filled.filter((w) => w.source === "calcul").length,
    counted: filled.filter((w) => w.source === "compte").length,
    toCheck: filled.filter((w) => w.source === "photo" || w.uncertain).length,
    missing: works.length - filled.length,
  };
}

/** Types de pages reconnus, sans doublon, dans l'ordre des pages. */
export function planPageTypes(pages: readonly PlanPage[]): PlanPageType[] {
  return [...new Set(pages.map((p) => p.type))];
}
