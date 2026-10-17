/**
 * Contrôle automatique du RGE (ADR 0118) : les qualifications de l'entreprise sont lues, par
 * SIRET, dans la « Liste des entreprises RGE » de l'ADEME (données publiques sous Licence Ouverte,
 * mises à jour chaque jour, celles de l'annuaire France Rénov'). Fonctions pures, partagées par
 * les Edge Functions et le site : adresse de la requête, lecture de la réponse, et
 * correspondance avec une certification déclarée par l'artisan.
 */

export const RGE_DATASET_LINES_URL =
  "https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines";

/** Une entreprise compte rarement plus de quelques dizaines de lignes (une par domaine). */
export const RGE_MAX_ROWS = 200;

/** Nouvelle lecture de l'annuaire au plus tard une semaine après la précédente. */
export const RGE_REFRESH_DAYS = 7;

const FIELDS = [
  "siret",
  "organisme",
  "code_qualification",
  "nom_qualification",
  "nom_certificat",
  "domaine",
  "meta_domaine",
  "particulier",
  "lien_date_debut",
  "lien_date_fin",
  "url_qualification",
] as const;

export type RgeQualification = {
  /** Organisme de qualification (qualibat, qualitenr, qualifelec…). */
  organisme: string;
  code: string;
  name: string;
  /** Nom du certificat (« QUALIBAT-RGE », « QualiPAC module Chauffage et ECS »…). */
  certificate: string | null;
  /** Domaine de travaux (« Isolation des combles perdus »…). */
  domain: string;
  /** Grande famille (« Travaux d'efficacité énergétique »…). */
  category: string | null;
  /** Travaux chez les particuliers. */
  particulier: boolean | null;
  startsOn: string | null;
  endsOn: string;
  /** Certificat publié par l'organisme. */
  url: string | null;
};

/** Adresse de la requête : lignes du SIRET, champs utiles seulement. */
export function rgeLinesUrl(siret: string, base: string = RGE_DATASET_LINES_URL): string {
  const url = new URL(base);
  url.searchParams.set("siret_eq", siret);
  url.searchParams.set("size", String(RGE_MAX_ROWS));
  url.searchParams.set("select", FIELDS.join(","));
  return url.toString();
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function day(value: unknown): string | null {
  const v = typeof value === "string" ? value.slice(0, 10) : null;
  return v && ISO_DAY.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;
}

function link(value: unknown): string | null {
  const v = text(value, 1000);
  return v && /^https:\/\/[^\s]+$/.test(v) ? v : null;
}

/**
 * Qualifications lues dans la réponse de l'API (`{ results: [...] }`), pour ce SIRET seulement.
 * Lignes incomplètes ignorées ; une ligne par organisme, qualification et domaine (la plus
 * longue validité). Null si la réponse n'a pas la forme attendue.
 */
export function parseRgeLines(json: unknown, siret: string): RgeQualification[] | null {
  const results = (json as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return null;
  const byKey = new Map<string, RgeQualification>();
  for (const raw of results) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (String(r.siret ?? "").replace(/\s/g, "") !== siret) continue;
    const organisme = text(r.organisme, 60)?.toLowerCase() ?? null;
    const code = text(r.code_qualification, 60);
    const name = text(r.nom_qualification, 300);
    const domain = text(r.domaine, 200);
    const endsOn = day(r.lien_date_fin);
    if (!organisme || !code || !name || !domain || !endsOn) continue;
    const row: RgeQualification = {
      organisme,
      code,
      name,
      certificate: text(r.nom_certificat, 200),
      domain,
      category: text(r.meta_domaine, 200),
      particulier: typeof r.particulier === "boolean" ? r.particulier : null,
      startsOn: day(r.lien_date_debut),
      endsOn,
      url: link(r.url_qualification),
    };
    const key = `${organisme}|${code}|${domain}`;
    const previous = byKey.get(key);
    if (!previous || previous.endsOn < endsOn) byKey.set(key, row);
  }
  return [...byKey.values()].sort(
    (a, b) =>
      (a.category ?? "").localeCompare(b.category ?? "", "fr") ||
      a.domain.localeCompare(b.domain, "fr"),
  );
}

/** Domaines RGE valides à cette date, sans doublon, dans l'ordre alphabétique. */
export function validRgeDomains(
  rows: readonly Pick<RgeQualification, "domain" | "endsOn">[],
  today: string,
): string[] {
  return [...new Set(rows.filter((r) => r.endsOn >= today).map((r) => r.domain))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
}

/** Certificats QualitEnR, reconnus d'après le début du nom du certificat. */
const QUALITENR_PREFIX: Record<string, string> = {
  qualipac: "qualipac",
  qualipv: "qualipv",
  qualisol: "qualisol",
  qualibois: "qualibois",
};

/**
 * Ligne de l'annuaire qui confirme une certification déclarée par l'artisan (même organisme, ou
 * même certificat QualitEnR), encore valide ; celle qui dure le plus longtemps. Aide à la
 * vérification par l'équipe : l'annuaire ne liste que les qualifications RGE, une qualification
 * non RGE (Qualibat « maçonnerie »…) reste à vérifier sur le site de l'organisme.
 */
export function rgeConfirmation<
  T extends Pick<RgeQualification, "organisme" | "certificate" | "endsOn">,
>(type: string, rows: readonly T[], today: string): T | null {
  const prefix = QUALITENR_PREFIX[type];
  const matches = rows.filter((r) => {
    if (r.endsOn < today) return false;
    if (type === "rge") return true;
    if (type === "qualibat" || type === "qualifelec") return r.organisme === type;
    if (prefix) {
      return r.organisme === "qualitenr" && (r.certificate ?? "").toLowerCase().startsWith(prefix);
    }
    return false;
  });
  return matches.reduce<T | null>((best, r) => (!best || r.endsOn > best.endsOn ? r : best), null);
}
