/**
 * Zone d'intervention par territoire (F-68, ADR 0213) : départements, régions ou France entière,
 * en plus du rayon et de la liste de communes. Référentiel officiel (COG de l'INSEE), identique aux
 * tables `departements` et `regions` de la base.
 */

export const ZONE_MODES = ["rayon", "communes", "departements", "regions", "france"] as const;
export type ZoneMode = (typeof ZONE_MODES)[number];

/** Modes à choisir dans le référentiel : l'adresse de départ reste demandée pour la distance. */
export type TerritoryZoneMode = "departements" | "regions" | "france";

export const TERRITORY_ZONE_MODES = ["departements", "regions", "france"] as const;

export function isTerritoryZoneMode(mode: ZoneMode | null): mode is TerritoryZoneMode {
  return (TERRITORY_ZONE_MODES as readonly (ZoneMode | null)[]).includes(mode);
}

export type ZoneRegion = { code: string; nom: string };
export type ZoneDepartement = { code: string; nom: string; region: string };

export const ZONE_REGIONS: readonly ZoneRegion[] = [
  { code: "01", nom: "Guadeloupe" },
  { code: "02", nom: "Martinique" },
  { code: "03", nom: "Guyane" },
  { code: "04", nom: "La Réunion" },
  { code: "06", nom: "Mayotte" },
  { code: "11", nom: "Île-de-France" },
  { code: "24", nom: "Centre-Val de Loire" },
  { code: "27", nom: "Bourgogne-Franche-Comté" },
  { code: "28", nom: "Normandie" },
  { code: "32", nom: "Hauts-de-France" },
  { code: "44", nom: "Grand Est" },
  { code: "52", nom: "Pays de la Loire" },
  { code: "53", nom: "Bretagne" },
  { code: "75", nom: "Nouvelle-Aquitaine" },
  { code: "76", nom: "Occitanie" },
  { code: "84", nom: "Auvergne-Rhône-Alpes" },
  { code: "93", nom: "Provence-Alpes-Côte d'Azur" },
  { code: "94", nom: "Corse" },
];

export const ZONE_DEPARTEMENTS: readonly ZoneDepartement[] = [
  { code: "01", nom: "Ain", region: "84" },
  { code: "02", nom: "Aisne", region: "32" },
  { code: "03", nom: "Allier", region: "84" },
  { code: "04", nom: "Alpes-de-Haute-Provence", region: "93" },
  { code: "05", nom: "Hautes-Alpes", region: "93" },
  { code: "06", nom: "Alpes-Maritimes", region: "93" },
  { code: "07", nom: "Ardèche", region: "84" },
  { code: "08", nom: "Ardennes", region: "44" },
  { code: "09", nom: "Ariège", region: "76" },
  { code: "10", nom: "Aube", region: "44" },
  { code: "11", nom: "Aude", region: "76" },
  { code: "12", nom: "Aveyron", region: "76" },
  { code: "13", nom: "Bouches-du-Rhône", region: "93" },
  { code: "14", nom: "Calvados", region: "28" },
  { code: "15", nom: "Cantal", region: "84" },
  { code: "16", nom: "Charente", region: "75" },
  { code: "17", nom: "Charente-Maritime", region: "75" },
  { code: "18", nom: "Cher", region: "24" },
  { code: "19", nom: "Corrèze", region: "75" },
  { code: "21", nom: "Côte-d'Or", region: "27" },
  { code: "22", nom: "Côtes-d'Armor", region: "53" },
  { code: "23", nom: "Creuse", region: "75" },
  { code: "24", nom: "Dordogne", region: "75" },
  { code: "25", nom: "Doubs", region: "27" },
  { code: "26", nom: "Drôme", region: "84" },
  { code: "27", nom: "Eure", region: "28" },
  { code: "28", nom: "Eure-et-Loir", region: "24" },
  { code: "29", nom: "Finistère", region: "53" },
  { code: "2A", nom: "Corse-du-Sud", region: "94" },
  { code: "2B", nom: "Haute-Corse", region: "94" },
  { code: "30", nom: "Gard", region: "76" },
  { code: "31", nom: "Haute-Garonne", region: "76" },
  { code: "32", nom: "Gers", region: "76" },
  { code: "33", nom: "Gironde", region: "75" },
  { code: "34", nom: "Hérault", region: "76" },
  { code: "35", nom: "Ille-et-Vilaine", region: "53" },
  { code: "36", nom: "Indre", region: "24" },
  { code: "37", nom: "Indre-et-Loire", region: "24" },
  { code: "38", nom: "Isère", region: "84" },
  { code: "39", nom: "Jura", region: "27" },
  { code: "40", nom: "Landes", region: "75" },
  { code: "41", nom: "Loir-et-Cher", region: "24" },
  { code: "42", nom: "Loire", region: "84" },
  { code: "43", nom: "Haute-Loire", region: "84" },
  { code: "44", nom: "Loire-Atlantique", region: "52" },
  { code: "45", nom: "Loiret", region: "24" },
  { code: "46", nom: "Lot", region: "76" },
  { code: "47", nom: "Lot-et-Garonne", region: "75" },
  { code: "48", nom: "Lozère", region: "76" },
  { code: "49", nom: "Maine-et-Loire", region: "52" },
  { code: "50", nom: "Manche", region: "28" },
  { code: "51", nom: "Marne", region: "44" },
  { code: "52", nom: "Haute-Marne", region: "44" },
  { code: "53", nom: "Mayenne", region: "52" },
  { code: "54", nom: "Meurthe-et-Moselle", region: "44" },
  { code: "55", nom: "Meuse", region: "44" },
  { code: "56", nom: "Morbihan", region: "53" },
  { code: "57", nom: "Moselle", region: "44" },
  { code: "58", nom: "Nièvre", region: "27" },
  { code: "59", nom: "Nord", region: "32" },
  { code: "60", nom: "Oise", region: "32" },
  { code: "61", nom: "Orne", region: "28" },
  { code: "62", nom: "Pas-de-Calais", region: "32" },
  { code: "63", nom: "Puy-de-Dôme", region: "84" },
  { code: "64", nom: "Pyrénées-Atlantiques", region: "75" },
  { code: "65", nom: "Hautes-Pyrénées", region: "76" },
  { code: "66", nom: "Pyrénées-Orientales", region: "76" },
  { code: "67", nom: "Bas-Rhin", region: "44" },
  { code: "68", nom: "Haut-Rhin", region: "44" },
  { code: "69", nom: "Rhône", region: "84" },
  { code: "70", nom: "Haute-Saône", region: "27" },
  { code: "71", nom: "Saône-et-Loire", region: "27" },
  { code: "72", nom: "Sarthe", region: "52" },
  { code: "73", nom: "Savoie", region: "84" },
  { code: "74", nom: "Haute-Savoie", region: "84" },
  { code: "75", nom: "Paris", region: "11" },
  { code: "76", nom: "Seine-Maritime", region: "28" },
  { code: "77", nom: "Seine-et-Marne", region: "11" },
  { code: "78", nom: "Yvelines", region: "11" },
  { code: "79", nom: "Deux-Sèvres", region: "75" },
  { code: "80", nom: "Somme", region: "32" },
  { code: "81", nom: "Tarn", region: "76" },
  { code: "82", nom: "Tarn-et-Garonne", region: "76" },
  { code: "83", nom: "Var", region: "93" },
  { code: "84", nom: "Vaucluse", region: "93" },
  { code: "85", nom: "Vendée", region: "52" },
  { code: "86", nom: "Vienne", region: "75" },
  { code: "87", nom: "Haute-Vienne", region: "75" },
  { code: "88", nom: "Vosges", region: "44" },
  { code: "89", nom: "Yonne", region: "27" },
  { code: "90", nom: "Territoire de Belfort", region: "27" },
  { code: "91", nom: "Essonne", region: "11" },
  { code: "92", nom: "Hauts-de-Seine", region: "11" },
  { code: "93", nom: "Seine-Saint-Denis", region: "11" },
  { code: "94", nom: "Val-de-Marne", region: "11" },
  { code: "95", nom: "Val-d'Oise", region: "11" },
  { code: "971", nom: "Guadeloupe", region: "01" },
  { code: "972", nom: "Martinique", region: "02" },
  { code: "973", nom: "Guyane", region: "03" },
  { code: "974", nom: "La Réunion", region: "04" },
  { code: "976", nom: "Mayotte", region: "06" },
];

/** Libellé d'un territoire : « Alpes-Maritimes (06) », « Bretagne ». */
export function territoryLabel(mode: "departements" | "regions", code: string): string {
  if (mode === "regions") return ZONE_REGIONS.find((r) => r.code === code)?.nom ?? code;
  const departement = ZONE_DEPARTEMENTS.find((d) => d.code === code);
  return departement ? `${departement.nom} (${departement.code})` : code;
}

/** Vrai pour un code du référentiel de ce mode. */
export function isTerritoryCode(mode: "departements" | "regions", code: string): boolean {
  return (mode === "regions" ? ZONE_REGIONS : ZONE_DEPARTEMENTS).some((t) => t.code === code);
}

/** Département d'une commune : 3 caractères outre-mer (97x), 2 ailleurs (dont 2A et 2B). */
export function departementOfInsee(codeInsee: string): string | null {
  const code = codeInsee.startsWith("97") ? codeInsee.slice(0, 3) : codeInsee.slice(0, 2);
  return ZONE_DEPARTEMENTS.some((d) => d.code === code) ? code : null;
}

/** Territoire de l'adresse de départ, proposé par défaut au moment de choisir ce mode. */
export function territoryOfInsee(
  mode: "departements" | "regions",
  codeInsee: string,
): string | null {
  const departement = departementOfInsee(codeInsee);
  if (mode === "departements" || departement === null) return departement;
  return ZONE_DEPARTEMENTS.find((d) => d.code === departement)?.region ?? null;
}

const normalized = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();

/** Recherche par nom (sans accent ni tiret) ou par numéro de département. */
export function searchTerritories(
  mode: "departements" | "regions",
  query: string,
): { code: string; nom: string }[] {
  const q = normalized(query);
  if (!q) return [];
  const list = mode === "regions" ? ZONE_REGIONS : ZONE_DEPARTEMENTS;
  return list
    .filter((t) => normalized(t.nom).includes(q) || t.code.toLowerCase() === q)
    .slice(0, 8)
    .map((t) => ({ code: t.code, nom: territoryLabel(mode, t.code) }));
}
