// Géocodage côté serveur (Géoplateforme IGN, Base Adresse Nationale), au mieux : en cas d'échec,
// le particulier complète la ville et l'adresse à l'écran de vérification (F-07).
import { env } from "./env.ts";

type Feature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    label?: string;
    citycode?: string;
    city?: string;
    postcode?: string;
    score?: number;
    type?: string;
  };
};

async function search(params: Record<string, string>): Promise<Feature[]> {
  const base = (env("GEOCODING_BASE_URL") || "https://data.geopf.fr/geocodage").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/search?${new URLSearchParams({ limit: "1", ...params })}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { features?: Feature[] };
    return Array.isArray(body.features) ? body.features : [];
  } catch {
    return [];
  }
}

export type Commune = {
  code: string;
  nom: string;
  postcode: string | null;
  lon: number | null;
  lat: number | null;
};

export async function geocodeCommune(
  ville: string,
  postcode: string | null,
): Promise<Commune | null> {
  const [f] = await search({
    q: ville,
    type: "municipality",
    ...(postcode ? { postcode } : {}),
  });
  const p = f?.properties;
  if (!p?.citycode || !p.city || (p.score ?? 0) < 0.4) return null;
  return {
    code: p.citycode,
    nom: p.city,
    postcode: p.postcode && /^\d{5}$/.test(p.postcode) ? p.postcode : null,
    lon: f?.geometry?.coordinates?.[0] ?? null,
    lat: f?.geometry?.coordinates?.[1] ?? null,
  };
}

export type Address = { label: string; lon: number; lat: number };

/** Adresse exacte, filtrée par la commune (la ville et l'adresse doivent être cohérentes). */
export async function geocodeAddress(adresse: string, citycode: string): Promise<Address | null> {
  const [f] = await search({ q: adresse, citycode });
  const p = f?.properties;
  const coords = f?.geometry?.coordinates;
  if (
    !p?.label ||
    p.citycode !== citycode ||
    !coords ||
    (p.score ?? 0) < 0.5 ||
    (p.type !== "housenumber" && p.type !== "street")
  ) {
    return null;
  }
  return { label: p.label.slice(0, 200), lon: coords[0], lat: coords[1] };
}
