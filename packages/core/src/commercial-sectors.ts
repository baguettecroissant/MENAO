/**
 * Secteurs des agents commerciaux dans les Alpes-Maritimes et objectifs par métier (F-174,
 * ADR 0367), d'après la « Simulation de gains 2027 » donnée par l'utilisateur le 17/11/2026.
 * Fichier autonome (aucun import). Un secteur est une zone toute faite : ses débuts de codes
 * postaux remplissent la zone du commercial (ADR 0207), que l'équipe peut encore ajuster.
 * Les codes postaux des communes citées sont complétés par leurs voisines (à vérifier) ; un même
 * code postal peut couvrir deux secteurs (06140 : Vence et Tourrettes-sur-Loup).
 */

export type CommercialSector = {
  /** Numéro affiché (« Secteur 1 »). */
  number: number;
  name: string;
  /** Communes citées dans le document. */
  communes: string;
  /** Codes postaux du secteur (zone du commercial). */
  postalCodes: readonly string[];
};

export const COMMERCIAL_SECTORS: readonly CommercialSector[] = [
  {
    number: 1,
    name: "Nice – Vallée du Var",
    communes: "Nice, Saint-Laurent-du-Var, Carros, La Gaude, vallées du Var et de la Vésubie",
    postalCodes: [
      "06000",
      "06100",
      "06200",
      "06300",
      "06700",
      "06510",
      "06610",
      "06670",
      "06450",
      "06710",
      "06260",
      "06830",
      "06470",
      "06420",
      "06790",
    ],
  },
  {
    number: 2,
    name: "Riviera – Menton",
    communes:
      "Villefranche, Beaulieu, Èze, Beausoleil, Roquebrune-Cap-Martin, Menton, vallée de la Roya",
    postalCodes: [
      "06230",
      "06310",
      "06360",
      "06320",
      "06240",
      "06190",
      "06500",
      "06380",
      "06540",
      "06430",
    ],
  },
  {
    number: 3,
    name: "Antibes – Cagnes – Vence",
    communes: "Antibes, Juan-les-Pins, Biot, Villeneuve-Loubet, Cagnes-sur-Mer, Vence, Saint-Paul",
    postalCodes: ["06600", "06160", "06410", "06270", "06800", "06140", "06570", "06480", "06640"],
  },
  {
    number: 4,
    name: "Cannes – Mandelieu",
    communes: "Cannes, Le Cannet, Mandelieu-la-Napoule, Théoule, Vallauris",
    postalCodes: ["06400", "06150", "06110", "06210", "06590", "06220"],
  },
  {
    number: 5,
    name: "Grasse – Moyen pays",
    communes: "Grasse, Pégomas, Peymeinade, Valbonne-Sophia, Opio, Mougins, Tourrettes-sur-Loup",
    postalCodes: [
      "06130",
      "06520",
      "06580",
      "06530",
      "06560",
      "06650",
      "06250",
      "06140",
      "06370",
      "06740",
      "06620",
      "06460",
      "06550",
      "06810",
    ],
  },
];

/** Secteur dont la zone est exactement celle-ci (ordre indifférent), sinon null. */
export function sectorOfZone(codes: readonly string[]): CommercialSector | null {
  const zone = [...new Set(codes)].sort().join(",");
  return (
    COMMERCIAL_SECTORS.find((s) => [...new Set(s.postalCodes)].sort().join(",") === zone) ?? null
  );
}

/**
 * Objectif mensuel par métier : 30 artisans validés par mois, soit le rythme de 7 par semaine
 * (ADR 0381 ; 66 au rythme de 3 par jour avant, ADR 0367), réparti comme avant entre les métiers.
 */
export const COMMERCIAL_TRADE_TARGETS: readonly { trade: string; perMonth: number }[] = [
  { trade: "Plombiers – chauffagistes", perMonth: 5 },
  { trade: "Électriciens", perMonth: 5 },
  { trade: "Maçons – gros œuvre", perMonth: 5 },
  { trade: "Peintres – plaquistes", perMonth: 4 },
  { trade: "Menuisiers – serruriers", perMonth: 3 },
  { trade: "Carreleurs – soliers", perMonth: 2 },
  { trade: "Couvreurs – charpentiers", perMonth: 2 },
  { trade: "Terrassiers – VRD", perMonth: 1 },
  { trade: "Climatisation – pompes à chaleur", perMonth: 1 },
  { trade: "Paysagistes – piscinistes", perMonth: 1 },
  { trade: "Rénovation tous corps d'état", perMonth: 1 },
];

/** Total mensuel des objectifs par métier (30). */
export const COMMERCIAL_MONTHLY_TARGET = COMMERCIAL_TRADE_TARGETS.reduce(
  (sum, t) => sum + t.perMonth,
  0,
);
