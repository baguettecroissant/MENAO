/**
 * Formes juridiques (codes INSEE de la catégorie juridique) affichées sur la fiche de l'artisan
 * et sur ses devis. N'importe rien : également chargé par Deno (PDF des devis).
 */
export const FORMES_JURIDIQUES: Readonly<Record<string, string>> = {
  "1000": "Entrepreneur individuel",
  "5410": "SARL nationale",
  "5498": "EURL",
  "5499": "SARL",
  "5599": "SA",
  "5710": "SAS",
  "5720": "SASU",
  "6540": "SCI",
};
