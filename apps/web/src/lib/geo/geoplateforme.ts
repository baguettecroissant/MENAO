import {
  addressSearchParams,
  communeSearchParams,
  geoplateformeSearchUrl,
  parseGeoFeatures,
  toAddressSuggestions,
  toCommuneSuggestions,
  type AddressSuggestion,
  type CommuneSuggestion,
} from "@menao/validation";

/**
 * Géocodage de la Géoplateforme IGN (Base Adresse Nationale), appelé depuis le navigateur.
 * Adresse et lecture des réponses partagées avec l'application (`@menao/validation`).
 */
export type { AddressSuggestion, CommuneSuggestion };

async function search(params: Record<string, string>, signal?: AbortSignal) {
  const res = await fetch(geoplateformeSearchUrl(params), { signal });
  if (!res.ok) return [];
  return parseGeoFeatures(await res.json());
}

/** citycode : limite les propositions à une commune (ville et adresse cohérentes, F-07). */
export async function searchAddresses(
  q: string,
  signal?: AbortSignal,
  citycode?: string,
): Promise<AddressSuggestion[]> {
  return toAddressSuggestions(await search(addressSearchParams(q, citycode), signal));
}

export async function searchCommunes(
  q: string,
  signal?: AbortSignal,
): Promise<CommuneSuggestion[]> {
  return toCommuneSuggestions(await search(communeSearchParams(q), signal));
}
