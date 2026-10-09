/**
 * Versions des documents légaux acceptés par les utilisateurs (table `legal_acceptances`).
 * TODO(legal) : remplacer par les versions validées par l'avocat avant le pilote.
 */
export const LEGAL_DOCUMENT_VERSIONS = {
  cgu: "2026-10-09-brouillon",
  confidentialite: "2026-10-09-brouillon",
  cgv_artisan: "2026-10-09-brouillon",
} as const;

export type LegalDocument = keyof typeof LEGAL_DOCUMENT_VERSIONS;

export const SIGNUP_REQUIRED_DOCUMENTS = [
  "cgu",
  "confidentialite",
] as const satisfies readonly LegalDocument[];

export const ARTISAN_SIGNUP_REQUIRED_DOCUMENTS = [
  ...SIGNUP_REQUIRED_DOCUMENTS,
  "cgv_artisan",
] as const satisfies readonly LegalDocument[];
