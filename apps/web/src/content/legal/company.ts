/**
 * Société éditrice (F-180). Le numéro SIREN, le numéro de TVA et le téléphone seront ajoutés ici
 * après l'immatriculation : les pages légales les reprennent toutes de ce fichier.
 */
// TODO(legal) : compléter le SIREN, le numéro de TVA et le téléphone dès l'immatriculation.
export const COMPANY = {
  name: "MENAO FRANCE",
  form: "société par actions simplifiée au capital de 1 000 euros",
  address: "470 promenade des Anglais, 06200 Nice",
  registry: "en cours d'immatriculation au registre du commerce et des sociétés de Nice",
  email: "contact@menao.fr",
  director: "Mickaël Lamare",
} as const;

/** « MENAO FRANCE, société par actions simplifiée au capital de 1 000 euros, 470 promenade… » */
export const COMPANY_LINE = `${COMPANY.name}, ${COMPANY.form}, dont le siège est ${COMPANY.address}, ${COMPANY.registry}`;

/** Date de la version en cours des textes légaux. */
export const LEGAL_UPDATED_AT = "2026-11-18";
