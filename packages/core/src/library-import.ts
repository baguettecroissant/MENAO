/**
 * Import d'un catalogue dans la bibliothèque (F-148, ADR 0309, maquette lot 42) : colonnes
 * reconnues par leurs titres, puis par leur contenu ; prix, unités et TVA lus ; lignes classées
 * (nouvelles, déjà présentes, à corriger). Logique pure, partagée par la fonction de lecture et
 * les écrans. Aucun montant flottant : tout en centimes et en points de base.
 */
// Autonome (aucun import) : fichier lu tel quel par la fonction Deno library-import.

export type ImportKind = "ouvrages" | "fournitures";
export type ImportCell = string | number | null;
/** Unités d'un devis MENAO (QUOTE_UNITS). */
type ImportUnit = "u" | "h" | "jour" | "m" | "ml" | "m2" | "m3" | "kg" | "l" | "forfait";

function cellText(cell: ImportCell | undefined): string {
  if (cell === null || cell === undefined) return "";
  return typeof cell === "number" ? String(cell) : cell.replace(/\s+/g, " ").trim();
}

// Mêmes alias que le DPGF (dpgf.ts), plus quelques écritures courantes des catalogues.
const UNIT_ALIASES: Record<string, ImportUnit> = {
  u: "u",
  un: "u",
  unite: "u",
  unites: "u",
  nb: "u",
  pce: "u",
  pc: "u",
  piece: "u",
  pieces: "u",
  m2: "m2",
  mq: "m2",
  m: "m",
  ml: "ml",
  mlin: "ml",
  metrelineaire: "ml",
  m3: "m3",
  h: "h",
  hr: "h",
  heure: "h",
  heures: "h",
  j: "jour",
  jr: "jour",
  jour: "jour",
  jours: "jour",
  kg: "kg",
  l: "l",
  litre: "l",
  litres: "l",
  ens: "forfait",
  ensemble: "forfait",
  ft: "forfait",
  fft: "forfait",
  ff: "forfait",
  forfait: "forfait",
  forf: "forfait",
};

export const IMPORT_ROLES = [
  "designation",
  "unit",
  "price",
  "vat",
  "description",
  "reference",
  "supplier",
  "ignore",
] as const;
export type ImportRole = (typeof IMPORT_ROLES)[number];

/** Rôles proposés selon le contenu du fichier : TVA pour les ouvrages, référence et fournisseur pour les fournitures. */
export function importRolesFor(kind: ImportKind): readonly ImportRole[] {
  return kind === "ouvrages"
    ? ["designation", "unit", "price", "vat", "description", "ignore"]
    : ["designation", "unit", "price", "reference", "supplier", "ignore"];
}

/** 5 000 lignes au plus par import (maquette). */
export const MAX_IMPORT_ROWS = 5000;
/** 40 colonnes lues au plus. */
export const MAX_IMPORT_COLUMNS = 40;
const VAT_RATES = [0, 550, 1000, 2000] as const;

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const compact = (value: string) => normalize(value).replace(/[^a-z0-9]/g, "");

/** Lettre de colonne façon tableur : 0 → A, 26 → AA. */
export function columnLetter(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Rôle d'une colonne d'après son titre (« Libellé », « PU HT », « Tx TVA ») ; null si inconnu. */
export function roleOfHeader(title: string, kind: ImportKind): ImportRole | null {
  const c = compact(title);
  if (!c) return null;
  if (/^(tva|txtva|tauxtva|tauxdetva|tauxtva\d*|vat)/.test(c))
    return kind === "ouvrages" ? "vat" : null;
  if (
    /^(ref|refs|reference|references|refarticle|referencearticle|codearticle|code|sku|ean|gencod|codebarre)/.test(
      c,
    )
  ) {
    return kind === "fournitures" ? "reference" : null;
  }
  if (/^(fournisseur|fournisseurs|distributeur|negoce|grossiste|magasin)/.test(c)) {
    return kind === "fournitures" ? "supplier" : null;
  }
  if (/^(u|un|unite|unites|unit|udm|uv|unitedemesure|unitedevente|unitevente)$/.test(c))
    return "unit";
  if (
    /prix|tarif/.test(c) ||
    /^(pu|puht|pa|paht|pv|pvht|px|pxht|pxvente|pxachat|pxnet|netht|montantht)$/.test(c) ||
    /^(pu|cout)/.test(c)
  ) {
    return "price";
  }
  if (/^(descriptif|detail|details|precision|precisions|commentaire|observations?)/.test(c)) {
    return "description";
  }
  if (/^description/.test(c)) return "description";
  if (
    /^(designation|libelle|intitule|article|ouvrage|prestation|produit|nom|denomination|desig|lib|poste|nature)/.test(
      c,
    )
  ) {
    return "designation";
  }
  return null;
}

/**
 * Ligne de titres : parmi les 10 premières, la première où deux colonnes au moins sont reconnues ;
 * -1 si aucune (fichier sans titres).
 */
export function findHeaderRow(grid: readonly (readonly ImportCell[])[], kind: ImportKind): number {
  for (let r = 0; r < Math.min(grid.length, 10); r++) {
    const roles = (grid[r] ?? []).map((cell) =>
      typeof cell === "string" ? roleOfHeader(cell, kind) : null,
    );
    if (roles.filter(Boolean).length >= 2) return r;
  }
  return -1;
}

/** Prix en centimes : « 12,50 », « 1 250,00 € », « 1.250,00 », 12.5 ; null si vide, undefined si illisible. */
export function parseImportPrice(cell: ImportCell | undefined): number | null | undefined {
  if (cell === null || cell === undefined) return null;
  if (typeof cell === "number") {
    return Number.isFinite(cell) && cell >= 0 && cell <= 1_000_000
      ? Math.round(cell * 100)
      : undefined;
  }
  let text = cell.replace(/\s/g, "").replace(/(€|eur|euros?|ht|ttc)/gi, "");
  if (!text) return null;
  // « 1.250,00 » ou « 1,250.00 » : le dernier séparateur est la virgule décimale.
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    text = lastComma > lastDot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (lastComma >= 0) {
    text = text.replace(",", ".");
  }
  if (!/^\d{1,7}(\.\d{1,4})?$/.test(text)) return undefined;
  return Math.round(Number(text) * 100);
}

/** Unité d'un devis : « m² », « M2 », « ens », « pce » ; null si vide, undefined si inconnue. */
export function parseImportUnit(cell: ImportCell | undefined): ImportUnit | null | undefined {
  const text = cellText(cell);
  if (!text) return null;
  return UNIT_ALIASES[compact(text.replace(/²/g, "2").replace(/³/g, "3"))] ?? undefined;
}

/** TVA en points de base : « 10 % », « 5,5 », 0.2 (cellule en pourcentage) ; null si vide, undefined si inconnue. */
export function parseImportVat(cell: ImportCell | undefined): number | null | undefined {
  if (cell === null || cell === undefined) return null;
  let value: number;
  if (typeof cell === "number") value = cell > 0 && cell < 1 ? cell * 100 : cell;
  else {
    const text = cell.replace(/\s/g, "").replace("%", "").replace(",", ".");
    if (!text) return null;
    if (!/^\d+(\.\d+)?$/.test(text)) return undefined;
    value = Number(text);
    if (value > 0 && value < 1) value *= 100;
  }
  const bp = Math.round(value * 100);
  return (VAT_RATES as readonly number[]).includes(bp) ? bp : undefined;
}

export type ColumnRecognition = {
  /** Index de la ligne de titres ; -1 sans titres. */
  headerRow: number;
  roles: ImportRole[];
  /** Colonnes reconnues automatiquement (titre ou contenu). */
  recognized: boolean[];
  /** Désignation et prix trouvés : sinon, l'IA peut aider. */
  complete: boolean;
};

/**
 * Colonnes du fichier : par leurs titres d'abord, puis par leur contenu pour ce qui manque
 * (désignation = texte le plus long, prix = colonne de montants, unité = colonne d'unités).
 */
export function recognizeColumns(
  grid: readonly (readonly ImportCell[])[],
  kind: ImportKind,
): ColumnRecognition {
  const width = Math.min(
    MAX_IMPORT_COLUMNS,
    grid.slice(0, 50).reduce((w, row) => Math.max(w, row.length), 0),
  );
  const headerRow = findHeaderRow(grid, kind);
  const allowed = importRolesFor(kind);
  const roles: ImportRole[] = Array.from({ length: width }, () => "ignore");
  const recognized = roles.map(() => false);
  const taken = new Set<ImportRole>();
  if (headerRow >= 0) {
    (grid[headerRow] ?? []).slice(0, width).forEach((cell, i) => {
      const role = typeof cell === "string" ? roleOfHeader(cell, kind) : null;
      if (role && allowed.includes(role) && !taken.has(role)) {
        roles[i] = role;
        recognized[i] = true;
        taken.add(role);
      }
    });
    // Une seule colonne « Description » et pas de désignation : c'est la désignation.
    if (!taken.has("designation")) {
      const d = roles.indexOf("description");
      if (d >= 0) {
        roles[d] = "designation";
        taken.delete("description");
        taken.add("designation");
      }
    }
  }
  const sample = grid.slice(headerRow + 1, headerRow + 51);
  const free = (i: number) => roles[i] === "ignore" && !recognized[i];
  const share = (i: number, test: (cell: ImportCell | undefined) => boolean) => {
    const filled = sample.map((row) => row[i]).filter((c) => cellText(c) !== "");
    return filled.length === 0 ? 0 : filled.filter(test).length / filled.length;
  };
  if (!taken.has("unit")) {
    const i = roles.findIndex(
      (_, i) => free(i) && share(i, (c) => parseImportUnit(c) != null) >= 0.8,
    );
    if (i >= 0) {
      roles[i] = "unit";
      recognized[i] = true;
      taken.add("unit");
    }
  }
  if (!taken.has("designation")) {
    let best = -1;
    let bestLength = 0;
    roles.forEach((_, i) => {
      if (!free(i)) return;
      const texts = sample
        .map((row) => row[i])
        .filter((c) => typeof c === "string" && parseImportPrice(c) === undefined);
      const avg = texts.reduce<number>((s, c) => s + cellText(c).length, 0) / Math.max(1, sample.length);
      if (avg > bestLength && avg >= 6) {
        best = i;
        bestLength = avg;
      }
    });
    if (best >= 0) {
      roles[best] = "designation";
      recognized[best] = true;
      taken.add("designation");
    }
  }
  if (!taken.has("price")) {
    // La colonne de montants la plus à droite (souvent le prix unitaire, avant le total s'il existe).
    const candidates = roles
      .map((_, i) => i)
      .filter((i) => free(i) && share(i, (c) => typeof parseImportPrice(c) === "number") >= 0.8);
    const i = candidates[0];
    if (i !== undefined) {
      roles[i] = "price";
      recognized[i] = true;
      taken.add("price");
    }
  }
  return {
    headerRow,
    roles,
    recognized,
    complete: taken.has("designation") && taken.has("price"),
  };
}

export type ImportRow = {
  /** Numéro de ligne dans le fichier (1 = première ligne). */
  line: number;
  designation: string;
  unit: ImportUnit;
  priceCents: number;
  vatRateBp: number | null;
  description: string | null;
  reference: string | null;
  supplier: string | null;
};

export type ImportIssueReason =
  "designation" | "price" | "missing_price" | "unit" | "vat" | "too_long";
export type ImportIssue = {
  line: number;
  designation: string;
  reason: ImportIssueReason;
  value: string;
};

const clip = (text: string, max: number) => (text.length > max ? null : text);

/** Lignes du fichier, une fois les rôles des colonnes choisis ; lignes vides ignorées. */
export function buildImportRows(
  grid: readonly (readonly ImportCell[])[],
  headerRow: number,
  roles: readonly ImportRole[],
): { rows: ImportRow[]; issues: ImportIssue[] } {
  const col = (role: ImportRole) => roles.indexOf(role);
  const [d, u, p, v, desc, ref, sup] = (
    ["designation", "unit", "price", "vat", "description", "reference", "supplier"] as const
  ).map(col);
  const rows: ImportRow[] = [];
  const issues: ImportIssue[] = [];
  const data = grid.slice(headerRow + 1, headerRow + 1 + MAX_IMPORT_ROWS);
  data.forEach((row, k) => {
    const line = headerRow + 2 + k;
    if (row.every((c) => cellText(c) === "")) return;
    const at = (i: number | undefined) => (i !== undefined && i >= 0 ? row[i] : undefined);
    const designation = cellText(at(d));
    const issue = (reason: ImportIssueReason, value: ImportCell | undefined) =>
      issues.push({ line, designation, reason, value: cellText(value).slice(0, 60) });
    if (!designation) return issue("designation", at(d));
    if (designation.length > 200) return issue("too_long", "");
    const price = parseImportPrice(at(p));
    if (price === null) return issue("missing_price", at(p));
    if (price === undefined) return issue("price", at(p));
    const unit = u !== undefined && u >= 0 ? parseImportUnit(at(u)) : null;
    if (unit === undefined) return issue("unit", at(u));
    const vat = v !== undefined && v >= 0 ? parseImportVat(at(v)) : null;
    if (vat === undefined) return issue("vat", at(v));
    const text = (i: number | undefined, max: number) => {
      const t = cellText(at(i));
      return t ? (clip(t, max) ?? t.slice(0, max)) : null;
    };
    rows.push({
      line,
      designation,
      unit: unit ?? "u",
      priceCents: price,
      vatRateBp: vat,
      description: text(desc, 1000),
      reference: text(ref, 80),
      supplier: text(sup, 120),
    });
  });
  return { rows, issues };
}

/** Clé de doublon : même désignation (casse ignorée) et même unité. */
export const importKey = (designation: string, unit: string) =>
  `${designation.trim().toLowerCase()}|${unit}`;

/**
 * Lignes nouvelles et lignes déjà présentes dans la bibliothèque ; une ligne répétée dans le
 * fichier ne compte qu'une fois (la dernière l'emporte, comme une mise à jour).
 */
export function classifyImport(
  rows: readonly ImportRow[],
  existing: readonly { designation: string; unit: string }[],
): { fresh: ImportRow[]; existing: ImportRow[] } {
  const known = new Set(existing.map((e) => importKey(e.designation, e.unit)));
  const unique = new Map<string, ImportRow>();
  for (const row of rows) {
    const key = importKey(row.designation, row.unit);
    unique.delete(key);
    unique.set(key, row);
  }
  const fresh: ImportRow[] = [];
  const present: ImportRow[] = [];
  for (const [key, row] of unique) (known.has(key) ? present : fresh).push(row);
  return { fresh, existing: present };
}

/**
 * Fichier CSV : séparateur deviné (point-virgule, virgule ou tabulation) sur la première ligne,
 * guillemets gérés ; les nombres restent du texte (lus ensuite par parseImportPrice).
 */
export function parseCsv(text: string): ImportCell[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const counts = [";", ",", "\t"].map((s) => [s, firstLine.split(s).length - 1] as const);
  const sep = counts.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const rows: ImportCell[][] = [];
  let row: ImportCell[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
      continue;
    }
    if (ch === '"' && field === "") quoted = true;
    else if (ch === sep) {
      row.push(field.trim() || null);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(field.trim() || null);
      rows.push(row);
      row = [];
      field = "";
      if (rows.length > MAX_IMPORT_ROWS + 10) break;
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field.trim() || null);
    rows.push(row);
  }
  return rows;
}

/** Schéma de réponse de l'IA de secours : un rôle par colonne, dans l'ordre. */
export function importColumnsJsonSchema(kind: ImportKind): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      header_row: {
        type: "integer",
        description: "Index (0) de la ligne de titres, -1 sans titres",
      },
      roles: { type: "array", items: { type: "string", enum: [...importRolesFor(kind)] } },
    },
    required: ["header_row", "roles"],
    additionalProperties: false,
  };
}

/** Réponse de l'IA nettoyée : rôles connus, chacun une fois au plus, sinon « ignore ». */
export function normalizeAiColumns(
  raw: { header_row?: unknown; roles?: unknown },
  width: number,
  kind: ImportKind,
): { headerRow: number; roles: ImportRole[] } | null {
  if (!Array.isArray(raw.roles)) return null;
  const allowed = importRolesFor(kind);
  const seen = new Set<ImportRole>();
  const roles = Array.from({ length: width }, (_, i): ImportRole => {
    const r = raw.roles instanceof Array ? raw.roles[i] : undefined;
    if (typeof r !== "string" || !allowed.includes(r as ImportRole) || r === "ignore")
      return "ignore";
    if (seen.has(r as ImportRole)) return "ignore";
    seen.add(r as ImportRole);
    return r as ImportRole;
  });
  const headerRow =
    typeof raw.header_row === "number" &&
    Number.isInteger(raw.header_row) &&
    raw.header_row >= -1 &&
    raw.header_row < 10
      ? raw.header_row
      : -1;
  if (!seen.has("designation") || !seen.has("price")) return null;
  return { headerRow, roles };
}
