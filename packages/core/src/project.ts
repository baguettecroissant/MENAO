/** Projet de travaux d'un particulier (F-05 à F-07). */

export const LIEU_TYPES = ["appartement", "maison", "jardin", "entreprise"] as const;
export type LieuType = (typeof LIEU_TYPES)[number];

/** Tranches de surface de la spec : < 10, 10–20, 20–50, > 50 m². */
export const SURFACE_TRANCHES = ["moins_10", "10_20", "20_50", "plus_50"] as const;
export type SurfaceTranche = (typeof SURFACE_TRANCHES)[number];

/**
 * Budget approximatif (lot 7 du plan V1.1, ADR 0163), en euros TTC : facultatif, donné par le
 * particulier ou repris de sa description ; jamais estimé par l'IA.
 */
export const BUDGET_TRANCHES = [
  "moins_1000",
  "1000_5000",
  "5000_15000",
  "15000_50000",
  "plus_50000",
] as const;
export type BudgetTranche = (typeof BUDGET_TRANCHES)[number];

/**
 * Budget minimum réglé par l'artisan (ADR 0164) : à partir de 1 000, 5 000, 15 000 ou 50 000 €.
 * Une demande ne lui est pas proposée si son budget annoncé est inférieur ; une demande sans budget
 * reste proposée à tous. Même règle dans `match_artisans`.
 */
export const BUDGET_MINIMUM_OPTIONS = [
  "1000_5000",
  "5000_15000",
  "15000_50000",
  "plus_50000",
] as const satisfies readonly BudgetTranche[];
export type BudgetMinimum = (typeof BUDGET_MINIMUM_OPTIONS)[number];

export function budgetMeetsMinimum(
  budget: BudgetTranche | null,
  minimum: BudgetMinimum | null,
): boolean {
  if (!budget || !minimum) return true;
  return BUDGET_TRANCHES.indexOf(budget) >= BUDGET_TRANCHES.indexOf(minimum);
}

export const DATE_SOUHAIT_MODES = ["des_que_possible", "date", "inconnue"] as const;
export type DateSouhaitMode = (typeof DATE_SOUHAIT_MODES)[number];

/** Date du jour à Paris, au format AAAA-MM-JJ (dates de début de chantier). */
export function parisToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(now);
}

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

/**
 * Photos conseillées (ADR 0163) : sans photo, quand la description reste vague (peu détaillée,
 * travaux non identifiés ou analyse peu sûre). Un conseil, jamais une obligation.
 */
export function photosAdvised(p: {
  description: string;
  photoCount: number;
  workTypeCount: number;
  /** Confiance de l'analyse IA, null sans analyse. */
  confidence: number | null;
}): boolean {
  if (p.photoCount > 0) return false;
  return (
    needHelpLevel(p.description) !== "suffisant" ||
    p.workTypeCount === 0 ||
    (p.confidence !== null && p.confidence < AI_CONFIDENCE_THRESHOLD)
  );
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
/** Demande reformulée pour l'artisan : 800 caractères au plus (colonne `artisan_brief`). */
export const ARTISAN_BRIEF_MAX_LENGTH = 800;
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
  budget_tranche: string | null;
  brief_artisan: string | null;
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
  budget: BudgetTranche | null;
  /** Demande reformulée pour l'artisan (ADR 0163), quelques phrases neutres. */
  artisanBrief: string | null;
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
    budget_tranche: nullable({ type: "string", enum: [...BUDGET_TRANCHES] }),
    brief_artisan: nullable({ type: "string" }),
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
    budget: pick(raw.budget_tranche, BUDGET_TRANCHES),
    artisanBrief: cleanText(raw.brief_artisan, ARTISAN_BRIEF_MAX_LENGTH),
    confiance: Number.isFinite(raw.confiance) ? Math.min(1, Math.max(0, raw.confiance)) : 0,
  };
}

export function analysisNeedsFallback(c: NeedCriteria): boolean {
  return c.tradeCode === null || c.confiance < AI_CONFIDENCE_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Description modifiée à l'étape des critères (F-07)
// ---------------------------------------------------------------------------

/** Critères enregistrés d'un projet, que la nouvelle analyse peut compléter. */
export type ProjectCriteriaState = {
  tradeCode: string | null;
  lieuType: LieuType | null;
  roomCodes: string[];
  workTypeCodes: string[];
  surface: SurfaceTranche | null;
  villeCodeInsee: string | null;
  adresse: string | null;
  dateMode: DateSouhaitMode;
  dateSouhaitee: string | null;
};

/** Cartes de la vérification des critères (F-07) complétées par la nouvelle analyse. */
export type CompletedSection = "trade" | "site" | "address" | "date";

export type CriteriaCompletion = Omit<ProjectCriteriaState, "villeCodeInsee" | "adresse"> & {
  /** Reprendre la ville analysée : aucune ville n'était choisie. */
  takeVille: boolean;
  /** Reprendre l'adresse analysée : aucune adresse n'était choisie, et elle est dans la ville. */
  takeAdresse: boolean;
  completed: CompletedSection[];
};

/**
 * Le particulier modifie sa description à l'étape des critères (ADR 0044) : la nouvelle analyse
 * complète les critères encore vides et ne remplace jamais un choix déjà fait. Les travaux ne
 * sont repris que s'ils relèvent du métier retenu. `place` : ville analysée (code INSEE) et
 * adresse analysée, une fois géocodées dans cette ville ; null si introuvables.
 */
export function completeCriteria(
  current: ProjectCriteriaState,
  analysed: NeedCriteria,
  place: { villeCode: string | null; adresse: string | null },
): CriteriaCompletion {
  const tradeCode = current.tradeCode ?? analysed.tradeCode;
  const lieuType = current.lieuType ?? analysed.lieuType;
  const roomCodes = current.roomCodes.length ? current.roomCodes : analysed.roomCodes;
  const workTypeCodes = current.workTypeCodes.length
    ? current.workTypeCodes
    : analysed.tradeCode === tradeCode
      ? analysed.workTypeCodes
      : [];
  const surface = current.surface ?? analysed.surface;
  const takeVille = current.villeCodeInsee === null && place.villeCode !== null;
  const villeCode = takeVille ? place.villeCode : current.villeCodeInsee;
  const takeAdresse =
    current.adresse === null &&
    place.adresse !== null &&
    place.villeCode !== null &&
    place.villeCode === villeCode;
  const takeDate = current.dateMode === "inconnue" && analysed.dateMode !== "inconnue";

  const completed: CompletedSection[] = [];
  if (current.tradeCode === null && tradeCode !== null) completed.push("trade");
  if (
    (current.lieuType === null && lieuType !== null) ||
    (!current.roomCodes.length && roomCodes.length > 0) ||
    (!current.workTypeCodes.length && workTypeCodes.length > 0) ||
    (current.surface === null && surface !== null)
  ) {
    completed.push("site");
  }
  if (takeVille || takeAdresse) completed.push("address");
  if (takeDate) completed.push("date");

  return {
    tradeCode,
    lieuType,
    roomCodes,
    workTypeCodes,
    surface,
    dateMode: takeDate ? analysed.dateMode : current.dateMode,
    dateSouhaitee: takeDate ? analysed.dateSouhaitee : current.dateSouhaitee,
    takeVille,
    takeAdresse,
    completed,
  };
}
