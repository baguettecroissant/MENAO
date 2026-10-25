import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import {
  accountantArchive,
  expensePieceName,
  fileSlug,
  type AccountantExpense,
} from "../src/accountant-export.ts";

const expense = (overrides: Partial<AccountantExpense> = {}): AccountantExpense => ({
  issuedOn: "2026-09-12",
  supplier: "Négoce Exemple",
  reference: "FA-2026/118",
  title: "Tableau électrique",
  kind: "facture",
  category: "materiaux",
  chantier: "Mise aux normes",
  totalHtCents: 43_500,
  totalTvaCents: 9_135,
  totalTtcCents: 52_635,
  dueOn: null,
  paidOn: "2026-09-20",
  piece: { bytes: new Uint8Array([37, 80, 68, 70]), extension: "pdf" },
  ...overrides,
});

describe("archive envoyée au comptable (F-63)", () => {
  it("noms de fichiers sans accents ni caractères spéciaux, sans doublon", () => {
    expect(fileSlug("Négoce Exemple & Fils")).toBe("negoce-exemple-fils");
    const used = new Set<string>();
    expect(expensePieceName(expense(), "pdf", used)).toBe(
      "2026-09-12_negoce-exemple_fa-2026-118.pdf",
    );
    expect(expensePieceName(expense(), "pdf", used)).toBe(
      "2026-09-12_negoce-exemple_fa-2026-118-2.pdf",
    );
    expect(
      expensePieceName(
        expense({ supplier: null, reference: null, title: "Carburant" }),
        "jpg",
        used,
      ),
    ).toBe("2026-09-12_carburant.jpg");
  });

  it("factures et dépenses : tableaux, pièces et note", () => {
    const zip = accountantArchive({
      company: "Entreprise Exemple",
      period: "septembre 2026",
      invoices: [
        {
          numero: "FAC-2026-0001",
          issuedOn: "2026-09-05",
          kind: "acompte",
          document: {
            client: { first_name: "Client", last_name: "Test" },
            chantier: { title: "Salle d'eau" },
            quote: { numero: "DEVIS-2026-0003" },
          },
          totalHtCents: 100_000,
          totalTvaCents: 10_000,
          totalTtcCents: 110_000,
          pdf: new Uint8Array([37, 80, 68, 70]),
        },
      ],
      expenses: [expense(), expense({ piece: null, title: "Sans pièce" })],
    });
    const files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual([
      "LISEZ-MOI.txt",
      "depenses.csv",
      "depenses/2026-09-12_negoce-exemple_fa-2026-118.pdf",
      "factures.csv",
      "factures/FAC-2026-0001.pdf",
    ]);
    const invoicesCsv = strFromU8(files["factures.csv"] as Uint8Array);
    expect(invoicesCsv).toContain(
      '"FAC-2026-0001";"2026-09-05";"Acompte";"Client Test";"Salle d\'eau";"DEVIS-2026-0003";"1000,00";"100,00";"1100,00"',
    );
    const expensesCsv = strFromU8(files["depenses.csv"] as Uint8Array);
    expect(expensesCsv).toContain(
      '"Matériaux";"Mise aux normes";"435,00";"91,35";"526,35";"";"2026-09-20"',
    );
    expect(expensesCsv).toContain('"Sans pièce"');
    expect(strFromU8(files["LISEZ-MOI.txt"] as Uint8Array)).toContain("Factures émises : 1");
  });

  it("partie non demandée : ni tableau ni dossier", () => {
    const files = unzipSync(
      accountantArchive({
        company: "Entreprise Exemple",
        period: "3e trimestre 2026",
        invoices: null,
        expenses: [],
      }),
    );
    expect(Object.keys(files).sort()).toEqual(["LISEZ-MOI.txt", "depenses.csv"]);
    expect(strFromU8(files["LISEZ-MOI.txt"] as Uint8Array)).not.toContain("Factures");
  });
});
