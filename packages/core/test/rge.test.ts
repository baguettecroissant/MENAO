import { describe, expect, it } from "vitest";
import { parseRgeLines, rgeConfirmation, rgeLinesUrl, validRgeDomains } from "../src/rge";

// Données fictives : SIRET et certificats inventés.
const SIRET = "00000001800010";
const ligne = (champs: Record<string, unknown>) => ({
  siret: SIRET,
  organisme: "qualibat",
  code_qualification: "0000D001",
  nom_qualification: "Isolation (0000D001)",
  nom_certificat: "QUALIBAT-RGE",
  domaine: "Isolation des combles perdus",
  meta_domaine: "Travaux d'efficacité énergétique",
  particulier: true,
  lien_date_debut: "2025-01-01",
  lien_date_fin: "2027-01-01",
  url_qualification: "https://exemple.test/certificat.pdf",
  ...champs,
});

describe("annuaire RGE (ADR 0118)", () => {
  it("demande les lignes du SIRET, champs utiles seulement", () => {
    const url = new URL(rgeLinesUrl(SIRET, "https://exemple.test/lines"));
    expect(url.searchParams.get("siret_eq")).toBe(SIRET);
    expect(url.searchParams.get("size")).toBe("200");
    expect(url.searchParams.get("select")).toContain("lien_date_fin");
  });

  it("lit les qualifications du SIRET", () => {
    const rows = parseRgeLines({ results: [ligne({})] }, SIRET);
    expect(rows).toEqual([
      {
        organisme: "qualibat",
        code: "0000D001",
        name: "Isolation (0000D001)",
        certificate: "QUALIBAT-RGE",
        domain: "Isolation des combles perdus",
        category: "Travaux d'efficacité énergétique",
        particulier: true,
        startsOn: "2025-01-01",
        endsOn: "2027-01-01",
        url: "https://exemple.test/certificat.pdf",
      },
    ]);
  });

  it("ignore les autres SIRET, les lignes incomplètes et les liens non sécurisés", () => {
    const rows = parseRgeLines(
      {
        results: [
          ligne({ siret: "00000002600014" }),
          ligne({ domaine: "" }),
          ligne({ lien_date_fin: "pas une date" }),
          ligne({ code_qualification: "0000D002", url_qualification: "http://exemple.test/x" }),
        ],
      },
      SIRET,
    );
    expect(rows).toHaveLength(1);
    expect(rows?.[0]?.url).toBeNull();
  });

  it("une ligne par qualification et domaine : la plus longue validité", () => {
    const rows = parseRgeLines(
      { results: [ligne({ lien_date_fin: "2026-06-01" }), ligne({ lien_date_fin: "2028-06-01" })] },
      SIRET,
    );
    expect(rows?.map((r) => r.endsOn)).toEqual(["2028-06-01"]);
  });

  it("réponse inattendue : null", () => {
    expect(parseRgeLines({ erreur: "x" }, SIRET)).toBeNull();
    expect(parseRgeLines(null, SIRET)).toBeNull();
    expect(parseRgeLines({ results: [] }, SIRET)).toEqual([]);
  });

  it("domaines valides, sans doublon", () => {
    expect(
      validRgeDomains(
        [
          { domain: "Pompe à chaleur", endsOn: "2027-01-01" },
          { domain: "Isolation des murs", endsOn: "2026-01-01" },
          { domain: "Pompe à chaleur", endsOn: "2028-01-01" },
          { domain: "Chauffe-eau solaire", endsOn: "2026-10-17" },
        ],
        "2026-10-17",
      ),
    ).toEqual(["Chauffe-eau solaire", "Pompe à chaleur"]);
  });

  it("confirme une certification déclarée par l'organisme ou le certificat", () => {
    const rows = [
      { organisme: "qualibat", certificate: "QUALIBAT-RGE", endsOn: "2027-01-01" },
      { organisme: "qualibat", certificate: "QUALIBAT-RGE", endsOn: "2028-01-01" },
      {
        organisme: "qualitenr",
        certificate: "QualiPAC module Chauffage et ECS",
        endsOn: "2027-03-01",
      },
      { organisme: "qualifelec", certificate: "Certificat Qualifelec RGE", endsOn: "2025-01-01" },
    ];
    const today = "2026-10-17";
    expect(rgeConfirmation("qualibat", rows, today)?.endsOn).toBe("2028-01-01");
    expect(rgeConfirmation("qualipac", rows, today)?.organisme).toBe("qualitenr");
    expect(rgeConfirmation("qualipv", rows, today)).toBeNull();
    expect(rgeConfirmation("qualifelec", rows, today)).toBeNull();
    expect(rgeConfirmation("rge", rows, today)?.endsOn).toBe("2028-01-01");
    expect(rgeConfirmation("autre", rows, today)).toBeNull();
  });
});
