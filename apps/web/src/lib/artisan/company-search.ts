import {
  COMPANY_SEARCH_MIN_LENGTH,
  companySearchUrl,
  parseCompanySearch,
  type CompanySuggestion,
} from "@menao/validation";

export type { CompanySuggestion };

/**
 * Recherche de l'entreprise de l'artisan dans l'Annuaire des entreprises (ADR 0110), appelée
 * depuis le navigateur. Une réponse en erreur lève une exception : le parcours propose alors la
 * saisie du SIRET.
 */
export async function searchCompanies(
  query: string,
  signal?: AbortSignal,
): Promise<CompanySuggestion[]> {
  if (query.trim().length < COMPANY_SEARCH_MIN_LENGTH) return [];
  const res = await fetch(companySearchUrl(query), { signal });
  if (!res.ok) throw new Error(`Recherche d'entreprises indisponible (${res.status})`);
  return parseCompanySearch(await res.json());
}
