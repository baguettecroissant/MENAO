import { describe, expect, it } from "vitest";
import {
  comparableName,
  matchingManager,
  parseRegistrySearch,
  registryOutcome,
  registrySearchUrl,
} from "../src/registry";

// Réponses fictives de l'API Recherche d'entreprises.
const company = {
  siren: "000081234",
  nom_complet: "MENUISERIE EXEMPLE",
  nom_raison_sociale: "MENUISERIE EXEMPLE",
  nature_juridique: "5499",
  etat_administratif: "A",
  statut_diffusion: "O",
  date_creation: "2019-03-01",
  siege: { etat_administratif: "A" },
  dirigeants: [
    {
      type_dirigeant: "personne physique",
      nom: "EXEMPLE",
      prenoms: "DOMINIQUE MARIE",
      qualite: "Gérant",
    },
    { type_dirigeant: "personne morale", denomination: "HOLDING EXEMPLE", qualite: "Associé" },
  ],
};
const person = { firstName: "Dominique", lastName: "Exemple", isDirigeant: true };

describe("entreprise vérifiée au registre (ADR 0217)", () => {
  it("adresse de recherche par SIREN, dirigeants compris", () => {
    expect(registrySearchUrl("https://recherche-entreprises.api.gouv.fr/", "000081234")).toBe(
      "https://recherche-entreprises.api.gouv.fr/search?q=000081234&include=siege,dirigeants&minimal=true&page=1&per_page=5",
    );
  });

  it("lit l'entreprise du SIREN demandé et ses dirigeants personnes physiques", () => {
    const entry = parseRegistrySearch(
      { results: [{ ...company, siren: "000089999" }, company] },
      "000081234",
    );
    expect(entry).toEqual({
      siren: "000081234",
      name: "MENUISERIE EXEMPLE",
      legalFormCode: "5499",
      active: true,
      creationDate: "2019-03-01",
      masked: false,
      managers: [{ lastName: "EXEMPLE", firstNames: ["DOMINIQUE", "MARIE"], role: "Gérant" }],
    });
    expect(parseRegistrySearch({ results: [company] }, "000080000")).toBeNull();
    expect(parseRegistrySearch({ erreur: "x" }, "000081234")).toBeNull();
  });

  it("noms comparés sans accents, casse ni ponctuation", () => {
    expect(comparableName("  Lefèvre-Dupré ")).toBe("LEFEVRE DUPRE");
    const managers = [{ lastName: "LEFEVRE", firstNames: ["JEAN-PIERRE", "LUC"], role: null }];
    expect(
      matchingManager(managers, { firstName: "Jean-Pierre", lastName: "Lefèvre" }),
    ).not.toBeNull();
    expect(matchingManager(managers, { firstName: "jean", lastName: "LEFEVRE" })).not.toBeNull();
    expect(matchingManager(managers, { firstName: "Luc", lastName: "Lefevre" })).not.toBeNull();
    expect(matchingManager(managers, { firstName: "Paul", lastName: "Lefevre" })).toBeNull();
    expect(matchingManager(managers, { firstName: "Jean", lastName: "Martin" })).toBeNull();
  });

  it("vérifiée : entreprise active et inscrit parmi les dirigeants", () => {
    expect(registryOutcome(parseRegistrySearch({ results: [company] }, "000081234"), person)).toBe(
      "verifie",
    );
  });

  it("entrepreneur individuel : la personne est publiée comme dirigeant, sans fonction", () => {
    const ei = {
      ...company,
      nature_juridique: "1000",
      nom_raison_sociale: null,
      nom_complet: "DOMINIQUE EXEMPLE",
      dirigeants: [
        {
          type_dirigeant: "personne physique",
          nom: "EXEMPLE",
          prenoms: "DOMINIQUE",
          qualite: null,
        },
      ],
    };
    expect(registryOutcome(parseRegistrySearch({ results: [ei] }, "000081234"), person)).toBe(
      "verifie",
    );
  });

  it("sinon, le Kbis reste demandé, avec la raison", () => {
    const parse = (r: object) => parseRegistrySearch({ results: [r] }, "000081234");
    expect(registryOutcome(null, person)).toBe("introuvable");
    expect(registryOutcome(parse({ ...company, etat_administratif: "C" }), person)).toBe(
      "inactive",
    );
    expect(registryOutcome(parse({ ...company, siege: { etat_administratif: "F" } }), person)).toBe(
      "inactive",
    );
    expect(registryOutcome(parse({ ...company, statut_diffusion: "P" }), person)).toBe("masque");
    expect(registryOutcome(parse({ ...company, dirigeants: [] }), person)).toBe("masque");
    expect(registryOutcome(parse(company), { ...person, lastName: "Autre" })).toBe(
      "dirigeant_absent",
    );
    // L'inscrit a déclaré ne pas être le dirigeant : son nom ne suffit pas.
    expect(registryOutcome(parse(company), { ...person, isDirigeant: false })).toBe(
      "dirigeant_absent",
    );
    expect(registryOutcome(parse(company), { ...person, firstName: null })).toBe(
      "dirigeant_absent",
    );
  });
});
