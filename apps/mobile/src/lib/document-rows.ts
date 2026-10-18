import {
  MONITORED_DOCUMENT_TYPES,
  REQUIRED_DOCUMENT_TYPES,
  daysUntil,
  expiryStatus,
  type ExpiryStatus,
  type RequiredDocumentType,
} from "@menao/core";

/**
 * « Mes documents » dans l'application (ADR 0123), comme la page des documents du site : état de
 * chaque document obligatoire et dépôt possible ou non. Sans dépendance native (testable).
 */

export type DocumentRow = {
  type: RequiredDocumentType;
  /** Document validé en vigueur. */
  current: { dateFin: string | null; expiry: ExpiryStatus; days: number | null } | null;
  /** Nouveau document déposé, en attente de vérification. */
  pending: boolean;
  /** Dernier dépôt refusé (sans dépôt plus récent), et son motif. */
  refused: boolean;
  refusedReason: string | null;
  /** Décennale : métiers déclarés non soumis (ADR 0116). */
  exempt: boolean;
  /** Dépôt possible : pendant l'inscription, ou renouvellement d'un document surveillé (F-51). */
  canUpload: boolean;
};

export type DocumentInput = {
  type: string;
  status: string;
  date_fin: string | null;
  refusal_reason: string | null;
  created_at: string;
};

export function documentRows(
  artisan: { status: string; decennaleExempt: boolean },
  documents: readonly DocumentInput[],
  today: Date = new Date(),
): DocumentRow[] {
  const onboarding = artisan.status === "brouillon" || artisan.status === "refuse";
  const renewal = artisan.status === "valide" || artisan.status === "suspendu";
  return REQUIRED_DOCUMENT_TYPES.map((type) => {
    const rows = documents
      .filter((d) => d.type === type && d.status !== "remplace")
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const valid = rows.find((d) => d.status === "valide");
    const newest = rows[0];
    return {
      type,
      current: valid
        ? {
            dateFin: valid.date_fin,
            expiry: expiryStatus(valid.date_fin, today),
            days: valid.date_fin ? daysUntil(valid.date_fin, today) : null,
          }
        : null,
      pending: rows.some((d) => d.status === "en_attente"),
      refused: newest?.status === "refuse",
      refusedReason: newest?.status === "refuse" ? newest.refusal_reason : null,
      exempt: type === "decennale" && artisan.decennaleExempt,
      canUpload:
        onboarding || (renewal && (MONITORED_DOCUMENT_TYPES as readonly string[]).includes(type)),
    };
  });
}
