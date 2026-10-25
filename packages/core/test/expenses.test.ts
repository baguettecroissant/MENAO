import { describe, expect, it } from "vitest";
import {
  EXPENSE_LINE_UNITS,
  expenseReadingJsonSchema,
  normalizeExpenseReading,
  type RawExpenseReading,
} from "../src/expense-reading";
import {
  expenseStatus,
  expensesSummary,
  matchesExpenseFilter,
  matchesExpenseQuery,
  parseExpenseFilter,
} from "../src/expenses";
import { QUOTE_UNITS, formatEurosInput, parseEuros } from "../src/quote";

const today = "2026-10-25";

describe("statut d'une dépense", () => {
  it("payée dès qu'une date de paiement est indiquée, même après l'échéance", () => {
    expect(expenseStatus({ paid_on: "2026-10-30", due_on: "2026-10-01" }, today)).toBe("paye");
  });

  it("en retard le lendemain de l'échéance, à payer le jour même", () => {
    expect(expenseStatus({ paid_on: null, due_on: "2026-10-24" }, today)).toBe("en_retard");
    expect(expenseStatus({ paid_on: null, due_on: today }, today)).toBe("a_payer");
  });

  it("à payer sans échéance", () => {
    expect(expenseStatus({ paid_on: null, due_on: null }, today)).toBe("a_payer");
  });
});

describe("liste des dépenses", () => {
  const late = { paid_on: null, due_on: "2026-10-01" };
  const open = { paid_on: null, due_on: null };
  const paid = { paid_on: "2026-10-02", due_on: null };

  it("onglet inconnu : toutes", () => {
    expect(parseExpenseFilter("en_retard")).toBe("en_retard");
    expect(parseExpenseFilter("n'importe quoi")).toBe("toutes");
    expect(parseExpenseFilter(undefined)).toBe("toutes");
  });

  it("« À payer » montre aussi les dépenses en retard", () => {
    expect([late, open, paid].filter((e) => matchesExpenseFilter(e, "a_payer", today))).toEqual([
      late,
      open,
    ]);
    expect([late, open, paid].filter((e) => matchesExpenseFilter(e, "en_retard", today))).toEqual([
      late,
    ]);
    expect([late, open, paid].filter((e) => matchesExpenseFilter(e, "paye", today))).toEqual([
      paid,
    ]);
    expect([late, open, paid].filter((e) => matchesExpenseFilter(e, "toutes", today))).toHaveLength(
      3,
    );
  });

  it("recherche sans accents ni majuscules dans le titre, le fournisseur et le numéro", () => {
    const expense = {
      title: "Fournitures électriques",
      supplier_name: "Négoce Exemple",
      reference: "FA-2026-118",
    };
    expect(matchesExpenseQuery(expense, "ELECTRIQUES")).toBe(true);
    expect(matchesExpenseQuery(expense, "negoce fa-2026")).toBe(true);
    expect(matchesExpenseQuery(expense, "plomberie")).toBe(false);
    expect(matchesExpenseQuery(expense, "   ")).toBe(true);
    expect(
      matchesExpenseQuery({ ...expense, supplier_name: null, reference: null }, "négoce"),
    ).toBe(false);
  });

  it("reste à payer en TTC, dont la part en retard", () => {
    expect(
      expensesSummary(
        [
          { ...late, total_ttc_cents: 21_175 },
          { ...open, total_ttc_cents: 8_470 },
          { ...paid, total_ttc_cents: 52_635 },
        ],
        today,
      ),
    ).toEqual({ toPayCents: 29_645, toPayCount: 2, overdueCents: 21_175, overdueCount: 1 });
  });
});

const raw = (overrides: Partial<RawExpenseReading> = {}): RawExpenseReading => ({
  lisible: true,
  type_document: "facture",
  fournisseur: "  Négoce   Exemple ",
  numero: "FA-2026-118",
  date: "2026-10-12",
  echeance: "2026-11-11",
  total_ht: 435,
  total_tva: 91.35,
  total_ttc: 526.35,
  categorie: "materiaux",
  titre: "Tableau électrique et disjoncteurs",
  lignes: [
    {
      designation: "Tableau électrique 3 rangées",
      reference: "TAB-3R",
      quantite: 1,
      unite: "u",
      prix_unitaire_ht: 189.9,
      total_ht: 189.9,
    },
    {
      designation: " Disjoncteur 16 A ",
      reference: null,
      quantite: 12,
      unite: "u",
      prix_unitaire_ht: 20.425,
      total_ht: 245.1,
    },
  ],
  ...overrides,
});

describe("montant d'un champ", () => {
  it("centimes → « 435,00 », relu à l'identique", () => {
    expect(formatEurosInput(43_500)).toBe("435,00");
    expect(formatEurosInput(9_135)).toBe("91,35");
    expect(formatEurosInput(5)).toBe("0,05");
    for (const cents of [0, 1, 99, 116_160, 999_999_99]) {
      expect(parseEuros(formatEurosInput(cents))).toBe(cents);
    }
  });
});

describe("lecture d'une facture fournisseur", () => {
  it("schéma : tous les champs requis, unités des devis", () => {
    const schema = expenseReadingJsonSchema();
    expect(schema.required).toEqual(Object.keys(schema.properties));
    expect(schema.additionalProperties).toBe(false);
    expect([...EXPENSE_LINE_UNITS]).toEqual([...QUOTE_UNITS]);
  });

  it("champs pré-remplis en centimes, textes nettoyés", () => {
    const reading = normalizeExpenseReading(raw());
    expect(reading.warnings).toEqual([]);
    expect(reading.fields).toEqual({
      kind: "facture",
      supplierName: "Négoce Exemple",
      reference: "FA-2026-118",
      issuedOn: "2026-10-12",
      dueOn: "2026-11-11",
      totalHtCents: 43_500,
      totalTvaCents: 9_135,
      category: "materiaux",
      title: "Tableau électrique et disjoncteurs",
    });
    expect(reading.lines).toEqual([
      {
        designation: "Tableau électrique 3 rangées",
        reference: "TAB-3R",
        quantityMilli: 1000,
        unit: "u",
        unitPriceHtCents: 18_990,
        totalHtCents: 18_990,
      },
      {
        designation: "Disjoncteur 16 A",
        reference: null,
        quantityMilli: 12_000,
        unit: "u",
        unitPriceHtCents: 2_043,
        totalHtCents: 24_510,
      },
    ]);
  });

  it("pièce illisible ou autre document : rien n'est pré-rempli", () => {
    expect(normalizeExpenseReading(raw({ lisible: false }))).toEqual({
      fields: {},
      lines: [],
      warnings: ["illisible"],
    });
    expect(normalizeExpenseReading(raw({ type_document: "autre" }))).toEqual({
      fields: {},
      lines: [],
      warnings: ["autre_document"],
    });
  });

  it("montant manquant déduit des deux autres, jamais inventé", () => {
    const noTva = normalizeExpenseReading(raw({ total_tva: null }));
    expect(noTva.fields.totalTvaCents).toBe(9_135);
    expect(noTva.warnings).toEqual([]);
    const noHt = normalizeExpenseReading(raw({ total_ht: null }));
    expect(noHt.fields.totalHtCents).toBe(43_500);
    const ttcOnly = normalizeExpenseReading(raw({ total_ht: null, total_tva: null }));
    expect(ttcOnly.fields.totalHtCents).toBeUndefined();
    expect(ttcOnly.fields.totalTvaCents).toBeUndefined();
    expect(ttcOnly.warnings).toEqual(["montants_incomplets"]);
  });

  it("totaux qui ne tombent pas juste : alerte, valeurs lues gardées", () => {
    const reading = normalizeExpenseReading(raw({ total_ttc: 530 }));
    expect(reading.warnings).toEqual(["totaux_incoherents"]);
    expect(reading.fields.totalHtCents).toBe(43_500);
    // Un centime d'écart (arrondis du ticket) est accepté.
    expect(normalizeExpenseReading(raw({ total_ttc: 526.36 })).warnings).toEqual([]);
  });

  it("dates impossibles, échéance avant la facture et montants négatifs écartés", () => {
    const reading = normalizeExpenseReading(
      raw({ date: "2026-02-30", echeance: "2026-10-01", total_ht: -10, total_tva: null }),
    );
    expect(reading.fields.issuedOn).toBeUndefined();
    expect(reading.fields.dueOn).toBe("2026-10-01");
    expect(reading.fields.totalHtCents).toBeUndefined();
    const early = normalizeExpenseReading(raw({ echeance: "2026-10-01" }));
    expect(early.fields.dueOn).toBeUndefined();
  });

  it("ticket de caisse, catégorie et unité inconnues ignorées, lignes sans désignation retirées", () => {
    const reading = normalizeExpenseReading(
      raw({
        type_document: "ticket",
        categorie: "bureautique",
        lignes: [
          {
            designation: "  ",
            reference: null,
            quantite: 1,
            unite: "u",
            prix_unitaire_ht: 5,
            total_ht: 5,
          },
          {
            designation: "Gaine ICTA 20 mm",
            reference: null,
            quantite: 0,
            unite: "rouleau",
            prix_unitaire_ht: null,
            total_ht: 32.5,
          },
        ],
      }),
    );
    expect(reading.fields.kind).toBe("ticket");
    expect(reading.fields.category).toBeUndefined();
    expect(reading.lines).toEqual([
      {
        designation: "Gaine ICTA 20 mm",
        reference: null,
        quantityMilli: null,
        unit: null,
        unitPriceHtCents: null,
        totalHtCents: 3_250,
      },
    ]);
  });
});
