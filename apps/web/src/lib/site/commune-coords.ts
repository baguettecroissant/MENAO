/**
 * Centres des communes pilotes (longitude, latitude), repris de la migration du site public
 * (20261009190005_site_public.sql, source Géoplateforme / BAN), pour la carte statique de l'accueil
 * (ADR 0264). Une commune absente n'a simplement pas de point sur la carte.
 */
export const COMMUNE_COORDS: Readonly<Record<string, readonly [number, number]>> = {
  "06088": [7.255313, 43.71273], // Nice
  "06004": [7.103254, 43.582195], // Antibes
  "06029": [7.004585, 43.555468], // Cannes
  "06027": [7.150092, 43.675636], // Cagnes-sur-Mer
  "06069": [6.937765, 43.654057], // Grasse
  "06030": [6.999308, 43.574427], // Le Cannet
  "06123": [7.18367, 43.686846], // Saint-Laurent-du-Var
  "06083": [7.500604, 43.791521], // Menton
  "06155": [7.060116, 43.574234], // Vallauris
  "06079": [6.933663, 43.544471], // Mandelieu-la-Napoule
  "06157": [7.109219, 43.720988], // Vence
  "06085": [6.999298, 43.595253], // Mougins
  "06161": [7.106505, 43.639175], // Villeneuve-Loubet
  "06033": [7.191567, 43.784043], // Carros
  "06012": [7.422903, 43.744201], // Beausoleil
};

/** Trait de côte simplifié des Alpes-Maritimes, de l'Esterel à la frontière italienne. */
export const COAST: readonly (readonly [number, number])[] = [
  [6.8, 43.53],
  [6.934, 43.528],
  [7.005, 43.542],
  [7.06, 43.562],
  [7.1, 43.548],
  [7.13, 43.575],
  [7.115, 43.633],
  [7.15, 43.655],
  [7.19, 43.66],
  [7.255, 43.69],
  [7.33, 43.69],
  [7.42, 43.73],
  [7.5, 43.775],
  [7.62, 43.8],
];

/** Communes les plus proches (à vol d'oiseau) parmi celles qui ont des coordonnées (ADR 0268). */
export function nearestCommunes<T extends { code_insee: string }>(
  codeInsee: string,
  communes: readonly T[],
  count: number,
): T[] {
  const origin = COMMUNE_COORDS[codeInsee];
  if (!origin) return communes.filter((c) => c.code_insee !== codeInsee).slice(0, count);
  const [lon0, lat0] = origin;
  const kx = Math.cos((lat0 * Math.PI) / 180);
  return communes
    .filter((c) => c.code_insee !== codeInsee && COMMUNE_COORDS[c.code_insee])
    .map((c) => {
      const [lon, lat] = COMMUNE_COORDS[c.code_insee]!;
      return { c, d: ((lon - lon0) * kx) ** 2 + (lat - lat0) ** 2 };
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map(({ c }) => c);
}
