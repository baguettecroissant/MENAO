import { describe, expect, it } from "vitest";
import { formatRaise, parseRaise, raisePlan, raisePrice } from "../src/library-raise";

describe("parseRaise", () => {
  it("lit « 3 », « + 3 % », « 2,5 »", () => {
    expect(parseRaise("3")).toBe(300);
    expect(parseRaise("+ 3 %")).toBe(300);
    expect(parseRaise("2,5")).toBe(250);
    expect(parseRaise("0.1")).toBe(10);
  });
  it("refuse une baisse, zéro ou plus de 30 %", () => {
    expect(parseRaise("-3")).toBeNull();
    expect(parseRaise("0")).toBeNull();
    expect(parseRaise("31")).toBeNull();
    expect(parseRaise("trois")).toBeNull();
  });
  it("affiche la hausse", () => {
    expect(formatRaise(300)).toBe("+ 3 %");
    expect(formatRaise(250)).toBe("+ 2,5 %");
  });
});

describe("raisePrice", () => {
  it("+ 3 % aux 10 centimes (maquette du lot 43)", () => {
    expect(raisePrice(66550, 300, "dix")).toBe(68550);
    expect(raisePrice(16500, 300, "dix")).toBe(17000);
    expect(raisePrice(6800, 300, "dix")).toBe(7000);
    expect(raisePrice(1400, 300, "dix")).toBe(1440);
    expect(raisePrice(2200, 300, "dix")).toBe(2270);
  });
  it("au centime, moitié vers le haut ; à l'euro", () => {
    expect(raisePrice(250, 300, "centime")).toBe(258); // 257,5
    expect(raisePrice(66550, 300, "euro")).toBe(68500);
  });
  it("jamais sous le prix de départ", () => {
    expect(raisePrice(110, 300, "euro")).toBe(110);
  });
});

describe("raisePlan", () => {
  const works = [
    { id: "w1", designation: "Pose WC", unit: "u", manualPriceCents: 66550 },
    { id: "w2", designation: "Ouvrage composé", unit: "m2", manualPriceCents: null },
  ];
  const supplies = [
    { id: "s1", designation: "Plaque", unit: "m2", purchasePriceCents: 250 },
    { id: "s2", designation: "À renseigner", unit: "u", purchasePriceCents: null },
    { id: "s3", designation: "Vis", unit: "u", purchasePriceCents: 2 },
  ];
  it("ouvrages à prix fixé seulement", () => {
    expect(raisePlan(works, supplies, 300, "dix", { works: true, supplies: false })).toEqual([
      {
        kind: "ouvrage",
        id: "w1",
        designation: "Pose WC",
        unit: "u",
        beforeCents: 66550,
        afterCents: 68550,
      },
    ]);
  });
  it("prix d'achat : sans prix ou inchangés après arrondi, écartés", () => {
    expect(
      raisePlan(works, supplies, 300, "centime", { works: false, supplies: true }).map((i) => [
        i.id,
        i.afterCents,
      ]),
    ).toEqual([["s1", 258]]);
  });
  it("les deux", () => {
    expect(
      raisePlan(works, supplies, 300, "dix", { works: true, supplies: true }).map((i) => i.id),
    ).toEqual(["w1", "s1"]);
  });
});
