import { describe, expect, it } from "vitest";
import { parseSireneEtablissement } from "../src/sirene";

// Réponse fictive au format de l'API Sirene 3.11 (GET /siret/{siret}).
function reponse(
  overrides: { etab?: object; ul?: object; adresse?: object; periode?: object } = {},
) {
  return {
    header: { statut: 200, message: "ok" },
    etablissement: {
      siren: "000000018",
      siret: "00000001800010",
      statutDiffusionEtablissement: "O",
      etablissementSiege: true,
      uniteLegale: {
        etatAdministratifUniteLegale: "A",
        statutDiffusionUniteLegale: "O",
        denominationUniteLegale: "ELECTRICITE EXEMPLE",
        categorieJuridiqueUniteLegale: "5499",
        activitePrincipaleUniteLegale: "43.21A",
        dateCreationUniteLegale: "2014-03-01",
        ...overrides.ul,
      },
      adresseEtablissement: {
        numeroVoieEtablissement: "12",
        indiceRepetitionEtablissement: null,
        typeVoieEtablissement: "AV",
        libelleVoieEtablissement: "DES EXEMPLES",
        complementAdresseEtablissement: null,
        codePostalEtablissement: "06000",
        libelleCommuneEtablissement: "NICE",
        codeCommuneEtablissement: "06088",
        ...overrides.adresse,
      },
      periodesEtablissement: [
        {
          dateFin: null,
          etatAdministratifEtablissement: "A",
          activitePrincipaleEtablissement: "43.21A",
          enseigne1Etablissement: null,
          denominationUsuelleEtablissement: null,
          ...overrides.periode,
        },
      ],
      ...overrides.etab,
    },
  };
}

describe("parseSireneEtablissement", () => {
  it("lit une entreprise active et diffusible", () => {
    expect(parseSireneEtablissement(reponse())).toEqual({
      siret: "00000001800010",
      siren: "000000018",
      active: true,
      partialDiffusion: false,
      raisonSociale: "ELECTRICITE EXEMPLE",
      formeJuridiqueCode: "5499",
      apeCode: "43.21A",
      dateCreation: "2014-03-01",
      adresse: {
        ligne: "12 AV DES EXEMPLES",
        codePostal: "06000",
        commune: "NICE",
        codeInsee: "06088",
      },
    });
  });

  it("établissement fermé → inactif", () => {
    const r = parseSireneEtablissement(
      reponse({ periode: { etatAdministratifEtablissement: "F" } }),
    );
    expect(r?.active).toBe(false);
  });

  it("unité légale cessée → inactif", () => {
    const r = parseSireneEtablissement(reponse({ ul: { etatAdministratifUniteLegale: "C" } }));
    expect(r?.active).toBe(false);
  });

  it("entrepreneur individuel : nom et prénom à défaut de dénomination", () => {
    const r = parseSireneEtablissement(
      reponse({
        ul: {
          denominationUniteLegale: null,
          nomUniteLegale: "EXEMPLE",
          prenomUsuelUniteLegale: "CAMILLE",
          categorieJuridiqueUniteLegale: "1000",
        },
      }),
    );
    expect(r?.raisonSociale).toBe("CAMILLE EXEMPLE");
  });

  it("diffusion partielle : valeurs [ND] ignorées et signalées", () => {
    const r = parseSireneEtablissement(
      reponse({
        etab: { statutDiffusionEtablissement: "P" },
        ul: { denominationUniteLegale: "[ND]", nomUniteLegale: "[ND]" },
        adresse: {
          numeroVoieEtablissement: "[ND]",
          libelleVoieEtablissement: "[ND]",
          typeVoieEtablissement: "[ND]",
        },
      }),
    );
    expect(r?.partialDiffusion).toBe(true);
    expect(r?.raisonSociale).toBeNull();
    expect(r?.adresse.ligne).toBeNull();
    expect(r?.adresse.commune).toBe("NICE");
  });

  it("prend l'activité de l'unité légale, à défaut celle de l'établissement", () => {
    const r = parseSireneEtablissement(
      reponse({
        ul: { activitePrincipaleUniteLegale: null },
        periode: { activitePrincipaleEtablissement: "43.22A" },
      }),
    );
    expect(r?.apeCode).toBe("43.22A");
  });

  it.each([null, {}, { etablissement: null }, "texte", { etablissement: { siret: 42 } }])(
    "réponse inexploitable → null (%j)",
    (input) => {
      expect(parseSireneEtablissement(input)).toBeNull();
    },
  );

  it("date de création absente ou mal formée : null", () => {
    expect(
      parseSireneEtablissement(reponse({ ul: { dateCreationUniteLegale: null } }))?.dateCreation,
    ).toBeNull();
    expect(
      parseSireneEtablissement(reponse({ ul: { dateCreationUniteLegale: "2014" } }))?.dateCreation,
    ).toBeNull();
  });
});
