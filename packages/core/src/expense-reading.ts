/**
 * Lecture automatique des factures et tickets fournisseurs par l'IA (F-62, ADR 0186) : schéma de
 * la réponse du modèle, puis champs de la dépense à pré-remplir et alertes. L'artisan vérifie
 * toujours les champs avant d'enregistrer.
 * Fichier autonome (aucun import) : il est aussi importé par l'Edge Function read-expense.
 */

/** Pièce de la dépense : facture du fournisseur ou simple ticket de caisse. */
export const EXPENSE_KINDS = ["facture", "ticket"] as const;
export type ExpenseKind = (typeof EXPENSE_KINDS)[number];

/** Catégories des dépenses, pour le tri et l'export comptable. */
export const EXPENSE_CATEGORIES = [
  "materiaux",
  "outillage",
  "location",
  "sous_traitance",
  "carburant",
  "autre",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Unités des lignes : les mêmes que celles des devis (QUOTE_UNITS). */
export const EXPENSE_LINE_UNITS = [
  "u",
  "h",
  "jour",
  "m",
  "ml",
  "m2",
  "m3",
  "kg",
  "l",
  "forfait",
] as const;
export type ExpenseLineUnit = (typeof EXPENSE_LINE_UNITS)[number];

export const EXPENSE_LIMITS = {
  titleMaxLength: 140,
  supplierMaxLength: 120,
  referenceMaxLength: 60,
  notesMaxLength: 1000,
  lineDesignationMaxLength: 200,
  lineReferenceMaxLength: 60,
  maxLines: 100,
  /** 10 millions d'euros : au-delà, une erreur de lecture ou de saisie. */
  maxAmountCents: 1_000_000_000,
  maxQuantityMilli: 100_000_000,
} as const;

/** Taille maximale d'une image lue par le modèle ; un PDF va jusqu'à MAX_UPLOAD_BYTES (10 Mo). */
export const READABLE_EXPENSE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

type RawLine = {
  designation: string | null;
  reference: string | null;
  quantite: number | null;
  unite: string | null;
  prix_unitaire_ht: number | null;
  total_ht: number | null;
};

/** Réponse brute du modèle (sortie structurée, expenseReadingJsonSchema), montants en euros. */
export type RawExpenseReading = {
  lisible: boolean;
  type_document: "facture" | "ticket" | "autre";
  fournisseur: string | null;
  numero: string | null;
  date: string | null;
  echeance: string | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
  categorie: string | null;
  titre: string | null;
  lignes: RawLine[];
};

/** Champs du formulaire de la dépense, pré-remplis avec ce qui a été lu. */
export type ExpensePrefill = {
  kind?: ExpenseKind;
  supplierName?: string;
  reference?: string;
  issuedOn?: string;
  dueOn?: string;
  totalHtCents?: number;
  totalTvaCents?: number;
  category?: ExpenseCategory;
  title?: string;
};

/** Ligne lue sur la facture, en centimes et millièmes (comme les lignes de devis). */
export type ExpenseLinePrefill = {
  designation: string;
  reference: string | null;
  quantityMilli: number | null;
  unit: ExpenseLineUnit | null;
  unitPriceHtCents: number | null;
  totalHtCents: number | null;
};

/**
 * Alertes montrées à l'artisan : pièce illisible, document qui n'est pas une facture, totaux qui
 * ne tombent pas juste (HT + TVA ≠ TTC) ou montants incomplets.
 */
export type ExpenseReadingWarning =
  "illisible" | "autre_document" | "totaux_incoherents" | "montants_incomplets";

export type ExpenseReading = {
  fields: ExpensePrefill;
  lines: ExpenseLinePrefill[];
  warnings: ExpenseReadingWarning[];
};

const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: "null" }] });

/** Schéma JSON de la sortie structurée du modèle. */
export function expenseReadingJsonSchema() {
  const line = {
    designation: nullable({ type: "string" }),
    reference: nullable({ type: "string" }),
    quantite: nullable({ type: "number" }),
    unite: nullable({ type: "string", enum: [...EXPENSE_LINE_UNITS] }),
    prix_unitaire_ht: nullable({ type: "number" }),
    total_ht: nullable({ type: "number" }),
  };
  const properties = {
    lisible: { type: "boolean" },
    type_document: { type: "string", enum: ["facture", "ticket", "autre"] },
    fournisseur: nullable({ type: "string" }),
    numero: nullable({ type: "string" }),
    date: nullable({ type: "string" }),
    echeance: nullable({ type: "string" }),
    total_ht: nullable({ type: "number" }),
    total_tva: nullable({ type: "number" }),
    total_ttc: nullable({ type: "number" }),
    categorie: nullable({ type: "string", enum: [...EXPENSE_CATEGORIES] }),
    titre: nullable({ type: "string" }),
    lignes: {
      type: "array",
      items: {
        type: "object",
        properties: line,
        required: Object.keys(line),
        additionalProperties: false,
      },
    },
  };
  return {
    type: "object" as const,
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

/** Date AAAA-MM-JJ qui existe au calendrier (pas de 31 avril), entre 1990 et 2100. */
function calendarDate(value: string | null): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const year = Number(value.slice(0, 4));
  if (year < 1990 || year > 2100) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? value
    : undefined;
}

function cleanText(value: string | null, max: number): string | undefined {
  const text = value?.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : undefined;
}

/** Montant en euros lu par le modèle → centimes entiers ; null hors limites ou négatif. */
function cents(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  const result = Math.round(value * 100);
  return result <= EXPENSE_LIMITS.maxAmountCents ? result : null;
}

function quantityMilli(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value <= 0) return null;
  const result = Math.round(value * 1000);
  return result >= 1 && result <= EXPENSE_LIMITS.maxQuantityMilli ? result : null;
}

function normalizeLine(raw: RawLine): ExpenseLinePrefill | null {
  const designation = cleanText(raw.designation, EXPENSE_LIMITS.lineDesignationMaxLength);
  if (!designation) return null;
  const unit = EXPENSE_LINE_UNITS.find((u) => u === raw.unite) ?? null;
  return {
    designation,
    reference: cleanText(raw.reference, EXPENSE_LIMITS.lineReferenceMaxLength) ?? null,
    quantityMilli: quantityMilli(raw.quantite),
    unit,
    unitPriceHtCents: cents(raw.prix_unitaire_ht),
    totalHtCents: cents(raw.total_ht),
  };
}

/**
 * Champs à pré-remplir, lignes et alertes, d'après la réponse du modèle. Rien n'est pré-rempli si
 * la pièce est illisible ou si ce n'est ni une facture ni un ticket (les valeurs seraient
 * fausses). Un montant manquant est déduit des deux autres (TVA = TTC − HT) ; aucun n'est inventé.
 */
export function normalizeExpenseReading(raw: RawExpenseReading): ExpenseReading {
  if (!raw.lisible) return { fields: {}, lines: [], warnings: ["illisible"] };
  if (raw.type_document === "autre") return { fields: {}, lines: [], warnings: ["autre_document"] };

  const warnings: ExpenseReadingWarning[] = [];
  const fields: ExpensePrefill = { kind: raw.type_document };

  const supplierName = cleanText(raw.fournisseur, EXPENSE_LIMITS.supplierMaxLength);
  if (supplierName) fields.supplierName = supplierName;
  const reference = cleanText(raw.numero, EXPENSE_LIMITS.referenceMaxLength);
  if (reference) fields.reference = reference;
  const title = cleanText(raw.titre, EXPENSE_LIMITS.titleMaxLength);
  if (title) fields.title = title;
  const category = EXPENSE_CATEGORIES.find((c) => c === raw.categorie);
  if (category) fields.category = category;

  const issuedOn = calendarDate(raw.date);
  if (issuedOn) fields.issuedOn = issuedOn;
  const dueOn = calendarDate(raw.echeance);
  // Une échéance avant la date de la facture est une erreur de lecture.
  if (dueOn && (!issuedOn || dueOn >= issuedOn)) fields.dueOn = dueOn;

  let ht = cents(raw.total_ht);
  let tva = cents(raw.total_tva);
  const ttc = cents(raw.total_ttc);
  if (ht === null && tva !== null && ttc !== null && ttc >= tva) ht = ttc - tva;
  if (tva === null && ht !== null && ttc !== null && ttc >= ht) tva = ttc - ht;
  if (ht !== null && tva !== null) {
    fields.totalHtCents = ht;
    fields.totalTvaCents = tva;
    if (ttc !== null && Math.abs(ht + tva - ttc) > 1) warnings.push("totaux_incoherents");
  } else {
    warnings.push("montants_incomplets");
  }

  const lines = raw.lignes
    .map(normalizeLine)
    .filter((line): line is ExpenseLinePrefill => line !== null)
    .slice(0, EXPENSE_LIMITS.maxLines);

  return { fields, lines, warnings };
}
