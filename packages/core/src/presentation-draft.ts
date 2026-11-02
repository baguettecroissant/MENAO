/**
 * Présentation proposée à l'artisan (« Proposer un texte ») : quelques phrases construites avec ce
 * que MENAO sait déjà (métiers, ville, zone, ancienneté, RGE), que l'artisan relit et modifie.
 * Sans IA : instantané, gratuit et prévisible. La phrase de fin suffit à atteindre les 100 caractères
 * demandés (PRESENTATION_MIN_LENGTH). « Je » pour un entrepreneur individuel, « nous » sinon.
 */
import { territoryLabel, type ZoneMode } from "./zone-territories";

export type PresentationDraftInput = {
  /** Nom commercial, sinon raison sociale. */
  companyName: string | null;
  /** Catégorie juridique INSEE : 1000 = entrepreneur individuel. */
  legalFormCode: string | null;
  /** Libellés des métiers, dans l'ordre d'affichage. */
  trades: readonly string[];
  /** Commune de l'établissement (Sirene), souvent en majuscules. */
  city: string | null;
  zoneMode: ZoneMode | null;
  radiusKm: number | null;
  /** Codes des départements ou des régions (zone par territoire). */
  territories: readonly string[];
  /** Année de création de l'entreprise. */
  sinceYear: number | null;
  experienceYears: number | null;
  /** Qualification RGE en cours de validité. */
  rge: boolean;
};

const PARTICLES = new Set(["de", "du", "des", "la", "le", "les", "sur", "sous", "en", "et", "lès"]);

/** « SAINT-LAURENT-DU-VAR » → « Saint-Laurent-du-Var », « L'ESCARENE » → « L'Escarene ». */
export function communeName(value: string): string {
  let index = 0;
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\p{L}']+/gu, (word) => {
      const first = index++ === 0;
      if (!first && PARTICLES.has(word)) return word;
      return word.replace(
        /(^|')(\p{L})/gu,
        (_, sep: string, letter: string) => sep + letter.toUpperCase(),
      );
    });
}

/** « Menuisier », « Menuisier et plaquiste », « Menuisier, plaquiste et peintre ». */
export function tradeList(trades: readonly string[]): string {
  const list = [...new Set(trades.map((t) => t.trim()).filter(Boolean))].map((t, i) =>
    i === 0 ? t : t.charAt(0).toLowerCase() + t.slice(1),
  );
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} et ${list[list.length - 1]}`;
}

/** Suite « le 06, le 83 et le 04 », « les régions Bretagne et Normandie ». */
function enumerate(items: readonly string[]): string {
  return items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

/** Où l'artisan intervient ; vide si la zone n'est pas encore choisie. */
function zonePhrase(input: PresentationDraftInput, city: string | null): string {
  switch (input.zoneMode) {
    case "rayon":
      return input.radiusKm
        ? `dans un rayon de ${input.radiusKm} km${city ? ` autour de ${city}` : ""}`
        : "";
    case "communes":
      return city ? `à ${city} et dans les communes alentour` : "dans les communes alentour";
    case "departements":
      return input.territories.length
        ? `dans ${input.territories.length === 1 ? "tout " : ""}${enumerate(input.territories.map((c) => `le ${c}`))}`
        : "";
    case "regions": {
      const names = input.territories.map((c) => territoryLabel("regions", c));
      return names.length === 1
        ? `dans la région ${names[0]}`
        : names.length
          ? `dans les régions ${enumerate(names)}`
          : "";
    }
    case "france":
      return "partout en France";
    default:
      return "";
  }
}

export function presentationDraft(input: PresentationDraftInput, currentYear: number): string {
  const individual = input.legalFormCode === "1000";
  const trades = tradeList(input.trades);
  const city = input.city ? communeName(input.city) : null;
  const zone = zonePhrase(input, city);
  const since =
    input.sinceYear && input.sinceYear >= 1900 && input.sinceYear <= currentYear
      ? ` depuis ${input.sinceYear}`
      : "";
  const where =
    city && input.zoneMode !== "rayon" && input.zoneMode !== "communes" ? ` à ${city}` : "";
  const name = input.companyName?.replace(/\s+/g, " ").trim() || null;

  const sentences: string[] = [];
  if (individual || !name) {
    const who = trades ? `${trades}${city ? ` à ${city}` : ""}` : null;
    const verb = individual ? "j'interviens" : "nous intervenons";
    const action = [verb, zone].filter(Boolean).join(" ") + since;
    sentences.push(
      who ? `${who}, ${action}.` : `${action.charAt(0).toUpperCase()}${action.slice(1)}.`,
    );
  } else {
    const what = trades ? `, ${trades.charAt(0).toLowerCase()}${trades.slice(1)}${where}` : where;
    sentences.push(`${name}${what}, intervient ${zone || "auprès des particuliers"}${since}.`);
  }
  if (input.experienceYears && input.experienceYears > 0) {
    const years = input.experienceYears === 1 ? "1 an" : `${input.experienceYears} ans`;
    sentences.push(`${years} d'expérience dans le métier.`);
  }
  if (input.rge) sentences.push("Entreprise qualifiée RGE.");
  sentences.push(
    individual
      ? "Je vous propose un devis détaillé et je reste disponible pour répondre à toutes vos questions sur votre projet."
      : "Nous vous proposons un devis détaillé et restons disponibles pour répondre à toutes vos questions sur votre projet.",
  );
  return sentences.join(" ");
}
