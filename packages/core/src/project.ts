/** Projet de travaux d'un particulier (F-05 à F-07). */

export const LIEU_TYPES = ["appartement", "maison", "jardin", "entreprise"] as const;
export type LieuType = (typeof LIEU_TYPES)[number];

/** Tranches de surface de la spec : < 10, 10–20, 20–50, > 50 m². */
export const SURFACE_TRANCHES = ["moins_10", "10_20", "20_50", "plus_50"] as const;
export type SurfaceTranche = (typeof SURFACE_TRANCHES)[number];

export const DATE_SOUHAIT_MODES = ["des_que_possible", "date", "inconnue"] as const;
export type DateSouhaitMode = (typeof DATE_SOUHAIT_MODES)[number];

export const PROJECT_TEXT_MAX_LENGTH = 5000;
export const MAX_PROJECT_PHOTOS = 10;
/** Durée maximale d'une dictée (F-05 côté particulier ; F-19 : 2 min côté artisan). */
export const MAX_DICTATION_SECONDS = 120;

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
// Numéros français (0X XX XX XX XX, +33…, 0033…) et internationaux (+CC suivi de 6 à 14 chiffres).
const PHONE = /(?:\+|00)\d{1,3}[\s.-]?\d(?:[\s.-]?\d{2}){3,6}|\b0[1-9](?:[\s.-]?\d{2}){4}\b/g;

/**
 * Retire e-mails et numéros de téléphone d'un texte avant de l'envoyer à l'IA ou de le
 * journaliser (spec F-06, CLAUDE.md règle 11).
 */
export function scrubPersonalData(text: string): string {
  return text.replace(EMAIL, "[e-mail]").replace(PHONE, "[téléphone]");
}

/** Niveau de détail de la description, pour l'aide contextuelle sous le champ (F-05). */
export function needHelpLevel(text: string): "vide" | "insuffisant" | "suffisant" {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return "vide";
  return words < 12 ? "insuffisant" : "suffisant";
}

/** F-07 : la recherche d'artisans exige au moins un métier et une ville. */
export function canSearchArtisans(p: {
  tradeCode: string | null;
  villeCodeInsee: string | null;
}): boolean {
  return Boolean(p.tradeCode && p.villeCodeInsee);
}

// ---------------------------------------------------------------------------
// Analyse IA du besoin (F-06)
// ---------------------------------------------------------------------------

/** En dessous de ce seuil (ou sans métier identifié), on interroge le modèle de secours. */
export const AI_CONFIDENCE_THRESHOLD = 0.7;
const MAX_DATE_YEARS_AHEAD = 2;

/** Réponse du modèle, telle que décrite par needAnalysisJsonSchema (spec F-06). */
export type RawNeedAnalysis = {
  metier: string | null;
  lieu_type: string | null;
  pieces: string[];
  travaux: string[];
  surface_tranche: string | null;
  ville: string | null;
  code_postal: string | null;
  adresse: string | null;
  date_souhaitee: string | null;
  urgence: boolean;
  resume: string | null;
  confiance: number;
};

export type NeedReferentials = {
  trades: string[];
  workTypes: { code: string; trade: string }[];
  rooms: string[];
};

export type NeedCriteria = {
  tradeCode: string | null;
  lieuType: LieuType | null;
  roomCodes: string[];
  workTypeCodes: string[];
  surface: SurfaceTranche | null;
  ville: string | null;
  codePostal: string | null;
  adresse: string | null;
  dateMode: DateSouhaitMode;
  dateSouhaitee: string | null;
  urgence: boolean;
  summary: string | null;
  confiance: number;
};

const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: "null" }] });

/**
 * Schéma JSON envoyé au modèle (sorties structurées) : listes fermées construites à partir des
 * référentiels, sans contraintes numériques ni de longueur (non prises en charge).
 */
export function needAnalysisJsonSchema(ref: NeedReferentials) {
  const properties = {
    metier: nullable({ type: "string", enum: ref.trades }),
    lieu_type: nullable({ type: "string", enum: [...LIEU_TYPES] }),
    pieces: { type: "array", items: { type: "string", enum: ref.rooms } },
    travaux: { type: "array", items: { type: "string", enum: ref.workTypes.map((w) => w.code) } },
    surface_tranche: nullable({ type: "string", enum: [...SURFACE_TRANCHES] }),
    ville: nullable({ type: "string" }),
    code_postal: nullable({ type: "string" }),
    adresse: nullable({ type: "string" }),
    date_souhaitee: nullable({ type: "string", format: "date" }),
    urgence: { type: "boolean" },
    resume: nullable({ type: "string" }),
    confiance: { type: "number" },
  };
  return {
    type: "object" as const,
    properties,
    required: Object.keys(properties) as (keyof typeof properties)[],
    additionalProperties: false as const,
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.replace(/\s+/g, " ").trim();
  return v === "" ? null : v.slice(0, max);
}

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function addYears(isoDay: string, years: number): string {
  return `${Number(isoDay.slice(0, 4)) + years}${isoDay.slice(4)}`;
}

/**
 * Ramène la réponse du modèle aux référentiels MENAO : codes inconnus écartés, travaux limités au
 * métier retenu, dates passées refusées (today au format AAAA-MM-JJ, fuseau Europe/Paris).
 */
export function normalizeNeedAnalysis(
  raw: RawNeedAnalysis,
  ref: NeedReferentials,
  today: string,
): NeedCriteria {
  const tradeCode = pick(raw.metier, ref.trades);
  const works = new Set(ref.workTypes.filter((w) => w.trade === tradeCode).map((w) => w.code));
  const rooms = new Set(ref.rooms);
  const unique = (codes: unknown[], allowed: Set<string>) =>
    [...new Set(codes.filter((c): c is string => typeof c === "string" && allowed.has(c)))].slice(
      0,
      20,
    );

  const date =
    typeof raw.date_souhaitee === "string" &&
    ISO_DATE.test(raw.date_souhaitee) &&
    raw.date_souhaitee >= today &&
    raw.date_souhaitee <= addYears(today, MAX_DATE_YEARS_AHEAD)
      ? raw.date_souhaitee
      : null;
  const urgence = raw.urgence === true;
  const postcode = typeof raw.code_postal === "string" ? raw.code_postal.trim() : "";

  return {
    tradeCode,
    lieuType: pick(raw.lieu_type, LIEU_TYPES),
    roomCodes: unique(Array.isArray(raw.pieces) ? raw.pieces : [], rooms),
    workTypeCodes: unique(Array.isArray(raw.travaux) ? raw.travaux : [], works),
    surface: pick(raw.surface_tranche, SURFACE_TRANCHES),
    ville: cleanText(raw.ville, 100),
    codePostal: /^\d{5}$/.test(postcode) ? postcode : null,
    adresse: cleanText(raw.adresse, 200),
    dateMode: date ? "date" : urgence ? "des_que_possible" : "inconnue",
    dateSouhaitee: date,
    urgence,
    summary: cleanText(raw.resume, 300),
    confiance: Number.isFinite(raw.confiance) ? Math.min(1, Math.max(0, raw.confiance)) : 0,
  };
}

export function analysisNeedsFallback(c: NeedCriteria): boolean {
  return c.tradeCode === null || c.confiance < AI_CONFIDENCE_THRESHOLD;
}
