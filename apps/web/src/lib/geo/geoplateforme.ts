import { z } from "zod";

/**
 * Géocodage de la Géoplateforme IGN (Base Adresse Nationale), appelé depuis le navigateur.
 * Gratuit, sans clé, CORS ouvert. https://data.geopf.fr/geocodage
 */
const BASE_URL = "https://data.geopf.fr/geocodage/search";

const featureCollection = z.object({
  features: z.array(
    z.object({
      geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
      properties: z.object({
        label: z.string(),
        citycode: z.string(),
        city: z.string(),
        postcode: z.string().optional(),
      }),
    }),
  ),
});

export type AddressSuggestion = { label: string; citycode: string; lon: number; lat: number };
export type CommuneSuggestion = { code: string; nom: string; postcode?: string };

async function search(params: Record<string, string>, signal?: AbortSignal) {
  const url = `${BASE_URL}?${new URLSearchParams({ autocomplete: "1", limit: "6", ...params })}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const parsed = featureCollection.safeParse(await res.json());
  return parsed.success ? parsed.data.features : [];
}

/** citycode : limite les propositions à une commune (ville et adresse cohérentes, F-07). */
export async function searchAddresses(
  q: string,
  signal?: AbortSignal,
  citycode?: string,
): Promise<AddressSuggestion[]> {
  const features = await search(citycode ? { q, citycode } : { q }, signal);
  return features.map((f) => ({
    label: f.properties.label,
    citycode: f.properties.citycode,
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
}

export async function searchCommunes(
  q: string,
  signal?: AbortSignal,
): Promise<CommuneSuggestion[]> {
  const features = await search({ q, type: "municipality" }, signal);
  return features.map((f) => ({
    code: f.properties.citycode,
    nom: f.properties.city,
    postcode: f.properties.postcode,
  }));
}
