/**
 * Lecture d'une réponse de l'API Sirene (INSEE, v3.11, GET /siret/{siret}).
 * Fichier autonome (aucun import) : il est aussi importé par l'Edge Function `sirene-check`.
 * Lecture défensive : toute réponse inattendue donne `null`.
 */

export type SireneEtablissement = {
  siret: string;
  siren: string;
  /** Établissement et unité légale actifs. */
  active: boolean;
  /** Diffusion partielle (entrepreneur ayant refusé la diffusion) : certains champs sont masqués. */
  partialDiffusion: boolean;
  raisonSociale: string | null;
  formeJuridiqueCode: string | null;
  apeCode: string | null;
  adresse: {
    ligne: string | null;
    codePostal: string | null;
    commune: string | null;
    codeInsee: string | null;
  };
};

type Obj = Record<string, unknown>;

function isObj(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Chaîne exploitable : non vide et non masquée (« [ND] » = non diffusible). */
function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v === "" || v === "[ND]" ? null : v;
}

export function parseSireneEtablissement(body: unknown): SireneEtablissement | null {
  if (!isObj(body) || !isObj(body.etablissement)) return null;
  const etab = body.etablissement;
  const siret = str(etab.siret);
  const siren = str(etab.siren);
  if (!siret || !siren) return null;

  const ul = isObj(etab.uniteLegale) ? etab.uniteLegale : {};
  const adr = isObj(etab.adresseEtablissement) ? etab.adresseEtablissement : {};
  const periodes = Array.isArray(etab.periodesEtablissement) ? etab.periodesEtablissement : [];
  const periode =
    (periodes.find((p) => isObj(p) && p.dateFin == null) as Obj | undefined) ??
    (isObj(periodes[0]) ? periodes[0] : {});

  const etabActif = periode.etatAdministratifEtablissement === "A";
  const ulActive = ul.etatAdministratifUniteLegale === "A";

  const personne = [
    str(ul.prenomUsuelUniteLegale) ?? str(ul.prenom1UniteLegale),
    str(ul.nomUniteLegale),
  ]
    .filter(Boolean)
    .join(" ");
  const raisonSociale = str(ul.denominationUniteLegale) ?? (personne || null);

  const voie = [
    str(adr.numeroVoieEtablissement),
    str(adr.indiceRepetitionEtablissement),
    str(adr.typeVoieEtablissement),
    str(adr.libelleVoieEtablissement),
  ]
    .filter(Boolean)
    .join(" ");

  return {
    siret,
    siren,
    active: etabActif && ulActive,
    partialDiffusion:
      etab.statutDiffusionEtablissement === "P" || ul.statutDiffusionUniteLegale === "P",
    raisonSociale,
    formeJuridiqueCode: str(ul.categorieJuridiqueUniteLegale),
    apeCode: str(ul.activitePrincipaleUniteLegale) ?? str(periode.activitePrincipaleEtablissement),
    adresse: {
      ligne: voie || null,
      codePostal: str(adr.codePostalEtablissement),
      commune: str(adr.libelleCommuneEtablissement),
      codeInsee: str(adr.codeCommuneEtablissement),
    },
  };
}
