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
  /** Pièce d'identité : date de naissance du titulaire (ADR 0375). Absent d'une ancienne réponse. */
  date_naissance?: string | null;
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
  /**
   * Date de naissance lue sur la pièce d'identité (ADR 0375), pour pré-remplir l'étape
   * « Paiements ». Elle n'est pas un champ du dépôt et MENAO ne l'enregistre pas : elle reste sur
   * l'appareil de l'artisan jusqu'à son envoi à Stripe.
   */
  birthDate?: string;
};

/** Âge minimal plausible du dirigeant : en dessous, la date lue est écartée. */
export const BIRTH_DATE_MIN_AGE = 16;

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
    date_naissance: nullable({ type: "string" }),
  };
  return {
    type: "object" as const,
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

/** Date AAAA-MM-JJ qui existe au calendrier (pas de 31 avril). */
function existingDate(value: string | null | undefined): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? value
    : undefined;
}

/** Date d'un document : au calendrier, entre 1990 et 2100. */
function calendarDate(value: string | null): string | undefined {
  const date = existingDate(value);
  if (!date) return undefined;
  const year = Number(date.slice(0, 4));
  return year < 1990 || year > 2100 ? undefined : date;
}

/**
 * Date de naissance plausible : au calendrier, à partir de 1900, et d'une personne d'au moins
 * 16 ans. `null` sinon (date mal lue, ou date du jour prise pour une naissance).
 */
export function plausibleBirthDate(
  value: string | null | undefined,
  today: Date = new Date(),
): string | null {
  const date = existingDate(value);
  if (!date || date < "1900-01-01") return null;
  const latest = new Date(
    Date.UTC(today.getUTCFullYear() - BIRTH_DATE_MIN_AGE, today.getUTCMonth(), today.getUTCDate()),
  )
    .toISOString()
    .slice(0, 10);
  return date <= latest ? date : null;
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
  { siret = null, today = new Date() }: { siret?: string | null; today?: Date } = {},
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
  const birthDate =
    expected === "identite" && raw.lisible && detected === expected
      ? plausibleBirthDate(raw.date_naissance, today)
      : null;
  return { fields, warnings, detected, ...(birthDate ? { birthDate } : {}) };
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
