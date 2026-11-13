import { describe, expect, it } from "vitest";
import {
  buildImportRows,
  classifyImport,
  columnLetter,
  findHeaderRow,
  normalizeAiColumns,
  parseCsv,
  parseImportPrice,
  parseImportUnit,
  parseImportVat,
  recognizeColumns,
  roleOfHeader,
} from "../src/library-import";

// Catalogue fictif de la maquette du lot 42.
const GRID = [
  ["Libellé", "U", "PU HT", "Tx TVA", "Famille"],
  ["Cloison placo 72/48 isolée", "m2", "38,50", "10%", "Plâtrerie"],
  ["Doublage collé PSE 10+80", "M2", "42,00 €", "10%", "Plâtrerie"],
  ["Faux plafond BA13 sur fourrures", "m²", 47.8, 0.1, "Plâtrerie"],
  [null, null, null, null, null],
  ["Enduit de lissage", "m2", "sur devis", "10%", "Finitions"],
  [null, "ml", "6,20", "10%", "Finitions"],
  ["Peinture façade pliolite", "pot", "18,00", "20%", "Peinture"],
  ["Trappe de visite 60x60", "U", "95", "20 %", "Accessoires"],
];

describe("import du catalogue : valeurs", () => {
  it("lit les prix écrits de mille façons", () => {
    expect(parseImportPrice("12,50")).toBe(1250);
    expect(parseImportPrice("1 250,00 €")).toBe(125000);
    expect(parseImportPrice("1.250,00")).toBe(125000);
    expect(parseImportPrice("1,250.00")).toBe(125000);
    expect(parseImportPrice("12.5 € HT")).toBe(1250);
    expect(parseImportPrice(47.8)).toBe(4780);
    expect(parseImportPrice("")).toBeNull();
    expect(parseImportPrice(null)).toBeNull();
    expect(parseImportPrice("sur devis")).toBeUndefined();
    expect(parseImportPrice(-3)).toBeUndefined();
  });

  it("lit les unités et la TVA", () => {
    expect(parseImportUnit("M²")).toBe("m2");
    expect(parseImportUnit("ens")).toBe("forfait");
    expect(parseImportUnit("pce")).toBe("u");
    expect(parseImportUnit("")).toBeNull();
    expect(parseImportUnit("pot")).toBeUndefined();
    expect(parseImportVat("10%")).toBe(1000);
    expect(parseImportVat("5,5 %")).toBe(550);
    expect(parseImportVat(0.2)).toBe(2000);
    expect(parseImportVat(20)).toBe(2000);
    expect(parseImportVat("0")).toBe(0);
    expect(parseImportVat("7%")).toBeUndefined();
    expect(parseImportVat(null)).toBeNull();
  });

  it("lettres de colonnes", () => {
    expect(columnLetter(0)).toBe("A");
    expect(columnLetter(25)).toBe("Z");
    expect(columnLetter(26)).toBe("AA");
  });
});

describe("import du catalogue : colonnes", () => {
  it("reconnaît les titres, même écrits autrement", () => {
    expect(roleOfHeader("Libellé", "ouvrages")).toBe("designation");
    expect(roleOfHeader("P.U. HT", "ouvrages")).toBe("price");
    expect(roleOfHeader("Px vente", "ouvrages")).toBe("price");
    expect(roleOfHeader("Prix d'achat net", "fournitures")).toBe("price");
    expect(roleOfHeader("Taux de TVA", "ouvrages")).toBe("vat");
    expect(roleOfHeader("Taux de TVA", "fournitures")).toBeNull();
    expect(roleOfHeader("Réf. article", "fournitures")).toBe("reference");
    expect(roleOfHeader("Fournisseur", "fournitures")).toBe("supplier");
    expect(roleOfHeader("Famille", "ouvrages")).toBeNull();
  });

  it("titres en ligne 1 : 4 colonnes sur 5 reconnues, la famille ignorée", () => {
    const r = recognizeColumns(GRID, "ouvrages");
    expect(r.headerRow).toBe(0);
    expect(r.roles).toEqual(["designation", "unit", "price", "vat", "ignore"]);
    expect(r.recognized).toEqual([true, true, true, true, false]);
    expect(r.complete).toBe(true);
  });

  it("une seule colonne « Description » devient la désignation", () => {
    const r = recognizeColumns(
      [
        ["Description", "Prix"],
        ["Pose de faïence", "45"],
      ],
      "ouvrages",
    );
    expect(r.roles).toEqual(["designation", "price"]);
  });

  it("sans titres : désignation, unité et prix devinés par le contenu", () => {
    const grid = [
      ["Cloison placo 72/48 isolée", "m2", "38,50"],
      ["Doublage collé PSE 10+80", "m2", "42,00"],
      ["Faux plafond BA13 sur fourrures", "m2", "47,80"],
    ];
    expect(findHeaderRow(grid, "ouvrages")).toBe(-1);
    const r = recognizeColumns(grid, "ouvrages");
    expect(r.headerRow).toBe(-1);
    expect(r.roles).toEqual(["designation", "unit", "price"]);
    expect(r.complete).toBe(true);
  });

  it("titres sans prix reconnaissable : incomplet, l'IA peut aider", () => {
    const r = recognizeColumns(
      [
        ["Libellé", "Col2"],
        ["Pose de faïence", "sur devis"],
      ],
      "ouvrages",
    );
    expect(r.complete).toBe(false);
  });

  it("réponse de l'IA nettoyée : rôles inconnus ou répétés ignorés", () => {
    expect(
      normalizeAiColumns(
        { header_row: 0, roles: ["designation", "price", "price", "bidon"] },
        4,
        "ouvrages",
      ),
    ).toEqual({ headerRow: 0, roles: ["designation", "price", "ignore", "ignore"] });
    expect(normalizeAiColumns({ header_row: 0, roles: ["unit"] }, 1, "ouvrages")).toBeNull();
    expect(normalizeAiColumns({ roles: "x" }, 1, "ouvrages")).toBeNull();
  });
});

describe("import du catalogue : lignes", () => {
  it("lignes valides, lignes vides ignorées, lignes à corriger avec leur raison", () => {
    const { rows, issues } = buildImportRows(GRID, 0, ["designation", "unit", "price", "vat", "ignore"]);
    expect(rows.map((r) => [r.line, r.designation, r.unit, r.priceCents, r.vatRateBp])).toEqual([
      [2, "Cloison placo 72/48 isolée", "m2", 3850, 1000],
      [3, "Doublage collé PSE 10+80", "m2", 4200, 1000],
      [4, "Faux plafond BA13 sur fourrures", "m2", 4780, 1000],
      [9, "Trappe de visite 60x60", "u", 9500, 2000],
    ]);
    expect(issues).toEqual([
      { line: 6, designation: "Enduit de lissage", reason: "price", value: "sur devis" },
      { line: 7, designation: "", reason: "designation", value: "" },
      { line: 8, designation: "Peinture façade pliolite", reason: "unit", value: "pot" },
    ]);
  });

  it("sans colonne d'unité : à l'unité ; sans TVA : laissée vide (10 % par défaut à l'import)", () => {
    const { rows } = buildImportRows([["Dépose", "14"]], -1, ["designation", "price"]);
    expect(rows[0]).toMatchObject({ line: 1, unit: "u", priceCents: 1400, vatRateBp: null });
  });

  it("nouveaux et déjà présents ; une ligne répétée compte une fois, la dernière l'emporte", () => {
    const { rows } = buildImportRows(
      [
        ["Cloison", "m2", "30"],
        ["Plinthe", "ml", "8"],
        ["cloison ", "m2", "32"],
      ],
      -1,
      ["designation", "unit", "price"],
    );
    const c = classifyImport(rows, [{ designation: "CLOISON", unit: "m2" }]);
    expect(c.existing.map((r) => r.priceCents)).toEqual([3200]);
    expect(c.fresh.map((r) => r.designation)).toEqual(["Plinthe"]);
  });
});

describe("import du catalogue : CSV", () => {
  it("point-virgule, guillemets, virgule décimale", () => {
    const grid = parseCsv('﻿Libellé;Prix\r\n"Cloison ""placo""; isolée";38,50\nPlinthe;8\n');
    expect(grid).toEqual([
      ["Libellé", "Prix"],
      ['Cloison "placo"; isolée', "38,50"],
      ["Plinthe", "8"],
    ]);
  });

  it("virgule ou tabulation comme séparateur", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv("a\tb\n1\t2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});
