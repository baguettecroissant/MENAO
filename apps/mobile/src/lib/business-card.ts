import { initials } from "@menao/core";

/**
 * Carte de visite de l'artisan (refonte « Nette », lot 17) : textes affichés sur la carte, à partir
 * des données de « Mon profil ». Fonctions pures, testées ; aucune lecture réseau.
 */

/** Formes juridiques et mots génériques ignorés pour les initiales de l'entreprise. */
const IGNORED = new Set([
  "sarl",
  "sas",
  "sasu",
  "eurl",
  "ei",
  "eirl",
  "sa",
  "sci",
  "snc",
  "scop",
  "entreprise",
  "ets",
  "etablissements",
  "de",
  "du",
  "des",
  "d",
  "la",
  "le",
  "les",
  "l",
  "et",
  "en",
  "au",
  "aux",
]);

const fold = (word: string) => word.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("fr");

/**
 * Initiales de l'entreprise pour le carré de la carte, deux au plus : sans forme juridique ni petits
 * mots (« Plomberie du Sud SARL » → « PS », « L'Atelier du Bois » → « AB »). Si rien ne reste, les
 * initiales du nom complet.
 */
export function companyInitials(name: string): string {
  const words = name
    .normalize("NFC")
    .split(/[\s\-'’.,&/]+/)
    .filter((word) => word !== "" && !IGNORED.has(fold(word)));
  return initials(words.join(" ")) || initials(name);
}

/** Domaine du site, sans protocole, « www. » ni chemin (« https://menao.fr/x » → « menao.fr »). */
export function siteDomain(url: string): string {
  return url
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/[/?#:].*$/, "");
}

/**
 * Téléphone lisible : un numéro français enregistré au format E.164 (« +33612345678 ») s'écrit
 * « 06 12 34 56 78 » ; un autre numéro reste tel quel. Rien si vide.
 */
export function cardPhone(phone: string | null | undefined): string | null {
  const value = phone?.trim() ?? "";
  if (!value) return null;
  const french = /^\+33(\d{9})$/.exec(value.replace(/\s/g, ""));
  if (!french) return value;
  return `0${french[1]}`.replace(/(\d{2})(?=\d)/g, "$1 ");
}

export type BusinessCardInfo = {
  /** Grand titre : l'entreprise, sinon la personne. */
  title: string;
  /** Prénom et nom, s'ils diffèrent du titre. */
  person: string | null;
  trade: string | null;
  phone: string | null;
  initials: string;
};

/** Lignes de la carte : une donnée absente n'a pas de ligne. */
export function businessCardInfo(input: {
  name: string;
  initials: string;
  company: string | null;
  trade: string | null;
  phone?: string | null;
}): BusinessCardInfo {
  const company = input.company?.trim() || null;
  const name = input.name.trim();
  const title = company ?? name;
  return {
    title,
    person: name && fold(name) !== fold(title) ? name : null,
    trade: input.trade?.trim() || null,
    phone: cardPhone(input.phone),
    initials: company ? companyInitials(company) : input.initials || initials(name),
  };
}
