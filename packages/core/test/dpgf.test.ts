import { describe, expect, expectTypeOf, it } from "vitest";
import type { QuoteUnit } from "../src/quote";
import {
  type DpgfCell,
  type DpgfUnit,
  dpgfReadingJsonSchema,
  dpgfUnit,
  findDpgfHeader,
  normalizeDpgfReading,
  parseDpgfGrid,
  parseQuantityMilli,
  suggestTenderPrice,
} from "../src/dpgf";
import { tenderGaps, tenderQuoteLines, tenderTotals } from "../src/dpgf-totals";

// DPGF fictif, tel qu'un architecte le remplit : titre, lots, postes, sous-totaux, totaux.
const GRID: DpgfCell[][] = [
  ["Atelier Morel Architecture", null, null, null, null, null],
  ["DPGF — Maison individuelle, Mougins", null, null, null, null, null],
  [null, null, null, null, null, null],
  ["N°", "Désignation des ouvrages", "U.", "Qté", "P.U. HT", "Montant HT"],
  ["LOT 05", "CARRELAGE, FAÏENCE", null, null, null, null],
  ["5.1", "Ragréage du sol, RDC", "m²", 86, null, null],
  ["5.2", "Carrelage sol grès cérame 60 x 60, RDC", "m2", "62,0", null, null],
  ["5.3", "Plinthes assorties", "ml", 58, null, null],
  ["5.6", "Seuils et barres de transition", "U", 4, null, null],
  [null, "Sous-total lot 05", null, null, null, null],
  ["LOT 06", "PEINTURE", null, null, null, null],
  ["6.1", "Peinture des plafonds, 2 couches", "m²", null, null, null],
  ["6.2", "Installation de chantier", "Ens", 1, null, null],
  [null, null, null, null, null, null],
  [null, "TOTAL HT", null, null, null, null],
  [null, "TVA 20 %", null, null, null, null],
  [null, "TOTAL TTC", null, null, null, null],
];

describe("unités et quantités du DPGF", () => {
  it("garde les mêmes unités que les devis", () => {
    expectTypeOf<DpgfUnit>().toEqualTypeOf<QuoteUnit>();
  });

  it("reconnaît les unités usuelles des architectes", () => {
    expect(dpgfUnit("m²")).toBe("m2");
    expect(dpgfUnit("M2")).toBe("m2");
    expect(dpgfUnit("m.l.")).toBe("ml");
    expect(dpgfUnit("ML")).toBe("ml");
    expect(dpgfUnit("U")).toBe("u");
    expect(dpgfUnit("unité")).toBe("u");
    expect(dpgfUnit("Ens")).toBe("forfait");
    expect(dpgfUnit("Fft")).toBe("forfait");
    expect(dpgfUnit("m³")).toBe("m3");
    expect(dpgfUnit("j")).toBe("jour");
    expect(dpgfUnit("palette")).toBeNull();
    expect(dpgfUnit(null)).toBeNull();
  });

  it("lit les quantités en nombre ou en texte à la française", () => {
    expect(parseQuantityMilli(62)).toBe(62_000);
    expect(parseQuantityMilli("62,5")).toBe(62_500);
    expect(parseQuantityMilli("1 250,25")).toBe(1_250_250);
    expect(parseQuantityMilli("12.75")).toBe(12_750);
    expect(parseQuantityMilli("")).toBeNull();
    expect(parseQuantityMilli("pm")).toBeNull();
    expect(parseQuantityMilli(-3)).toBeNull();
  });
});

describe("lecture du DPGF", () => {
  it("trouve la ligne d'en-tête et ses colonnes", () => {
    expect(findDpgfHeader(GRID)).toEqual({
      row: 3,
      columns: { code: 0, designation: 1, unit: 2, quantity: 3, unitPrice: 4, total: 5 },
    });
  });

  it("refuse un tableau sans colonne désignation", () => {
    expect(
      findDpgfHeader([
        ["Nom", "Prénom"],
        ["A", "B"],
      ]),
    ).toBeNull();
    expect(parseDpgfGrid([["Nom", "Prénom"]])).toBeNull();
  });

  it("range les lignes en titres et postes, par lot, sans les totaux", () => {
    const parsed = parseDpgfGrid(GRID);
    expect(parsed).not.toBeNull();
    const rows = parsed?.rows ?? [];
    expect(rows.map((r) => [r.kind, r.code, r.lot])).toEqual([
      ["titre", "LOT 05", "LOT 05 CARRELAGE, FAÏENCE"],
      ["poste", "5.1", "LOT 05 CARRELAGE, FAÏENCE"],
      ["poste", "5.2", "LOT 05 CARRELAGE, FAÏENCE"],
      ["poste", "5.3", "LOT 05 CARRELAGE, FAÏENCE"],
      ["poste", "5.6", "LOT 05 CARRELAGE, FAÏENCE"],
      ["titre", "LOT 06", "LOT 06 PEINTURE"],
      ["poste", "6.1", "LOT 06 PEINTURE"],
      ["poste", "6.2", "LOT 06 PEINTURE"],
    ]);
    expect(rows[2]).toMatchObject({
      sheetRow: 7,
      designation: "Carrelage sol grès cérame 60 x 60, RDC",
      unitLabel: "m2",
      unit: "m2",
      quantityMilli: 62_000,
    });
    // Quantité laissée à l'entreprise : poste sans quantité.
    expect(rows[6]).toMatchObject({ kind: "poste", quantityMilli: null, unit: "m2" });
    expect(parsed?.columns.unitPrice).toBe(4);
  });

  it("signale l'absence de colonne de prix", () => {
    const grid: DpgfCell[][] = [
      ["Désignation", "Unité", "Quantité"],
      ["Carrelage", "m2", 10],
    ];
    const parsed = parseDpgfGrid(grid);
    expect(parsed?.warnings).toContain("sans_colonne_prix");
    expect(parsed?.rows).toHaveLength(1);
  });
});

describe("prix repris des anciens devis", () => {
  const history = [
    {
      designation: "Pose carrelage grès cérame 60x60",
      unit: "m2" as const,
      unitPriceHtCents: 7400,
      usedOn: "2026-09-12",
    },
    {
      designation: "Plinthes carrelage",
      unit: "ml" as const,
      unitPriceHtCents: 1450,
      usedOn: "2026-08-01",
    },
    {
      designation: "Plinthes bois",
      unit: "ml" as const,
      unitPriceHtCents: 900,
      usedOn: "2026-10-01",
    },
    {
      designation: "Ragréage autolissant",
      unit: "m2" as const,
      unitPriceHtCents: 1800,
      usedOn: "2026-07-01",
    },
  ];

  it("propose le prix d'une ligne proche, de même unité", () => {
    expect(
      suggestTenderPrice(
        { designation: "Carrelage sol grès cérame 60 x 60, RDC", unit: "m2" },
        history,
      ),
    ).toMatchObject({ unitPriceHtCents: 7400, reference: "Pose carrelage grès cérame 60x60" });
    expect(
      suggestTenderPrice({ designation: "Ragréage du sol, RDC", unit: "m2" }, history),
    ).toMatchObject({ unitPriceHtCents: 1800 });
  });

  it("n'utilise pas une ligne d'une autre unité, ni une ressemblance trop faible", () => {
    expect(suggestTenderPrice({ designation: "Ragréage du sol", unit: "ml" }, history)).toBeNull();
    expect(
      suggestTenderPrice({ designation: "Peinture des plafonds", unit: "m2" }, history),
    ).toBeNull();
  });

  it("à ressemblance égale, prend le prix le plus récent", () => {
    expect(suggestTenderPrice({ designation: "Plinthes", unit: "ml" }, history)).toMatchObject({
      unitPriceHtCents: 900,
    });
  });

  it("à ressemblance égale, la bibliothèque passe devant les anciens devis (ADR 0294)", () => {
    const withLibrary = [
      ...history,
      {
        designation: "Plinthes carrelage",
        unit: "ml" as const,
        unitPriceHtCents: 1500,
        usedOn: "2026-01-01",
        source: "bibliotheque" as const,
      },
    ];
    expect(suggestTenderPrice({ designation: "Plinthes", unit: "ml" }, withLibrary)).toEqual({
      unitPriceHtCents: 1500,
      reference: "Plinthes carrelage",
      usedOn: "2026-01-01",
      source: "bibliotheque",
    });
    expect(suggestTenderPrice({ designation: "Plinthes", unit: "ml" }, history)?.source).toBe(
      "devis",
    );
  });
});

describe("totaux et écarts", () => {
  const lines = [
    {
      kind: "titre" as const,
      quantityMilli: null,
      architectQuantityMilli: null,
      unitPriceHtCents: null,
    },
    {
      kind: "poste" as const,
      quantityMilli: 77_400,
      architectQuantityMilli: 62_000,
      unitPriceHtCents: 7400,
    },
    {
      kind: "poste" as const,
      quantityMilli: 58_000,
      architectQuantityMilli: 58_000,
      unitPriceHtCents: 1450,
    },
    {
      kind: "poste" as const,
      quantityMilli: 4_000,
      architectQuantityMilli: 4_000,
      unitPriceHtCents: null,
    },
    {
      kind: "poste" as const,
      quantityMilli: null,
      architectQuantityMilli: null,
      unitPriceHtCents: 2000,
    },
  ];

  it("additionne les postes chiffrés et compte ceux qui restent à chiffrer", () => {
    expect(tenderTotals(lines, 2000)).toEqual({
      totalHtCents: 572_760 + 84_100,
      totalTvaCents: 131_372,
      totalTtcCents: 656_860 + 131_372,
      posts: 4,
      priced: 2,
      toPrice: 2,
    });
  });

  it("liste les quantités modifiées et le montant des travaux absents du DPGF", () => {
    expect(tenderGaps(lines)).toEqual({
      changed: 1,
      underestimatedHtCents: 113_960,
    });
  });
});

describe("DPGF lu dans un PDF", () => {
  it("garde titres et postes, unités et quantités, et repère les lots", () => {
    const reading = normalizeDpgfReading({
      lisible: true,
      est_un_dpgf: true,
      lignes: [
        {
          type: "titre",
          numero: "LOT 05",
          designation: "CARRELAGE, FAÏENCE",
          unite: null,
          quantite: null,
        },
        {
          type: "poste",
          numero: "5.2",
          designation: " Carrelage sol 60 x 60 ",
          unite: "m²",
          quantite: 62,
        },
        { type: "poste", numero: null, designation: "Seuils", unite: "U", quantite: null },
        { type: "poste", numero: "5.9", designation: "", unite: "u", quantite: 1 },
        {
          type: "titre",
          numero: null,
          designation: "TOTAL HT LOT 05",
          unite: null,
          quantite: null,
        },
      ],
    });
    expect(reading.rows).toEqual([
      {
        kind: "titre",
        sheetRow: null,
        code: "LOT 05",
        designation: "CARRELAGE, FAÏENCE",
        unitLabel: null,
        unit: null,
        quantityMilli: null,
        lot: "LOT 05 CARRELAGE, FAÏENCE",
      },
      {
        kind: "poste",
        sheetRow: null,
        code: "5.2",
        designation: "Carrelage sol 60 x 60",
        unitLabel: "m²",
        unit: "m2",
        quantityMilli: 62_000,
        lot: "LOT 05 CARRELAGE, FAÏENCE",
      },
      {
        kind: "poste",
        sheetRow: null,
        code: null,
        designation: "Seuils",
        unitLabel: "U",
        unit: "u",
        quantityMilli: null,
        lot: "LOT 05 CARRELAGE, FAÏENCE",
      },
    ]);
    expect(reading.warnings).toEqual([]);
  });

  it("signale un document illisible ou qui n'est pas un DPGF", () => {
    expect(
      normalizeDpgfReading({ lisible: false, est_un_dpgf: true, lignes: [] }).warnings,
    ).toEqual(["illisible"]);
    expect(
      normalizeDpgfReading({ lisible: true, est_un_dpgf: false, lignes: [] }).warnings,
    ).toEqual(["pas_un_dpgf"]);
  });

  it("décrit la réponse attendue du modèle", () => {
    const schema = dpgfReadingJsonSchema() as { required: string[] };
    expect(schema.required).toEqual(["lisible", "est_un_dpgf", "lignes"]);
  });
});

describe("DPGF repris dans un devis", () => {
  const tender = [
    {
      kind: "titre" as const,
      lot: "LOT 05 CARRELAGE",
      code: "LOT 05",
      designation: "CARRELAGE",
      unit: null,
      quantityMilli: null,
      unitPriceHtCents: null,
    },
    {
      kind: "poste" as const,
      lot: "LOT 05 CARRELAGE",
      code: "5.2",
      designation: "Carrelage sol 60 x 60",
      unit: "m2" as const,
      quantityMilli: 77_400,
      unitPriceHtCents: 7400,
    },
    {
      kind: "poste" as const,
      lot: "LOT 05 CARRELAGE",
      code: "5.6",
      designation: "Seuils",
      unit: "u" as const,
      quantityMilli: 4000,
      unitPriceHtCents: null,
    },
    {
      kind: "poste" as const,
      lot: "LOT 05 CARRELAGE",
      code: null,
      designation: "Installation de chantier",
      unit: null,
      quantityMilli: 1000,
      unitPriceHtCents: 25_000,
    },
    {
      kind: "poste" as const,
      lot: null,
      code: "6.1",
      designation: "Peinture",
      unit: "m2" as const,
      quantityMilli: null,
      unitPriceHtCents: 1200,
    },
  ];

  it("reprend les postes chiffrés, avec le n° et le lot, à la TVA de l'offre", () => {
    expect(tenderQuoteLines(tender, 1000, 0)).toEqual({
      lines: [
        {
          type: "autre",
          designation: "5.2 Carrelage sol 60 x 60",
          description: "LOT 05 CARRELAGE",
          quantityMilli: 77_400,
          unit: "m2",
          unitPriceHtCents: 7400,
          vatRateBp: 1000,
        },
        {
          type: "autre",
          designation: "Installation de chantier",
          description: "LOT 05 CARRELAGE",
          quantityMilli: 1000,
          unit: "forfait",
          unitPriceHtCents: 25_000,
          vatRateBp: 1000,
        },
      ],
      skipped: 2,
      truncated: 0,
    });
  });

  it("s'arrête à la limite de lignes d'un devis", () => {
    const result = tenderQuoteLines(tender, 2000, 199);
    expect(result.lines).toHaveLength(1);
    expect(result.truncated).toBe(1);
  });
});
