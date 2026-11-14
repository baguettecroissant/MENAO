import { describe, expect, it } from "vitest";
import {
  type InvoiceLine,
  type InvoiceSupply,
  designationKey,
  invoiceChangesFor,
  invoicePriceProposals,
  priceDeltaBp,
  referenceKey,
  worksRecalculated,
} from "../src/library-invoices";

// Données fictives, reprises de la maquette du lot 43.
const supplies: InvoiceSupply[] = [
  {
    id: "ba13",
    designation: "Plaque de plâtre BA13",
    reference: "BA13-250",
    unit: "m2",
    purchasePriceCents: 250,
    priceOn: "2026-09-01",
  },
  {
    id: "rail",
    designation: "Rail 48 mm",
    reference: "R48-3",
    unit: "ml",
    purchasePriceCents: 110,
    priceOn: null,
  },
  {
    id: "laine",
    designation: "Laine de verre 45 mm",
    reference: null,
    unit: "m2",
    purchasePriceCents: 190,
    priceOn: "2026-10-01",
  },
  {
    id: "enduit",
    designation: "Enduit à joint 25 kg",
    reference: null,
    unit: "u",
    purchasePriceCents: 1420,
    priceOn: null,
  },
  {
    id: "vis",
    designation: "Vis placo",
    reference: null,
    unit: "u",
    purchasePriceCents: null,
    priceOn: null,
  },
];

let n = 0;
const line = (over: Partial<InvoiceLine>): InvoiceLine => ({
  id: `l${++n}`,
  designation: "Article",
  reference: null,
  unit: "u",
  unitPriceCents: 100,
  issuedOn: "2026-11-07",
  supplier: "Négoce fictif",
  reviewed: false,
  ...over,
});

describe("clés de rapprochement", () => {
  it("désignation sans accents ni ponctuation", () => {
    expect(designationKey("  Enduit à JOINT — 25kg ")).toBe("enduit a joint 25 kg");
  });
  it("référence sans séparateurs ; trop courte ignorée", () => {
    expect(referenceKey("ba13 250")).toBe(referenceKey("BA13-250"));
    expect(referenceKey("-")).toBeNull();
    expect(referenceKey(null)).toBeNull();
  });
  it("écart en points de base", () => {
    expect(priceDeltaBp(250, 272)).toBe(880);
    expect(priceDeltaBp(190, 184)).toBe(-316);
    expect(priceDeltaBp(null, 100)).toBeNull();
    expect(priceDeltaBp(0, 100)).toBeNull();
  });
});

describe("invoicePriceProposals", () => {
  it("rapproche par la référence, sinon par la désignation et l'unité", () => {
    const { changes, fresh } = invoicePriceProposals(
      [
        line({
          designation: "PLAQUE STD 13 2500x1200",
          reference: "ba13 250",
          unit: "m2",
          unitPriceCents: 272,
        }),
        line({
          designation: "Rail métallique",
          reference: "R48-3",
          unit: null,
          unitPriceCents: 118,
        }),
        line({
          designation: "Laine de verre 45mm",
          unit: "m2",
          unitPriceCents: 184,
          issuedOn: "2026-11-04",
        }),
        line({
          designation: "Enduit a joint 25 kg",
          unit: "u",
          unitPriceCents: 2190,
          issuedOn: "2026-11-04",
        }),
      ],
      supplies,
    );
    expect(fresh).toEqual([]);
    expect(changes.map((c) => [c.supplyId, c.matchedBy, c.newCents, c.deltaBp, c.checked])).toEqual(
      [
        ["ba13", "reference", 272, 880, true],
        ["rail", "reference", 118, 727, true],
        ["laine", "designation", 184, -316, true],
        // Plus de 30 % : décochée, à vérifier.
        ["enduit", "designation", 2190, 5423, false],
      ],
    );
  });

  it("garde la ligne la plus récente, sans revenir à une plus ancienne", () => {
    const { changes } = invoicePriceProposals(
      [
        line({ reference: "BA13-250", unit: "m2", unitPriceCents: 260, issuedOn: "2026-10-10" }),
        line({ reference: "BA13-250", unit: "m2", unitPriceCents: 280, issuedOn: "2026-11-02" }),
        // Plus récente, déjà passée en revue : rien n'est proposé pour la plaque.
        line({
          designation: "Laine de verre 45 mm",
          unit: "m2",
          unitPriceCents: 200,
          issuedOn: "2026-11-05",
          reviewed: true,
        }),
        line({
          designation: "Laine de verre 45 mm",
          unit: "m2",
          unitPriceCents: 210,
          issuedOn: "2026-10-20",
        }),
      ],
      supplies,
    );
    expect(changes.map((c) => [c.supplyId, c.newCents])).toEqual([["ba13", 280]]);
  });

  it("ignore une facture plus ancienne que le prix actuel, ou au même prix", () => {
    const { changes } = invoicePriceProposals(
      [
        line({ reference: "BA13-250", unit: "m2", unitPriceCents: 300, issuedOn: "2026-08-15" }),
        line({ designation: "Laine de verre 45 mm", unit: "m2", unitPriceCents: 190 }),
      ],
      supplies,
    );
    expect(changes).toEqual([]);
  });

  it("prix encore à renseigner : proposé et coché, sans écart", () => {
    const { changes } = invoicePriceProposals(
      [line({ designation: "Vis placo", unit: "u", unitPriceCents: 1890 })],
      supplies,
    );
    expect(changes).toEqual([
      expect.objectContaining({ supplyId: "vis", oldCents: null, deltaBp: null, checked: true }),
    ]);
  });

  it("autre unité : ni rapprochée, ni proposée en ajout", () => {
    const { changes, fresh } = invoicePriceProposals(
      [
        line({ designation: "Plaque de plâtre BA13", unit: "u", unitPriceCents: 750 }),
        line({ reference: "BA13-250", designation: "Plaque", unit: "u", unitPriceCents: 750 }),
      ],
      supplies,
    );
    expect(changes).toEqual([]);
    expect(fresh).toEqual([]);
  });

  it("articles inconnus : une fois chacun, le plus récent ; sans unité, sans prix ou vus, ignorés", () => {
    const { fresh } = invoicePriceProposals(
      [
        line({
          designation: "Bande à joint papier 150 m",
          unitPriceCents: 450,
          issuedOn: "2026-10-30",
        }),
        line({
          designation: "Bande a joint papier 150 m",
          unitPriceCents: 460,
          issuedOn: "2026-11-04",
          supplier: "Point fictif",
        }),
        line({ designation: "Vis TTPC 25 mm", unit: null }),
        line({ designation: "Transport", unitPriceCents: 0 }),
        line({ designation: "Remise", unitPriceCents: null }),
        line({ designation: "Mastic", reviewed: true }),
      ],
      supplies,
    );
    expect(fresh).toEqual([
      expect.objectContaining({
        designation: "Bande a joint papier 150 m",
        priceCents: 460,
        supplier: "Point fictif",
      }),
    ]);
  });
});

describe("worksRecalculated", () => {
  it("compte les ouvrages calculés qui utilisent une des fournitures", () => {
    const works = [
      { id: "a", manualPriceCents: null, supplyIds: ["ba13", "rail"] },
      { id: "b", manualPriceCents: null, supplyIds: ["rail"] },
      { id: "c", manualPriceCents: 5000, supplyIds: ["ba13"] },
      { id: "d", manualPriceCents: null, supplyIds: ["laine"] },
    ];
    expect(worksRecalculated(works, new Set(["ba13", "rail"]))).toBe(2);
    expect(worksRecalculated(works, new Set())).toBe(0);
  });
});

describe("invoiceChangesFor", () => {
  const change = (lineId: string, oldCents: number | null, newCents: number) => ({
    supplyId: `s-${lineId}`,
    lineId,
    matchedBy: "designation" as const,
    oldCents,
    newCents,
    deltaBp: null,
    issuedOn: "2026-11-07",
    supplier: null,
    checked: true,
  });
  const all = [change("a", 250, 272), change("b", 110, 118), change("c", 190, 184)];
  it("garde les lignes de la facture et donne le sens", () => {
    expect(invoiceChangesFor(all, new Set(["a", "b"])).trend).toBe("hausse");
    expect(invoiceChangesFor(all, new Set(["c"])).trend).toBe("baisse");
    expect(invoiceChangesFor(all, new Set(["a", "c"])).trend).toBe("mixte");
    expect(invoiceChangesFor(all, new Set(["a", "c"])).changes.map((c) => c.lineId)).toEqual([
      "a",
      "c",
    ]);
  });
  it("prix à renseigner compté en hausse ; rien pour une autre facture", () => {
    expect(invoiceChangesFor([change("d", null, 500)], new Set(["d"])).trend).toBe("hausse");
    expect(invoiceChangesFor(all, new Set(["z"]))).toEqual({ changes: [], trend: null });
  });
});
