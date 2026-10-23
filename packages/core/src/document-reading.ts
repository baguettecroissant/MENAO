/**
 * Lecture automatique des documents de l'artisan par l'IA (ADR 0176) : schéma de la réponse du
 * modèle, puis champs à pré-remplir et alertes. L'artisan vérifie toujours les champs avant
 * l'envoi, et l'équipe MENAO vérifie le document comme avant.
 * Fichier autonome (aucun import) : il est aussi importé par l'Edge Function read-document.
 */

/** Documents du dossier lus automatiquement (les mêmes que REQUIRED_DOCUMENT_TYPES). */
export const READABLE_DOCUMENT_TYPES = [
  "kbis",
  "decennale",
  "rc_pro",
  "identite",
  "urssaf",
] as const;
export type ReadableDocumentType = (typeof READABLE_DOCUMENT_TYPES)[number];

/** Taille maximale d'une image lue par le modèle ; un PDF va jusqu'à MAX_UPLOAD_BYTES (10 Mo). */
export const READABLE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Type reconnu par le modèle : un des documents du dossier, ou un autre document. */
export const DETECTED_DOCUMENT_TYPES = [...READABLE_DOCUMENT_TYPES, "autre"] as const;
export type DetectedDocumentType = (typeof DETECTED_DOCUMENT_TYPES)[number];

/** Réponse brute du modèle (sortie structurée, documentReadingJsonSchema). */
export type RawDocumentReading = {
  type_document: string;
  lisible: boolean;
  date_emission: string | null;
  date_fin: string | null;
  assureur: string | null;
  numero: string | null;
  couverture: string | null;
  siren: string | null;
};

/** Champs du formulaire de dépôt, pré-remplis avec ce qui a été lu. */
export type DocumentPrefill = {
  dateEmission?: string;
  dateFin?: string;
  assureur?: string;
  numero?: string;
  couverture?: string;
};
export type DocumentPrefillField = keyof DocumentPrefill;

/**
 * Alertes montrées à l'artisan : document difficile à lire, autre document que celui attendu,
 * ou numéro SIREN différent de celui de son entreprise. Les dates sont contrôlées par le
 * formulaire lui-même (documentMetadataSchema), dès qu'elles sont pré-remplies.
 */
export type DocumentReadingWarning = "illisible" | "autre_document" | "siren_different";

export type DocumentReading = {
  fields: DocumentPrefill;
  warnings: DocumentReadingWarning[];
  detected: DetectedDocumentType | null;
};

/** Champs du formulaire de chaque document (comme documentMetadataSchema). */
export const DOCUMENT_PREFILL_FIELDS: Record<ReadableDocumentType, DocumentPrefillField[]> = {
  kbis: ["dateEmission"],
  decennale: ["assureur", "numero", "dateFin", "couverture"],
  rc_pro: ["assureur", "numero", "dateFin"],
  urssaf: ["dateEmission", "numero"],
  identite: ["dateFin"],
};

const MAX_LENGTH: Record<"assureur" | "numero" | "couverture", number> = {
  assureur: 120,
  numero: 60,
  couverture: 200,
};

const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: "null" }] });

/** Schéma JSON de la sortie structurée du modèle. */
export function documentReadingJsonSchema() {
  const properties = {
    type_document: { type: "string", enum: [...DETECTED_DOCUMENT_TYPES] },
    lisible: { type: "boolean" },
    date_emission: nullable({ type: "string" }),
    date_fin: nullable({ type: "string" }),
    assureur: nullable({ type: "string" }),
    numero: nullable({ type: "string" }),
    couverture: nullable({ type: "string" }),
    siren: nullable({ type: "string" }),
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

/**
 * Champs à pré-remplir et alertes, d'après la réponse du modèle. Rien n'est pré-rempli si le
 * document est illisible ou si ce n'est pas celui attendu (les valeurs seraient fausses).
 * `siret` : celui de l'entreprise de l'artisan, comparé au SIREN lu sur le document.
 */
export function normalizeDocumentReading(
  raw: RawDocumentReading,
  expected: ReadableDocumentType,
  { siret = null }: { siret?: string | null } = {},
): DocumentReading {
  const detected = DETECTED_DOCUMENT_TYPES.find((type) => type === raw.type_document) ?? null;
  const warnings: DocumentReadingWarning[] = [];
  if (!raw.lisible) warnings.push("illisible");
  if (detected && detected !== expected) warnings.push("autre_document");

  const siren = raw.siren?.replace(/\D/g, "") ?? "";
  if (
    raw.lisible &&
    expected !== "identite" &&
    (siren.length === 9 || siren.length === 14) &&
    siret &&
    /^\d{14}$/.test(siret) &&
    siren.slice(0, 9) !== siret.slice(0, 9)
  ) {
    warnings.push("siren_different");
  }

  const fields: DocumentPrefill = {};
  if (raw.lisible && detected === expected) {
    for (const field of DOCUMENT_PREFILL_FIELDS[expected]) {
      const value =
        field === "dateEmission"
          ? calendarDate(raw.date_emission)
          : field === "dateFin"
            ? calendarDate(raw.date_fin)
            : cleanText(raw[field], MAX_LENGTH[field]);
      if (value) fields[field] = value;
    }
  }
  return { fields, warnings, detected };
}

/**
 * Valeurs du formulaire après une lecture : un champ vide, ou encore rempli par une lecture
 * précédente (document remplacé), prend la valeur lue ; ce que l'artisan a saisi est gardé.
 * Renvoie les champs à modifier.
 */
export function prefillUpdates(
  current: Partial<Record<DocumentPrefillField, string | null>>,
  read: DocumentPrefill,
  previous: DocumentPrefill = {},
): DocumentPrefill {
  const updates: DocumentPrefill = {};
  for (const [field, value] of Object.entries(read) as [DocumentPrefillField, string][]) {
    const now = current[field]?.trim() ?? "";
    if (now === "" || now === previous[field]) updates[field] = value;
  }
  return updates;
}
