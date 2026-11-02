/**
 * Entreprise vérifiée au registre, à la place du Kbis déposé (ADR 0217). MENAO lit l'annuaire
 * public des entreprises (API Recherche d'entreprises de l'État, qui réunit le registre national
 * des entreprises et Sirene) : entreprise active, et inscrit présent parmi ses dirigeants.
 * Dans ce cas, une fiche de vérification datée tient lieu de Kbis ; sinon, le Kbis reste demandé.
 * Fichier autonome (aucun import) : importé par l'Edge Function sirene-check.
 */

/** Dirigeant personne physique, tel que publié (nom, prénoms). */
export type RegistryPerson = {
  lastName: string;
  /** Tous les prénoms publiés, dans l'ordre. */
  firstNames: string[];
  /** Fonction (« Président de SAS », « Gérant ») ; absente pour un entrepreneur individuel. */
  role: string | null;
};

export type RegistryEntry = {
  siren: string;
  name: string;
  legalFormCode: string | null;
  active: boolean;
  /** Date de création (AAAA-MM-JJ). */
  creationDate: string | null;
  /** Diffusion partielle : les dirigeants ne sont pas publiés. */
  masked: boolean;
  managers: RegistryPerson[];
};

/** Résultat du contrôle, enregistré sur la fiche de l'artisan. */
export const REGISTRY_OUTCOMES = [
  "verifie",
  "inactive",
  "introuvable",
  "masque",
  "dirigeant_absent",
] as const;
export type RegistryOutcome = (typeof REGISTRY_OUTCOMES)[number];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.replace(/\s+/g, " ").trim() : null;

/** Adresse de recherche d'une entreprise par son SIREN (dirigeants compris). */
export function registrySearchUrl(baseUrl: string, siren: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/search?q=${encodeURIComponent(siren)}&include=siege,dirigeants&minimal=true&page=1&per_page=5`;
}

/** Lit la réponse de l'API pour ce SIREN ; null si l'entreprise n'y figure pas. */
export function parseRegistrySearch(json: unknown, siren: string): RegistryEntry | null {
  const results = isObj(json) && Array.isArray(json.results) ? json.results : [];
  const r = results.find((x): x is Obj => isObj(x) && x.siren === siren);
  if (!r) return null;
  const siege = isObj(r.siege) ? r.siege : {};
  const managers = (Array.isArray(r.dirigeants) ? r.dirigeants : []).flatMap((d) => {
    if (!isObj(d) || d.type_dirigeant !== "personne physique") return [];
    const lastName = text(d.nom);
    const firstNames = (text(d.prenoms) ?? "").split(" ").filter(Boolean);
    return lastName && firstNames.length ? [{ lastName, firstNames, role: text(d.qualite) }] : [];
  });
  return {
    siren,
    name: text(r.nom_raison_sociale) ?? text(r.nom_complet) ?? siren,
    legalFormCode: text(r.nature_juridique),
    active: r.etat_administratif === "A" && siege.etat_administratif !== "F",
    creationDate: text(r.date_creation),
    masked: r.statut_diffusion === "P",
    managers,
  };
}

/** Nom comparable : sans accents ni ponctuation, en majuscules, espaces simples. */
export function comparableName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]+/g, " ")
    .trim();
}

/**
 * Dirigeant correspondant à l'inscrit : même nom, et son premier prénom parmi les prénoms publiés
 * (« Jean » pour « JEAN-PIERRE MARIE »). Un nom d'usage différent du nom publié ne correspond pas :
 * le Kbis est alors demandé.
 */
export function matchingManager(
  managers: readonly RegistryPerson[],
  person: { firstName: string; lastName: string },
): RegistryPerson | null {
  const last = comparableName(person.lastName);
  const first = comparableName(person.firstName).split(" ")[0] ?? "";
  if (!last || !first) return null;
  return (
    managers.find(
      (m) =>
        comparableName(m.lastName) === last &&
        m.firstNames.flatMap((f) => comparableName(f).split(" ")).includes(first),
    ) ?? null
  );
}

/**
 * Résultat du contrôle : entreprise introuvable ou fermée, dirigeants non publiés, inscrit absent
 * des dirigeants (ou qui n'a pas déclaré être le dirigeant), sinon vérifiée.
 */
export function registryOutcome(
  entry: RegistryEntry | null,
  person: { firstName: string | null; lastName: string | null; isDirigeant: boolean | null },
): RegistryOutcome {
  if (!entry) return "introuvable";
  if (!entry.active) return "inactive";
  if (entry.masked || entry.managers.length === 0) return "masque";
  if (person.isDirigeant !== true || !person.firstName || !person.lastName)
    return "dirigeant_absent";
  return matchingManager(entry.managers, {
    firstName: person.firstName,
    lastName: person.lastName,
  })
    ? "verifie"
    : "dirigeant_absent";
}
