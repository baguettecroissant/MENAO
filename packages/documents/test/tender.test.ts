import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { type TenderDocument, tenderPdfData } from "../src/tender-data.ts";
import { renderTenderPdf } from "../src/tender-pdf.ts";

const NBSP = " ";

// DPGF fictif de la maquette (lot 05), avec un poste encore à chiffrer.
const doc: TenderDocument = {
  tender: {
    id: "t1",
    name: "Maison individuelle — Mougins",
    client_name: "Atelier fictif",
    due_on: "2026-11-28",
    vat_rate_bp: 2000,
    issued_on: "2026-11-12",
  },
  lines: [
    {
      kind: "titre",
      lot: "LOT 05 CARRELAGE",
      code: "LOT 05",
      designation: "CARRELAGE, FAÏENCE",
      unit_label: null,
      architect_quantity_milli: null,
      quantity_milli: null,
      unit_price_ht_cents: null,
    },
    {
      kind: "poste",
      lot: "LOT 05 CARRELAGE",
      code: "5.2",
      designation: "Carrelage sol grès cérame 60 x 60, RDC",
      unit_label: "m²",
      architect_quantity_milli: 62_000,
      quantity_milli: 77_400,
      unit_price_ht_cents: 7400,
    },
    {
      kind: "poste",
      lot: "LOT 05 CARRELAGE",
      code: "5.3",
      designation: "Plinthes assorties",
      unit_label: "ml",
      architect_quantity_milli: 58_000,
      quantity_milli: 58_000,
      unit_price_ht_cents: 1450,
    },
    {
      kind: "poste",
      lot: "LOT 05 CARRELAGE",
      code: "5.6",
      designation: "Seuils et barres de transition",
      unit_label: "U",
      architect_quantity_milli: 4000,
      quantity_milli: 4000,
      unit_price_ht_cents: null,
    },
  ],
  issuer: {
    raison_sociale: "CARRELAGE FICTIF",
    nom_commercial: null,
    forme_juridique_code: null,
    siret: "12345678900011",
    tva_intracom: "FR00123456789",
    assujetti_tva: true,
    adresse_ligne: "1 rue de l'Exemple",
    code_postal: "06000",
    commune: "Nice",
    email: "contact@example.test",
    phone: null,
    decennale: null,
  },
};

describe("DPGF chiffré : données du PDF", () => {
  const data = tenderPdfData(doc);

  it("calcule les totaux sur les postes chiffrés", () => {
    expect(data.totals).toEqual([
      ["Total HT", `6${NBSP}568,60${NBSP}€`],
      ["TVA 20" + NBSP + "%", `1${NBSP}313,72${NBSP}€`],
      ["Total TTC", `7${NBSP}882,32${NBSP}€`],
    ]);
  });

  it("rappelle la quantité du DPGF quand l'entreprise l'a changée", () => {
    expect(data.rows[1]).toMatchObject({ quantity: "77,4", architectQuantity: "DPGF : 62" });
    expect(data.rows[2]?.architectQuantity).toBeNull();
    expect(data.rows[3]).toMatchObject({ unitPrice: "à chiffrer", total: "" });
    expect(data.notes[0]).toContain("1 quantité a été modifiée");
  });

  it("nomme le fichier d'après le projet", () => {
    expect(data.filename).toBe("DPGF-Maison-individuelle-Mougins.pdf");
  });
});

describe("DPGF chiffré : rendu", () => {
  it("produit un PDF A4 lisible", async () => {
    const bytes = await renderTenderPdf(tenderPdfData(doc));
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe("Appel d'offres : Maison individuelle — Mougins");
  });

  it("pagine un long DPGF", async () => {
    const many: TenderDocument = {
      ...doc,
      lines: Array.from(
        { length: 120 },
        (_, i) => ({ ...doc.lines[2], code: `5.${i}` }) as TenderDocument["lines"][number],
      ),
    };
    const pdf = await PDFDocument.load(await renderTenderPdf(tenderPdfData(many)));
    expect(pdf.getPageCount()).toBeGreaterThan(2);
  });
});
