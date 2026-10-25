import { describe, expect, it } from "vitest";
import { expenseFormSchema, expenseLinesSchema } from "../src/expense";

const form = {
  title: "  Tableau électrique ",
  supplierName: "Négoce Exemple",
  reference: "",
  kind: "facture",
  category: "materiaux",
  issuedOn: "2026-10-12",
  dueOn: "2026-11-11",
  paidOn: "",
  chantierId: "",
  totalHt: "435,00",
  totalTva: "91,35",
  notes: "",
};

describe("formulaire d'une dépense", () => {
  it("montants en centimes, champs vides à null", () => {
    expect(expenseFormSchema.parse(form)).toEqual({
      title: "Tableau électrique",
      supplierName: "Négoce Exemple",
      reference: null,
      kind: "facture",
      category: "materiaux",
      issuedOn: "2026-10-12",
      dueOn: "2026-11-11",
      paidOn: null,
      chantierId: null,
      totalHtCents: 43_500,
      totalTvaCents: 9_135,
      notes: null,
    });
  });

  it("titre, date et montants obligatoires", () => {
    const result = expenseFormSchema.safeParse({
      ...form,
      title: " ",
      issuedOn: "",
      totalHt: "",
      totalTva: "abc",
    });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["title", "issuedOn", "totalHt", "totalTva"]));
  });

  it("échéance avant la date de la pièce refusée, catégorie libre refusée", () => {
    expect(
      expenseFormSchema.safeParse({ ...form, dueOn: "2026-10-01" }).error?.issues[0]?.path,
    ).toEqual(["dueOn"]);
    expect(expenseFormSchema.safeParse({ ...form, category: "bureautique" }).success).toBe(false);
  });

  it("chantier : identifiant attendu", () => {
    expect(
      expenseFormSchema.parse({ ...form, chantierId: "00000000-0000-4000-8000-00000000e203" })
        .chantierId,
    ).toBe("00000000-0000-4000-8000-00000000e203");
    expect(expenseFormSchema.safeParse({ ...form, chantierId: "chantier" }).success).toBe(false);
  });

  it("lignes lues sur la pièce : 100 au plus, unités des devis", () => {
    const line = {
      designation: "Disjoncteur 16 A",
      reference: null,
      quantityMilli: 12_000,
      unit: "u",
      unitPriceHtCents: 2_043,
      totalHtCents: 24_510,
    };
    expect(expenseLinesSchema.safeParse([line]).success).toBe(true);
    expect(expenseLinesSchema.safeParse([{ ...line, unit: "rouleau" }]).success).toBe(false);
    expect(expenseLinesSchema.safeParse(Array.from({ length: 101 }, () => line)).success).toBe(
      false,
    );
  });
});
