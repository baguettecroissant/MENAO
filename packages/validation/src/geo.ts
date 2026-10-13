import { z } from "zod";

/**
 * Géocodage de la Géoplateforme IGN (Base Adresse Nationale) : gratuit, sans clé, CORS ouvert.
 * https://data.geopf.fr/geocodage — appelé par le site et par l'application, qui partagent ici
 * l'adresse de recherche et la lecture des réponses.
 */
export const GEOPLATEFORME_SEARCH_URL = "https://data.geopf.fr/geocodage/search";

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

type Feature = z.infer<typeof featureCollection>["features"][number];

export type AddressSuggestion = { label: string; citycode: string; lon: number; lat: number };
export type CommuneSuggestion = {
  code: string;
  nom: string;
  postcode?: string;
  lon: number;
  lat: number;
};

/** Adresse d'une recherche avec autocomplétion (6 propositions au plus). */
export function geoplateformeSearchUrl(params: Record<string, string>): string {
  const query = new URLSearchParams({ autocomplete: "1", limit: "6", ...params });
  return `${GEOPLATEFORME_SEARCH_URL}?${query}`;
}

/** Paramètres d'une recherche d'adresses ; citycode limite les propositions à une commune (F-07). */
export function addressSearchParams(q: string, citycode?: string): Record<string, string> {
  return citycode ? { q, citycode } : { q };
}

export function communeSearchParams(q: string): Record<string, string> {
  return { q, type: "municipality" };
}

/** Lit une réponse de la Géoplateforme ; liste vide si elle est inattendue. */
export function parseGeoFeatures(json: unknown): Feature[] {
  const parsed = featureCollection.safeParse(json);
  return parsed.success ? parsed.data.features : [];
}

export function toAddressSuggestions(features: Feature[]): AddressSuggestion[] {
  return features.map((f) => ({
    label: f.properties.label,
    citycode: f.properties.citycode,
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
}

export function toCommuneSuggestions(features: Feature[]): CommuneSuggestion[] {
  return features.map((f) => ({
    code: f.properties.citycode,
    nom: f.properties.city,
    postcode: f.properties.postcode,
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
}
