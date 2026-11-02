import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  registryCheckFilename,
  registryCheckModel,
  type RegistryCheckPdfData,
} from "../src/registry-model.ts";
import { renderRegistryCheckPdf } from "../src/registry-pdf.ts";

// Données fictives.
const data: RegistryCheckPdfData = {
  siren: "000081234",
  siret: "00008123400011",
  companyName: "MENUISERIE EXEMPLE",
  legalFormCode: "5499",
  creationDate: "2019-03-01",
  manager: { firstNames: ["DOMINIQUE", "MARIE"], lastName: "EXEMPLE", role: "Gérant" },
  member: { firstName: "Dominique", lastName: "Exemple" },
  checkedAt: "2026-11-02T10:15:30.000Z",
};

describe("fiche de vérification au registre (ADR 0217)", () => {
  it("identité de l'entreprise, dirigeant reconnu, sources et mise en garde", () => {
    const m = registryCheckModel(data);
    expect(m.title).toBe("FICHE DE VÉRIFICATION AU REGISTRE");
    expect(m.rows).toEqual([
      ["Entreprise", "MENUISERIE EXEMPLE"],
      ["SIREN", "000081234"],
      ["SIRET", "00008123400011"],
      ["Forme juridique", "SARL"],
      ["Date de création", "1 mars 2019"],
      ["État", "Active"],
      ["Vérification", "2 novembre 2026 à 11:15"],
    ]);
    expect(m.result[1]).toBe(
      "Dirigeant publié : Dominique Marie EXEMPLE (Gérant). Inscrit sur MENAO : Dominique EXEMPLE.",
    );
    expect(m.notice).toContain("ni un extrait Kbis ni une attestation");
    // Heure de Paris.
    expect(m.footer).toBe("MENAO · Vérification du 2 novembre 2026 à 11:15");
  });

  it("entrepreneur individuel sans fonction, forme inconnue, sans date de création", () => {
    const m = registryCheckModel({
      ...data,
      legalFormCode: "9999",
      creationDate: null,
      manager: { firstNames: ["DOMINIQUE"], lastName: "EXEMPLE", role: null },
    });
    expect(m.rows.map(([label]) => label)).not.toContain("Date de création");
    expect(m.rows).toContainEqual(["Forme juridique", "Catégorie 9999"]);
    expect(m.result[1]).toBe(
      "Dirigeant publié : Dominique EXEMPLE. Inscrit sur MENAO : Dominique EXEMPLE.",
    );
  });

  it("PDF d'une page, avec son titre", async () => {
    const pdf = await PDFDocument.load(await renderRegistryCheckPdf(data));
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe("FICHE DE VÉRIFICATION AU REGISTRE");
  });

  it("nom de fichier horodaté", () => {
    expect(registryCheckFilename(data.checkedAt)).toBe("kbis-registre-20261102-101530.pdf");
  });
});
