import { describe, expect, it } from "vitest";
import { companySearchUrl, parseCompanySearch, titleCaseFr } from "../src/company-search";

// Entreprise et dirigeant fictifs.
const result = {
  siren: "123456789",
  nom_raison_sociale: "PLOMBERIE DES OLIVIERS",
  nom_complet: "PLOMBERIE DES OLIVIERS (PDO)",
  nature_juridique: "5499",
  etat_administratif: "A",
  activite_principale: "43.22A",
  date_creation: "2014-03-01",
  siege: {
    siret: "12345678900012",
    etat_administratif: "A",
    adresse: "12 AVENUE DES OLIVIERS 06100 NICE",
    code_postal: "06100",
    libelle_commune: "NICE",
    commune: "06088",
    latitude: "43.72",
    longitude: "7.26",
  },
  dirigeants: [
    {
      type_dirigeant: "personne physique",
      nom: "DURAND",
      prenoms: "CAMILLE MARIE",
      qualite: "Gérant",
      annee_de_naissance: "1980",
      date_de_naissance: "1980-01",
    },
    {
      type_dirigeant: "personne morale",
      nom: null,
      prenoms: null,
      qualite: "Commissaire aux comptes",
    },
  ],
};

describe("Recherche d'entreprises", () => {
  it("construit l'adresse de recherche", () => {
    expect(companySearchUrl("  plomberie nice ")).toBe(
      "https://recherche-entreprises.api.gouv.fr/search?q=plomberie+nice&per_page=5&page=1&minimal=true&include=siege%2Cdirigeants",
    );
  });

  it("lit une entreprise, son siège et ses dirigeants personnes physiques", () => {
    expect(parseCompanySearch({ results: [result] })).toEqual([
      {
        siren: "123456789",
        siret: "12345678900012",
        name: "PLOMBERIE DES OLIVIERS",
        legalFormCode: "5499",
        active: true,
        apeCode: "43.22A",
        creationYear: "2014",
        address: "12 Avenue des Oliviers 06100 Nice",
        postcode: "06100",
        city: "Nice",
        citycode: "06088",
        lon: 7.26,
        lat: 43.72,
        managers: [{ firstName: "Camille", lastName: "Durand", role: "Gérant" }],
      },
    ]);
  });

  it("ne garde jamais la date de naissance des dirigeants", () => {
    const [company] = parseCompanySearch({ results: [result] });
    expect(JSON.stringify(company)).not.toMatch(/1980/);
  });

  it("signale une entreprise ou un siège fermés", () => {
    const closed = { ...result, siege: { ...result.siege, etat_administratif: "F" } };
    expect(parseCompanySearch({ results: [closed] })[0]?.active).toBe(false);
  });

  it("ignore les résultats inattendus ou non diffusibles", () => {
    expect(parseCompanySearch(null)).toEqual([]);
    expect(parseCompanySearch({ results: "non" })).toEqual([]);
    expect(
      parseCompanySearch({
        results: [
          { siren: "1" },
          { ...result, nom_raison_sociale: "[NON-DIFFUSIBLE]", nom_complet: "[NON-DIFFUSIBLE]" },
          { ...result, siren: "987654321", siege: { ...result.siege, latitude: null } },
        ],
      }).map((c) => [c.siren, c.lat]),
    ).toEqual([["987654321", null]]);
  });

  it("met les noms de lieux en forme", () => {
    expect(titleCaseFr("CAGNES-SUR-MER")).toBe("Cagnes-sur-Mer");
    expect(titleCaseFr("7 RUE DE L'EGLISE 06000 NICE")).toBe("7 Rue de l'Eglise 06000 Nice");
    expect(titleCaseFr("LE CANNET")).toBe("Le Cannet");
    expect(titleCaseFr("L'ESCARENE")).toBe("L'Escarene");
    expect(titleCaseFr("SAINT-LAURENT-DU-VAR")).toBe("Saint-Laurent-du-Var");
  });
});
