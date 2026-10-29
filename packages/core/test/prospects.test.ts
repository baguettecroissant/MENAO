import { describe, expect, it } from "vitest";
import {
  COMPANY_SEARCH_MAX_PAGE,
  PROSPECT_APE_CODES,
  PROSPECT_STATUSES,
  apeLabel,
  companySearchUrl,
  directionsUrl,
  isDepartementCode,
  nextImportStep,
  parseCompanySearch,
  type ProspectImportRow,
} from "../src/prospects";

/**
 * Établissement au format de l'API « Recherche d'entreprises » (champs repris d'une vraie
 * réponse) ; noms, adresses et SIRET fictifs.
 */
function etab(overrides: Record<string, unknown> = {}) {
  return {
    a_opco: false,
    activite_principale: "43.22A",
    activite_principale_naf25: null,
    ancien_siege: false,
    adresse: "12 AVENUE DE L'EXEMPLE 06000 NICE",
    caractere_employeur: "N",
    code_postal: "06000",
    commune: "06088",
    date_creation: "2015-03-01",
    date_debut_activite: "2015-03-01",
    date_fermeture: null,
    epci: "200030195",
    est_siege: true,
    etat_administratif: "A",
    geo_id: null,
    latitude: "43.7031767",
    libelle_commune: "NICE",
    liste_enseignes: null,
    liste_finess: null,
    liste_id_bio: null,
    liste_idcc: null,
    liste_id_organisme_formation: null,
    liste_rge: null,
    liste_uai: null,
    longitude: "7.2760780",
    nom_commercial: null,
    region: "93",
    siret: "00000065000010",
    statut_diffusion_etablissement: "O",
    tranche_effectif_salarie: "NN",
    ...overrides,
  };
}

/** Entreprise fictive avec ses établissements correspondant à la recherche. */
function company(
  overrides: Record<string, unknown> = {},
  matching: Record<string, unknown>[] = [etab()],
) {
  return {
    siren: "000000650",
    siren_conserve: null,
    nom_complet: "PLOMBERIE EXEMPLE AZUR",
    nom_raison_sociale: "PLOMBERIE EXEMPLE AZUR",
    sigle: null,
    nombre_etablissements: matching.length,
    nombre_etablissements_ouverts: matching.length,
    activite_principale: "43.22A",
    activite_principale_naf25: "43.22G",
    categorie_entreprise: "PME",
    date_creation: "2008-09-25",
    date_fermeture: null,
    etat_administratif: "A",
    nature_juridique: "5499",
    section_activite_principale: "F",
    tranche_effectif_salarie: "11",
    statut_diffusion: "O",
    matching_etablissements: matching,
    ...overrides,
  };
}

function page(results: unknown[], totalPages = 100) {
  return {
    results,
    total_results: totalPages * 25,
    page: 1,
    per_page: 25,
    total_pages: totalPages,
  };
}

const expectedRow: ProspectImportRow = {
  siret: "00000065000010",
  denomination: "PLOMBERIE EXEMPLE AZUR",
  enseigne: null,
  ape_code: "43.22A",
  nature_juridique: "5499",
  date_creation: "2015-03-01",
  tranche_effectif: "11",
  adresse: "12 AVENUE DE L'EXEMPLE 06000 NICE",
  code_postal: "06000",
  commune: "NICE",
  code_insee: "06088",
  departement: "06",
  lon: 7.276078,
  lat: 43.7031767,
  rge: false,
  est_siege: true,
};

describe("codes APE ciblés (F-65)", () => {
  it("35 codes du bâtiment, uniques, au format NAF rév. 2, sans promotion immobilière", () => {
    const codes = PROSPECT_APE_CODES.map((a) => a.code);
    expect(codes).toHaveLength(35);
    expect(new Set(codes).size).toBe(35);
    for (const { code, label } of PROSPECT_APE_CODES) {
      expect(code).toMatch(/^\d{2}\.\d{2}[A-Z]$/);
      expect(label.length).toBeGreaterThan(0);
    }
    expect(codes.some((c) => c.startsWith("41.10"))).toBe(false);
    expect(codes).toContain("81.30Z");
  });

  it("libellé court d'un code, avec ou sans point ; null hors liste", () => {
    expect(apeLabel("43.22A")).toBe("Plomberie, gaz");
    expect(apeLabel("4322a")).toBe("Plomberie, gaz");
    expect(apeLabel("43.99C")).toBe("Maçonnerie, gros œuvre");
    expect(apeLabel("41.10A")).toBeNull();
    expect(apeLabel("71.20B")).toBeNull();
    expect(apeLabel("")).toBeNull();
    expect(apeLabel(null)).toBeNull();
  });
});

describe("étapes du suivi", () => {
  it("dans l'ordre de l'enum SQL", () => {
    expect(PROSPECT_STATUSES).toEqual(["a_contacter", "rdv_pris", "demo_faite", "pas_interesse"]);
  });
});

describe("code département", () => {
  it("accepte 01 à 95 (hors 20), la Corse et les DROM", () => {
    for (const ok of ["01", "06", "19", "21", "69", "95", "2A", "2B", "971", "974", "976"]) {
      expect(isDepartementCode(ok), ok).toBe(true);
    }
  });

  it("refuse le reste", () => {
    for (const bad of ["00", "20", "96", "99", "977", "6", "006", "2a", "2C", " 06", "", 6, null]) {
      expect(isDepartementCode(bad), String(bad)).toBe(false);
    }
  });
});

describe("adresse de recherche", () => {
  it("une page d'entreprises actives d'une activité dans un département", () => {
    expect(companySearchUrl("06", "43.22A", 1)).toBe(
      "https://recherche-entreprises.api.gouv.fr/search?activite_principale=43.22A&departement=06&etat_administratif=A&limite_matching_etablissements=100&per_page=25&page=1",
    );
    expect(companySearchUrl("2A", "81.30Z", 12)).toBe(
      "https://recherche-entreprises.api.gouv.fr/search?activite_principale=81.30Z&departement=2A&etat_administratif=A&limite_matching_etablissements=100&per_page=25&page=12",
    );
  });
});

describe("lecture d'une page de l'API", () => {
  it("un établissement ouvert et diffusible donne une ligne complète", () => {
    expect(parseCompanySearch(page([company()]), "06")).toEqual({
      rows: [expectedRow],
      totalPages: 100,
    });
  });

  it("ignore les établissements fermés, d'une activité hors liste ou d'un autre département", () => {
    const body = page([
      company({}, [
        etab({ siret: "00000065000028", etat_administratif: "F" }),
        // Ancien code NAF rév. 1 d'un établissement fermé depuis longtemps.
        etab({ siret: "00000065000036", activite_principale: "45.3E" }),
        etab({ siret: "00000065000044", activite_principale: "71.20B" }),
        etab({ siret: "00000065000051", code_postal: "83600", commune: "83061" }),
        etab({ siret: "00000065000069", activite_principale: "43.22B", est_siege: false }),
      ]),
    ]);
    const { rows } = parseCompanySearch(body, "06");
    expect(rows.map((r) => [r.siret, r.ape_code, r.est_siege])).toEqual([
      ["00000065000069", "43.22B", false],
    ]);
  });

  it("ignore les entreprises et établissements non diffusibles", () => {
    const body = page([
      company({ statut_diffusion: "P" }),
      company({}, [
        etab({
          siret: "00000065000077",
          statut_diffusion_etablissement: "P",
          adresse: "[NON-DIFFUSIBLE]",
          code_postal: "[NON-DIFFUSIBLE]",
          latitude: "[NON-DIFFUSIBLE]",
          longitude: "[NON-DIFFUSIBLE]",
          nom_commercial: "[NON-DIFFUSIBLE]",
          liste_enseignes: ["[NON-DIFFUSIBLE]"],
        }),
      ]),
      company({ nom_raison_sociale: null, nom_complet: "[NON-DIFFUSIBLE]" }, [
        etab({ siret: "00000065000085" }),
      ]),
    ]);
    expect(parseCompanySearch(body, "06").rows).toEqual([]);
  });

  it("entreprise individuelle : nom complet à défaut de raison sociale", () => {
    const body = page([
      company({
        nom_raison_sociale: null,
        nom_complet: "  CAMILLE   EXEMPLE ",
        nature_juridique: "1000",
      }),
    ]);
    const [row] = parseCompanySearch(body, "06").rows;
    expect(row?.denomination).toBe("CAMILLE EXEMPLE");
    expect(row?.nature_juridique).toBe("1000");
  });

  it("enseigne : nom commercial, sinon première enseigne diffusible", () => {
    const body = page([
      company({}, [
        etab({
          siret: "00000065000010",
          nom_commercial: "EXEMPLE DEPANNAGE",
          liste_enseignes: ["AUTRE"],
        }),
        etab({ siret: "00000065000028", liste_enseignes: ["EXEMPLE CHAUFFAGE", "AUTRE"] }),
        etab({
          siret: "00000065000036",
          nom_commercial: "",
          liste_enseignes: ["[NON-DIFFUSIBLE]"],
        }),
      ]),
    ]);
    expect(parseCompanySearch(body, "06").rows.map((r) => r.enseigne)).toEqual([
      "EXEMPLE DEPANNAGE",
      "EXEMPLE CHAUFFAGE",
      null,
    ]);
  });

  it("coordonnées : nombres plausibles seulement, les deux ou aucune", () => {
    const body = page([
      company({}, [
        etab({ siret: "00000065000010", latitude: 43.58, longitude: 7.12 }),
        etab({ siret: "00000065000028", latitude: null, longitude: null }),
        etab({ siret: "00000065000036", latitude: "43.58", longitude: "200" }),
        etab({ siret: "00000065000044", latitude: "", longitude: "7.12" }),
      ]),
    ]);
    expect(parseCompanySearch(body, "06").rows.map((r) => [r.lat, r.lon])).toEqual([
      [43.58, 7.12],
      [null, null],
      [null, null],
      [null, null],
    ]);
  });

  it("RGE si la liste des qualifications n'est pas vide", () => {
    const body = page([
      company({}, [
        etab({ siret: "00000065000010", liste_rge: ["22", "23"] }),
        etab({ siret: "00000065000028", liste_rge: [] }),
        etab({ siret: "00000065000036", liste_rge: null }),
      ]),
    ]);
    expect(parseCompanySearch(body, "06").rows.map((r) => r.rge)).toEqual([true, false, false]);
  });

  it("date de création de l'établissement, sinon de l'entreprise ; champs douteux à null", () => {
    const body = page([
      company({ nature_juridique: "SAS", tranche_effectif_salarie: null }, [
        etab({
          date_creation: "2015-02-30",
          tranche_effectif_salarie: "02",
          commune: "NICE",
          adresse: "  3\u0000 RUE   DE L'ESSAI\n",
          libelle_commune: "",
        }),
      ]),
    ]);
    const [row] = parseCompanySearch(body, "06").rows;
    expect(row).toMatchObject({
      date_creation: "2008-09-25",
      nature_juridique: null,
      tranche_effectif: "02",
      code_insee: null,
      adresse: "3 RUE DE L'ESSAI",
      commune: null,
    });
  });

  it("coupe les noms trop longs à 200 caractères", () => {
    const long = `SOCIETE ${"EXEMPLE ".repeat(40)}`;
    const [row] = parseCompanySearch(page([company({ nom_raison_sociale: long })]), "06").rows;
    expect(row?.denomination.length).toBeLessThanOrEqual(200);
    expect(row?.denomination.startsWith("SOCIETE EXEMPLE")).toBe(true);
  });

  it("dédoublonne par SIRET", () => {
    const body = page([company(), company({ nom_raison_sociale: "DOUBLON EXEMPLE" })]);
    const { rows } = parseCompanySearch(body, "06");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.denomination).toBe("PLOMBERIE EXEMPLE AZUR");
  });

  it("Corse : codes postaux en 20, code commune 2A ; DROM : préfixe à 3 chiffres", () => {
    const corse = page([
      company({}, [
        etab({
          siret: "00000065000010",
          code_postal: "20090",
          commune: "2A004",
          libelle_commune: "AJACCIO",
        }),
      ]),
    ]);
    expect(parseCompanySearch(corse, "2A").rows[0]).toMatchObject({
      departement: "2A",
      code_postal: "20090",
      code_insee: "2A004",
    });

    const guadeloupe = page([
      company({}, [
        etab({ siret: "00000065000010", code_postal: "97110", commune: "97120" }),
        etab({ siret: "00000065000028", code_postal: "97200", commune: "97209" }),
      ]),
    ]);
    expect(parseCompanySearch(guadeloupe, "971").rows.map((r) => r.siret)).toEqual([
      "00000065000010",
    ]);
  });

  it(`nombre de pages borné à ${COMPANY_SEARCH_MAX_PAGE}`, () => {
    expect(parseCompanySearch(page([], 1000), "06").totalPages).toBe(400);
    expect(parseCompanySearch(page([], 0), "06").totalPages).toBe(0);
    expect(parseCompanySearch({ results: [company()] }, "06")).toEqual({
      rows: [expectedRow],
      totalPages: 0,
    });
  });

  it.each([null, "texte", 42, [], {}, { results: "x" }, { results: null, total_pages: 3 }])(
    "réponse inattendue (%j) : rien à importer",
    (body) => {
      expect(parseCompanySearch(body, "06")).toEqual({ rows: [], totalPages: 0 });
    },
  );

  it("département invalide : rien à importer", () => {
    expect(parseCompanySearch(page([company()]), "20")).toEqual({ rows: [], totalPages: 0 });
  });

  it("éléments malformés ignorés sans exception", () => {
    const body = page([
      null,
      "x",
      company({ matching_etablissements: null }),
      company({}, [null as never]),
    ]);
    expect(parseCompanySearch(body, "06").rows).toEqual([]);
  });
});

describe("enchaînement de l'import", () => {
  const last = PROSPECT_APE_CODES.length - 1;

  it("page suivante du même code", () => {
    expect(nextImportStep({ apeIndex: 3, page: 1 }, 5)).toEqual({ apeIndex: 3, page: 2 });
  });

  it("code suivant, page 1, après la dernière page (ou sans résultat)", () => {
    expect(nextImportStep({ apeIndex: 3, page: 5 }, 5)).toEqual({ apeIndex: 4, page: 1 });
    expect(nextImportStep({ apeIndex: 0, page: 1 }, 0)).toEqual({ apeIndex: 1, page: 1 });
  });

  it("jamais au-delà de la page 400", () => {
    expect(nextImportStep({ apeIndex: 0, page: 400 }, 1000)).toEqual({ apeIndex: 1, page: 1 });
  });

  it("terminé après la dernière page du dernier code", () => {
    expect(nextImportStep({ apeIndex: last, page: 2 }, 2)).toBeNull();
    expect(nextImportStep({ apeIndex: last, page: 1 }, 2)).toEqual({ apeIndex: last, page: 2 });
  });
});

describe("itinéraire", () => {
  it("lien Google Maps vers les coordonnées", () => {
    expect(directionsUrl(43.7031767, 7.276078)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=43.7031767,7.276078",
    );
  });
});
