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

export type { AddressSuggestion, CommuneSuggestion };

/** Géocodage de la Géoplateforme (Base Adresse Nationale), comme sur le site. */
async function search(params: Record<string, string>, signal?: AbortSignal) {
  try {
    const res = await fetch(geoplateformeSearchUrl(params), { signal });
    return res.ok ? parseGeoFeatures(await res.json()) : [];
  } catch {
    return [];
  }
}

export async function searchCommunes(
  q: string,
  signal?: AbortSignal,
): Promise<CommuneSuggestion[]> {
  return toCommuneSuggestions(await search(communeSearchParams(q), signal));
}

/** Adresses de la seule commune choisie : ville et adresse restent cohérentes (F-07). */
export async function searchAddresses(
  q: string,
  citycode: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  return toAddressSuggestions(await search(addressSearchParams(q, citycode), signal));
}
