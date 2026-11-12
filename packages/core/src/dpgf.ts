/**
 * Appels d'offres (F-136, ADR 0287) : lecture du DPGF d'un architecte (Décomposition du Prix Global
 * et Forfaitaire), rapprochement avec les prix des anciens devis de l'artisan, totaux et écarts de
 * quantités. Fonctions pures : la feuille Excel est lue ailleurs (Edge Function tender-sheet) et
 * arrive ici sous forme de grille de cellules. Totaux et écarts : ./dpgf-totals.
 */

/**
 * Unités d'un devis MENAO (mêmes valeurs que `QuoteUnit` de ./quote) : ce module n'importe rien,
 * pour être lu tel quel par l'Edge Function tender-sheet (Deno).
 */
export type DpgfUnit = "u" | "h" | "jour" | "m" | "ml" | "m2" | "m3" | "kg" | "l" | "forfait";

/** Valeur d'une cellule une fois lue : texte, nombre, ou vide. */
export type DpgfCell = string | number | null;

/** Nombre maximal de lignes gardées d'un DPGF (titres et postes). */
export const MAX_TENDER_LINES = 1000;

export type DpgfColumns = {
  code: number | null;
  designation: number;
  unit: number | null;
  quantity: number | null;
  unitPrice: number | null;
  total: number | null;
};

export type DpgfRow = {
  kind: "titre" | "poste";
  /**
   * Numéro de ligne dans la feuille (1 = première ligne), pour réécrire le fichier ; null pour un
   * DPGF lu dans un PDF.
   */
  sheetRow: number | null;
  code: string | null;
  designation: string;
  unitLabel: string | null;
  unit: DpgfUnit | null;
  quantityMilli: number | null;
  /** Lot en cours (« LOT 05 CARRELAGE, FAÏENCE »), null avant le premier lot. */
  lot: string | null;
};

export type DpgfWarning = "sans_colonne_prix" | "sans_quantites" | "tronque";

export type ParsedDpgf = {
  /** Ligne d'en-tête, indice dans la grille (0 = première ligne). */
  headerRow: number;
  columns: DpgfColumns;
  rows: DpgfRow[];
  warnings: DpgfWarning[];
};

/** Minuscules, sans accents, espaces simples. */
function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Lettres et chiffres seulement : « P.U. HT » → « puht ». */
const compact = (value: string) => normalize(value).replace(/[^a-z0-9]/g, "");
/** Mots séparés par des espaces : « Sous-total lot 05 » → « sous total lot 05 ». */
const words = (value: string) =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function cellText(cell: DpgfCell | undefined): string {
  if (cell === null || cell === undefined) return "";
  return typeof cell === "number" ? String(cell) : cell.replace(/\s+/g, " ").trim();
}

const UNIT_ALIASES: Record<string, DpgfUnit> = {
  u: "u",
  un: "u",
  unite: "u",
  unites: "u",
  nb: "u",
  pce: "u",
  piece: "u",
  pieces: "u",
  m2: "m2",
  m: "m",
  ml: "ml",
  mlin: "ml",
  m3: "m3",
  h: "h",
  heure: "h",
  heures: "h",
  j: "jour",
  jour: "jour",
  jours: "jour",
  kg: "kg",
  l: "l",
  litre: "l",
  ens: "forfait",
  ensemble: "forfait",
  ft: "forfait",
  fft: "forfait",
  forfait: "forfait",
  forf: "forfait",
};

/** Unité du DPGF vers l'unité d'un devis MENAO ; null si elle n'est pas reconnue. */
export function dpgfUnit(label: DpgfCell | undefined): DpgfUnit | null {
  const text = cellText(label);
  if (!text) return null;
  const key = compact(text.replace(/²/g, "2").replace(/³/g, "3"));
  return UNIT_ALIASES[key] ?? null;
}

/** Quantité en millièmes (2,5 → 2 500) ; null si vide, illisible ou négative. */
export function parseQuantityMilli(cell: DpgfCell | undefined): number | null {
  let value: number;
  if (typeof cell === "number") value = cell;
  else {
    const text = cellText(cell).replace(/\s/g, "").replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(text)) return null;
    value = Number(text);
  }
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 1000);
}

type Role = Exclude<keyof DpgfColumns, never>;

function roleOf(header: string): Role | null {
  const n = normalize(header);
  const c = compact(header);
  if (!c) return null;
  if (/designation|libelle|description|ouvrage|intitule|nature des travaux/.test(n)) {
    return "designation";
  }
  if (/^(pu|prixunit|prixu)/.test(c)) return "unitPrice";
  if (/^(montant|total|prixtotal|pt|mt)/.test(c)) return "total";
  if (/^(q|qt|qte|qtes|quantite|quantites)$/.test(c) || /^(qte|quantite)/.test(c)) {
    return "quantity";
  }
  if (/^(u|un|unite|unites|unit)$/.test(c)) return "unit";
  if (/^(n|no|num|numero|ref|reference|art|article|poste|item|repere|code|index)$/.test(c)) {
    return "code";
  }
  return null;
}

/** Ligne d'en-tête : une colonne désignation et au moins deux autres colonnes reconnues. */
export function findDpgfHeader(
  grid: readonly (readonly DpgfCell[])[],
): { row: number; columns: DpgfColumns } | null {
  for (let r = 0; r < Math.min(grid.length, 40); r++) {
    const found: Partial<Record<Role, number>> = {};
    (grid[r] ?? []).forEach((cell, c) => {
      const role = roleOf(cellText(cell));
      if (role && found[role] === undefined) found[role] = c;
    });
    const others = (["code", "unit", "quantity", "unitPrice", "total"] as const).filter(
      (role) => found[role] !== undefined,
    ).length;
    if (found.designation !== undefined && others >= 2) {
      return {
        row: r,
        columns: {
          code: found.code ?? null,
          designation: found.designation,
          unit: found.unit ?? null,
          quantity: found.quantity ?? null,
          unitPrice: found.unitPrice ?? null,
          total: found.total ?? null,
        },
      };
    }
  }
  return null;
}

const SUMMARY = /^(sous total|total|montant total|montant global|tva|net a payer|report)\b/;

/**
 * Titres (lots, sections) et postes du DPGF, dans l'ordre de la feuille. Les lignes de totaux et de
 * TVA sont ignorées : MENAO recalcule les montants.
 */
export function parseDpgfGrid(grid: readonly (readonly DpgfCell[])[]): ParsedDpgf | null {
  const header = findDpgfHeader(grid);
  if (!header) return null;
  const { columns } = header;
  const at = (row: readonly DpgfCell[], index: number | null) =>
    index === null ? null : (row[index] ?? null);
  const rows: DpgfRow[] = [];
  const warnings: DpgfWarning[] = [];
  let lot: string | null = null;

  for (let r = header.row + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const code = cellText(at(row, columns.code)) || null;
    const designation = cellText(at(row, columns.designation));
    if (!designation && !code) continue;
    const label = [code, designation].filter(Boolean).join(" ");
    if (SUMMARY.test(words(designation || label))) continue;

    const unitLabel = cellText(at(row, columns.unit)) || null;
    const quantityMilli = parseQuantityMilli(at(row, columns.quantity));
    const isPost = quantityMilli !== null || unitLabel !== null;
    if (!isPost && /^lot\b/.test(words(label))) lot = label;
    if (rows.length >= MAX_TENDER_LINES) {
      warnings.push("tronque");
      break;
    }
    rows.push({
      kind: isPost ? "poste" : "titre",
      sheetRow: r + 1,
      code,
      designation: designation || label,
      unitLabel,
      unit: dpgfUnit(unitLabel),
      quantityMilli,
      lot,
    });
  }
  if (columns.unitPrice === null && columns.total === null) warnings.push("sans_colonne_prix");
  if (rows.some((r) => r.kind === "poste") && !rows.some((r) => r.quantityMilli !== null)) {
    warnings.push("sans_quantites");
  }
  return { headerRow: header.row, columns, rows, warnings };
}

// ---------------------------------------------------------------------------------------------
// DPGF lu dans un PDF (Edge Function tender-sheet, modèle de langage, ADR 0288)
// ---------------------------------------------------------------------------------------------

/** Réponse brute du modèle, déjà validée par l'Edge Function. */
export type DpgfReadingRaw = {
  lisible: boolean;
  est_un_dpgf: boolean;
  lignes: {
    type: "titre" | "poste";
    numero: string | null;
    designation: string;
    unite: string | null;
    quantite: number | null;
  }[];
};

export type DpgfReadingWarning = "illisible" | "pas_un_dpgf" | "tronque" | "sans_quantites";

/** Schéma JSON de la réponse attendue (sortie structurée du modèle). */
export function dpgfReadingJsonSchema(): Record<string, unknown> {
  const nullable = (type: string) => ({ type: [type, "null"] });
  return {
    type: "object",
    additionalProperties: false,
    required: ["lisible", "est_un_dpgf", "lignes"],
    properties: {
      lisible: { type: "boolean" },
      est_un_dpgf: { type: "boolean" },
      lignes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["type", "numero", "designation", "unite", "quantite"],
          properties: {
            type: { type: "string", enum: ["titre", "poste"] },
            numero: nullable("string"),
            designation: { type: "string" },
            unite: nullable("string"),
            quantite: nullable("number"),
          },
        },
      },
    },
  };
}

/**
 * Lignes d'un DPGF lu par le modèle, mises dans la même forme que celles d'une feuille Excel :
 * titres (lots), postes avec unité ramenée à celle des devis, lignes de totaux et désignations
 * vides écartées.
 */
export function normalizeDpgfReading(raw: DpgfReadingRaw): {
  rows: DpgfRow[];
  warnings: DpgfReadingWarning[];
} {
  const warnings: DpgfReadingWarning[] = [];
  if (!raw.lisible) warnings.push("illisible");
  if (!raw.est_un_dpgf) warnings.push("pas_un_dpgf");
  const rows: DpgfRow[] = [];
  let lot: string | null = null;
  for (const line of raw.lignes) {
    const designation = cellText(line.designation).slice(0, 500);
    const code = cellText(line.numero).slice(0, 40) || null;
    if (!designation) continue;
    const label = [code, designation].filter(Boolean).join(" ");
    if (SUMMARY.test(words(designation))) continue;
    if (rows.length >= MAX_TENDER_LINES) {
      warnings.push("tronque");
      break;
    }
    const unitLabel = cellText(line.unite).slice(0, 20) || null;
    const isPost = line.type === "poste";
    if (!isPost && /^lot\b/.test(words(label))) lot = label;
    rows.push({
      kind: isPost ? "poste" : "titre",
      sheetRow: null,
      code,
      designation,
      unitLabel: isPost ? unitLabel : null,
      unit: isPost ? dpgfUnit(unitLabel) : null,
      quantityMilli: isPost ? parseQuantityMilli(line.quantite) : null,
      lot,
    });
  }
  if (rows.some((r) => r.kind === "poste") && !rows.some((r) => r.quantityMilli !== null)) {
    warnings.push("sans_quantites");
  }
  return { rows, warnings };
}

// ---------------------------------------------------------------------------------------------
// Prix repris des anciens devis
// ---------------------------------------------------------------------------------------------

export type PriceHistoryLine = {
  designation: string;
  unit: DpgfUnit;
  unitPriceHtCents: number;
  /** AAAA-MM-JJ : date du devis d'où vient le prix. */
  usedOn: string;
};

export type TenderPriceSuggestion = {
  unitPriceHtCents: number;
  /** Désignation de la ligne de devis reprise. */
  reference: string;
  usedOn: string;
};

const STOPWORDS = new Set([
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "en",
  "et",
  "au",
  "aux",
  "pour",
  "sur",
  "sous",
  "avec",
  "compris",
  "yc",
  "un",
  "une",
  "par",
  "dans",
  "y",
]);

/** Mots utiles d'une désignation : « Carrelage sol 60 x 60 » → carrelage, sol, 60x60. */
function keywords(text: string): Set<string> {
  const base = words(text.replace(/(\d)\s*[x×*]\s*(\d)/gi, "$1x$2"));
  const out = new Set<string>();
  for (const word of base.split(" ")) {
    if (!word || STOPWORDS.has(word)) continue;
    if (!/\d/.test(word) && word.length < 3) continue;
    // Singulier approximatif : « plinthes » et « plinthe » se rejoignent.
    out.add(word.length > 4 && /[sx]$/.test(word) ? word.slice(0, -1) : word);
  }
  return out;
}

/** Part minimale de mots communs (rapportée à la désignation la plus courte). */
const MIN_SIMILARITY = 0.5;

/**
 * Prix proposé pour un poste : la ligne d'un ancien devis de même unité dont la désignation
 * ressemble le plus (mots communs), la plus récente à ressemblance égale. Une suggestion, que
 * l'artisan vérifie : jamais un prix certain.
 */
export function suggestTenderPrice(
  post: { designation: string; unit: DpgfUnit | null },
  history: readonly PriceHistoryLine[],
): TenderPriceSuggestion | null {
  const wanted = keywords(post.designation);
  if (wanted.size === 0) return null;
  let best: { score: number; common: number; line: PriceHistoryLine } | null = null;
  for (const line of history) {
    if (post.unit && line.unit !== post.unit) continue;
    if (line.unitPriceHtCents <= 0) continue;
    const have = keywords(line.designation);
    if (have.size === 0) continue;
    let common = 0;
    for (const word of wanted) if (have.has(word)) common++;
    if (common === 0) continue;
    const score = common / Math.min(wanted.size, have.size);
    if (score < MIN_SIMILARITY) continue;
    const better =
      !best ||
      score > best.score ||
      (score === best.score && common > best.common) ||
      (score === best.score && common === best.common && line.usedOn > best.line.usedOn);
    if (better) best = { score, common, line };
  }
  return best
    ? {
        unitPriceHtCents: best.line.unitPriceHtCents,
        reference: best.line.designation,
        usedOn: best.line.usedOn,
      }
    : null;
}
