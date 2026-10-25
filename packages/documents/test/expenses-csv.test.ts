import { describe, expect, it } from "vitest";
import { expensesCsv } from "../src/expenses-csv.ts";

const HEADERS = ["Date", "Fournisseur", "Numéro", "Titre", "Type", "Catégorie", "Chantier", "HT"];

describe("export des dépenses pour le comptable (F-62)", () => {
  it("produit un CSV « ; » lisible par un tableur français", () => {
    const csv = expensesCsv(HEADERS, [
      {
        issuedOn: "2026-10-12",
        supplier: "Négoce Exemple",
        reference: "FA-2026-118",
        title: 'Tableau "3 rangées"',
        kind: "Facture",
        category: "Matériaux",
        chantier: "",
        totalHtCents: 43_500,
        totalTvaCents: 9_135,
        totalTtcCents: 52_635,
        dueOn: "2026-11-11",
        paidOn: "",
      },
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe(HEADERS.map((h) => `"${h}"`).join(";"));
    expect(lines[1]).toBe(
      '"2026-10-12";"Négoce Exemple";"FA-2026-118";"Tableau ""3 rangées""";"Facture";"Matériaux";"";"435,00";"91,35";"526,35";"2026-11-11";""',
    );
    expect(lines[2]).toBe("");
  });
});
