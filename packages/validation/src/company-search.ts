import { z } from "zod";

/**
 * API Recherche d'entreprises de l'État (celle de l'Annuaire des entreprises) : gratuite, sans
 * clé, CORS ouvert, limitée à 7 requêtes par seconde et par adresse IP.
 * https://recherche-entreprises.api.gouv.fr — l'artisan y retrouve son entreprise par son nom ou
 * son SIRET pendant l'inscription (ADR 0110). Ce n'est qu'un pré-remplissage : le serveur revérifie
 * le SIRET auprès de l'INSEE (sirene-check, ADR 0006).
 */
export const COMPANY_SEARCH_URL = "https://recherche-entreprises.api.gouv.fr/search";

/** En dessous de 3 caractères, l'API répond 400. */
export const COMPANY_SEARCH_MIN_LENGTH = 3;

export function companySearchUrl(query: string): string {
  const params = new URLSearchParams({
    q: query.trim(),
    per_page: "5",
    page: "1",
    minimal: "true",
    include: "siege,dirigeants",
  });
  return `${COMPANY_SEARCH_URL}?${params}`;
}

export type CompanyManager = { firstName: string; lastName: string; role: string | null };

export type CompanySuggestion = {
  siren: string;
  /** SIRET du siège. */
  siret: string;
  name: string;
  /** Code de la catégorie juridique (4 chiffres), traduit par FORMES_JURIDIQUES. */
  legalFormCode: string | null;
  /** Entreprise et siège en activité. */
  active: boolean;
  apeCode: string | null;
  creationYear: string | null;
  address: string | null;
  postcode: string | null;
  city: string | null;
  citycode: string | null;
  lon: number | null;
  lat: number | null;
  /** Dirigeants personnes physiques (prénom usuel et nom). Les dates de naissance sont ignorées. */
  managers: CompanyManager[];
};

const text = z.string().nullish();

const resultSchema = z.object({
  siren: z.string(),
  nom_raison_sociale: text,
  nom_complet: text,
  nature_juridique: text,
  etat_administratif: text,
  activite_principale: text,
  date_creation: text,
  siege: z.object({
    siret: z.string(),
    etat_administratif: text,
    adresse: text,
    code_postal: text,
    libelle_commune: text,
    commune: text,
    latitude: z.union([z.string(), z.number()]).nullish(),
    longitude: z.union([z.string(), z.number()]).nullish(),
  }),
  dirigeants: z
    .array(
      z.object({
        type_dirigeant: text,
        nom: text,
        prenoms: text,
        qualite: text,
      }),
    )
    .nullish(),
});

const responseSchema = z.object({ results: z.array(z.unknown()) });

/** Mots laissés en minuscules dans un nom de lieu (« Cagnes-sur-Mer », « Rue de la Paix »). */
const PARTICLES = new Set([
  "de",
  "des",
  "du",
  "la",
  "le",
  "les",
  "sur",
  "sous",
  "en",
  "et",
  "aux",
  "au",
  "lès",
  "lez",
]);

/** « CAGNES-SUR-MER » → « Cagnes-sur-Mer », « 7 RUE DE L'EGLISE » → « 7 Rue de l'Eglise ». */
export function titleCaseFr(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\p{L}]+/gu, (word, offset: number) => {
      if (offset > 0 && PARTICLES.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .replace(
      /\b([DL])'(\p{L})/gu,
      (_m, letter: string, next: string) =>
        // Élision après le premier mot : « de l'Église », pas « De L'Église ».
        `${letter.toLowerCase()}'${next.toUpperCase()}`,
    )
    .replace(/^([dl])'/, (m) => m.toUpperCase());
}

function clean(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v && !/^\[?non[- ]diffusible\]?$/i.test(v) && v !== "[ND]" ? v : null;
}

function coordinate(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Lit une réponse de l'API ; les résultats inattendus sont ignorés, jamais d'exception. */
export function parseCompanySearch(json: unknown): CompanySuggestion[] {
  const response = responseSchema.safeParse(json);
  if (!response.success) return [];
  return response.data.results.flatMap((raw) => {
    const parsed = resultSchema.safeParse(raw);
    if (!parsed.success) return [];
    const r = parsed.data;
    const name = clean(r.nom_raison_sociale) ?? clean(r.nom_complet);
    if (!/^\d{9}$/.test(r.siren) || !/^\d{14}$/.test(r.siege.siret) || !name) return [];
    const city = clean(r.siege.libelle_commune);
    const address = clean(r.siege.adresse);
    const managers = (r.dirigeants ?? []).flatMap((d) => {
      const lastName = clean(d.nom);
      const firstName = clean(d.prenoms)?.split(/\s+/)[0];
      if (d.type_dirigeant !== "personne physique" || !lastName || !firstName) return [];
      return [
        {
          firstName: titleCaseFr(firstName),
          lastName: titleCaseFr(lastName),
          role: clean(d.qualite),
        },
      ];
    });
    return [
      {
        siren: r.siren,
        siret: r.siege.siret,
        name,
        legalFormCode: clean(r.nature_juridique),
        active: r.etat_administratif === "A" && r.siege.etat_administratif === "A",
        apeCode: clean(r.activite_principale),
        creationYear: clean(r.date_creation)?.slice(0, 4) ?? null,
        address: address ? titleCaseFr(address) : null,
        postcode: clean(r.siege.code_postal),
        city: city ? titleCaseFr(city) : null,
        citycode: clean(r.siege.commune),
        lon: coordinate(r.siege.longitude),
        lat: coordinate(r.siege.latitude),
        managers,
      },
    ];
  });
}
