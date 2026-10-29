/**
 * Espace commercial, lot 2 (F-65, ADR 0206) : base de prospects importée de l'API publique
 * « Recherche d'entreprises » (https://recherche-entreprises.api.gouv.fr), suivi par les commerciaux.
 * Fichier autonome (aucun import). Lecture défensive : une réponse inattendue n'importe rien, un
 * champ facultatif douteux devient null, jamais d'exception.
 */

/**
 * Codes NAF rév. 2 du bâtiment ciblés par l'import, sans la promotion immobilière (41.10*), plus
 * l'aménagement paysager. Libellés courts. La NAF 2025 n'est pas encore utilisée par le filtre
 * `activite_principale` de l'API.
 */
export const PROSPECT_APE_CODES: readonly { code: string; label: string }[] = [
  { code: "41.20A", label: "Construction de maisons individuelles" },
  { code: "41.20B", label: "Construction d'autres bâtiments" },
  { code: "42.11Z", label: "Routes et autoroutes" },
  { code: "42.12Z", label: "Voies ferrées" },
  { code: "42.13A", label: "Ouvrages d'art" },
  { code: "42.13B", label: "Tunnels" },
  { code: "42.21Z", label: "Réseaux pour fluides" },
  { code: "42.22Z", label: "Réseaux électriques et télécoms" },
  { code: "42.91Z", label: "Ouvrages maritimes et fluviaux" },
  { code: "42.99Z", label: "Autres ouvrages de génie civil" },
  { code: "43.11Z", label: "Démolition" },
  { code: "43.12A", label: "Terrassement" },
  { code: "43.12B", label: "Terrassement spécialisé" },
  { code: "43.13Z", label: "Forages et sondages" },
  { code: "43.21A", label: "Électricité" },
  { code: "43.21B", label: "Électricité sur la voie publique" },
  { code: "43.22A", label: "Plomberie, gaz" },
  { code: "43.22B", label: "Chauffage, climatisation" },
  { code: "43.29A", label: "Isolation" },
  { code: "43.29B", label: "Autres installations" },
  { code: "43.31Z", label: "Plâtrerie" },
  { code: "43.32A", label: "Menuiserie bois et PVC" },
  { code: "43.32B", label: "Menuiserie métallique, serrurerie" },
  { code: "43.32C", label: "Agencement de magasins" },
  { code: "43.33Z", label: "Revêtements de sols et murs" },
  { code: "43.34Z", label: "Peinture, vitrerie" },
  { code: "43.39Z", label: "Autres finitions" },
  { code: "43.91A", label: "Charpente" },
  { code: "43.91B", label: "Couverture" },
  { code: "43.99A", label: "Étanchéité" },
  { code: "43.99B", label: "Structures métalliques" },
  { code: "43.99C", label: "Maçonnerie, gros œuvre" },
  { code: "43.99D", label: "Autres travaux spécialisés" },
  { code: "43.99E", label: "Location d'engins avec opérateur" },
  { code: "81.30Z", label: "Paysagisme" },
];

const APE_LABELS = new Map(PROSPECT_APE_CODES.map((a) => [a.code, a.label]));

/** Libellé court d'un code APE ciblé (« 43.22A » ou « 4322A »), sinon null. */
export function apeLabel(code: string | null): string | null {
  if (!code) return null;
  const value = code.trim().toUpperCase();
  const dotted = /^\d{4}[A-Z]$/.test(value) ? `${value.slice(0, 2)}.${value.slice(2)}` : value;
  return APE_LABELS.get(dotted) ?? null;
}

/** Étapes du suivi d'un prospect (enum `public.prospect_status`). */
export const PROSPECT_STATUSES = [
  "a_contacter",
  "rdv_pris",
  "demo_faite",
  "pas_interesse",
] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

const DEPARTEMENT_PATTERN = /^(0[1-9]|1[0-9]|2[1-9]|[3-8][0-9]|9[0-5]|2A|2B|97[1-6])$/;

/** Département importable : 01 à 95 (hors 20), 2A, 2B, 971 à 976. */
export function isDepartementCode(value: unknown): value is string {
  return typeof value === "string" && DEPARTEMENT_PATTERN.test(value);
}

/** 25 résultats par page, 10 000 au plus par recherche : l'API refuse au-delà de la page 400. */
export const COMPANY_SEARCH_MAX_PAGE = 400;

/** Une page d'entreprises actives d'une activité dans un département. */
export function companySearchUrl(departement: string, ape: string, page: number): string {
  return (
    "https://recherche-entreprises.api.gouv.fr/search" +
    `?activite_principale=${encodeURIComponent(ape)}` +
    `&departement=${encodeURIComponent(departement)}` +
    // 10 établissements par entreprise par défaut : jusqu'à 100 (maximum de l'API).
    `&etat_administratif=A&limite_matching_etablissements=100&per_page=25&page=${page}`
  );
}

/** Ligne envoyée à `admin_import_prospects` (mêmes clés). */
export type ProspectImportRow = {
  siret: string;
  denomination: string;
  enseigne: string | null;
  ape_code: string | null;
  nature_juridique: string | null;
  /** AAAA-MM-JJ. */
  date_creation: string | null;
  tranche_effectif: string | null;
  adresse: string | null;
  code_postal: string | null;
  commune: string | null;
  code_insee: string | null;
  departement: string;
  lon: number | null;
  lat: number | null;
  rge: boolean;
  est_siege: boolean;
};

type Obj = Record<string, unknown>;

function isObj(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Texte exploitable : caractères de contrôle retirés, espaces resserrés, coupé à `max` caractères
 * (sans casser un caractère composé de deux unités UTF-16). Vide ou masqué (« [NON-DIFFUSIBLE] »,
 * « [ND] ») : null.
 */
function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value
    .replace(/\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (v === "" || /NON[- ]DIFFUSIBLE/i.test(v) || v === "[ND]") return null;
  const chars = Array.from(v);
  return chars.length > max ? chars.slice(0, max).join("").trim() : v;
}

/** Code respectant un format, sinon null. */
function code(value: unknown, pattern: RegExp): string | null {
  return typeof value === "string" && pattern.test(value) ? value : null;
}

/** Date AAAA-MM-JJ existante, sinon null. */
function isoDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? value : null;
}

/** Coordonnée (chaîne ou nombre) dans des bornes plausibles (France et outre-mer), sinon null. */
function coordinate(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? parseFloat(value) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/** Début attendu des codes postaux du département : « 06 », « 20 » pour la Corse, « 971 »… */
function postcodePrefix(departement: string): string {
  return departement === "2A" || departement === "2B" ? "20" : departement;
}

const APE_CODES = new Set(PROSPECT_APE_CODES.map((a) => a.code));

/**
 * Lit une page de l'API pour un département : un prospect par établissement ouvert, diffusible,
 * situé dans le département et dont l'activité est ciblée (la recherche renvoie aussi des
 * établissements fermés ou d'une autre activité). Entreprise non diffusible : ignorée.
 */
export function parseCompanySearch(
  body: unknown,
  departement: string,
): { rows: ProspectImportRow[]; totalPages: number } {
  if (!isObj(body) || !Array.isArray(body.results) || !isDepartementCode(departement)) {
    return { rows: [], totalPages: 0 };
  }
  const total = body.total_pages;
  const totalPages =
    typeof total === "number" && Number.isFinite(total) && total > 0
      ? Math.min(Math.floor(total), COMPANY_SEARCH_MAX_PAGE)
      : 0;
  const prefix = postcodePrefix(departement);
  const seen = new Set<string>();
  const rows: ProspectImportRow[] = [];

  for (const company of body.results) {
    if (!isObj(company) || company.statut_diffusion !== "O") continue;
    if (company.etat_administratif === "F") continue;
    const denomination = text(company.nom_raison_sociale, 200) ?? text(company.nom_complet, 200);
    if (!denomination || !Array.isArray(company.matching_etablissements)) continue;

    for (const etab of company.matching_etablissements) {
      if (!isObj(etab)) continue;
      if (etab.etat_administratif !== "A" || etab.statut_diffusion_etablissement !== "O") continue;
      const siret = code(etab.siret, /^\d{14}$/);
      const postcode = code(etab.code_postal, /^\d{5}$/);
      const ape = typeof etab.activite_principale === "string" ? etab.activite_principale : "";
      if (!siret || seen.has(siret) || !postcode?.startsWith(prefix) || !APE_CODES.has(ape)) {
        continue;
      }
      seen.add(siret);

      const enseignes = Array.isArray(etab.liste_enseignes) ? etab.liste_enseignes : [];
      const lon = coordinate(etab.longitude, -63, 56);
      const lat = coordinate(etab.latitude, -22, 52);
      const located = lon !== null && lat !== null;

      rows.push({
        siret,
        denomination,
        enseigne: text(etab.nom_commercial, 200) ?? text(enseignes[0], 200),
        ape_code: ape,
        nature_juridique: code(company.nature_juridique, /^\d{4}$/),
        date_creation: isoDate(etab.date_creation) ?? isoDate(company.date_creation),
        // Taille de l'entreprise (plus parlante pour un commercial), sinon de l'établissement.
        tranche_effectif:
          code(company.tranche_effectif_salarie, /^(NN|\d{2})$/) ??
          code(etab.tranche_effectif_salarie, /^(NN|\d{2})$/),
        adresse: text(etab.adresse, 300),
        code_postal: postcode,
        commune: text(etab.libelle_commune, 100),
        code_insee: code(etab.commune, /^(\d{5}|2[AB]\d{3})$/),
        departement,
        lon: located ? lon : null,
        lat: located ? lat : null,
        rge: Array.isArray(etab.liste_rge) && etab.liste_rge.length > 0,
        est_siege: etab.est_siege === true,
      });
    }
  }
  return { rows, totalPages };
}

/**
 * Étape suivante de l'import : page suivante du même code APE, sinon page 1 du code suivant,
 * sinon null (import terminé).
 */
export function nextImportStep(
  current: { apeIndex: number; page: number },
  totalPages: number,
): { apeIndex: number; page: number } | null {
  if (current.page < Math.min(totalPages, COMPANY_SEARCH_MAX_PAGE)) {
    return { apeIndex: current.apeIndex, page: current.page + 1 };
  }
  if (current.apeIndex + 1 < PROSPECT_APE_CODES.length) {
    return { apeIndex: current.apeIndex + 1, page: 1 };
  }
  return null;
}

/** Itinéraire vers le prospect (Google Maps choisit l'application ou le site). */
export function directionsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
}
