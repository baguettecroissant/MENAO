import { describe, expect, it } from "vitest";
import {
  commissionAmountCents,
  commissionsCsv,
  eurosToCents,
  normalizePartnerCode,
  partnerLinks,
  partnerTotals,
} from "../src/partners";

describe("code partenaire (F-59)", () => {
  it("normalise : minuscules, espaces retirés", () => {
    expect(normalizePartnerCode("  Agence-Nice06 ")).toBe("agence-nice06");
    expect(normalizePartnerCode("abc")).toBe("abc");
  });

  it("refuse les codes mal formés ou hors longueur", () => {
    for (const bad of [
      "ab",
      "-abc",
      "abc-",
      "a b c",
      "agence_nice",
      "é-abc",
      "a".repeat(33),
      "",
      null,
      42,
    ]) {
      expect(normalizePartnerCode(bad), String(bad)).toBeNull();
    }
    expect(normalizePartnerCode("a".repeat(32))).toBe("a".repeat(32));
  });
});

describe("liens partenaire", () => {
  it("lien particuliers et lien pros, sans barre finale en double", () => {
    expect(partnerLinks("https://menao.fr/", "agence-nice")).toEqual({
      clients: "https://menao.fr/p/agence-nice",
      pros: "https://menao.fr/p/agence-nice/pro",
    });
  });
});

describe("montant d'une commission", () => {
  it("montant négocié du partenaire, sinon montant par défaut, sinon 0", () => {
    expect(commissionAmountCents(2500, 1000)).toBe(2500);
    expect(commissionAmountCents(0, 1000)).toBe(0);
    expect(commissionAmountCents(null, 1000)).toBe(1000);
    expect(commissionAmountCents(null, null)).toBe(0);
  });
});

describe("totaux d'un partenaire", () => {
  it("nombre et montant par statut", () => {
    expect(
      partnerTotals([
        { status: "en_attente", amount_cents: 1000 },
        { status: "en_attente", amount_cents: 1500 },
        { status: "validee", amount_cents: 2000 },
        { status: "payee", amount_cents: 3000 },
        { status: "annulee", amount_cents: 9999 },
      ]),
    ).toEqual({
      en_attente: { count: 2, cents: 2500 },
      validee: { count: 1, cents: 2000 },
      payee: { count: 1, cents: 3000 },
      annulee: { count: 1, cents: 9999 },
    });
  });
});

describe("export des commissions (CSV)", () => {
  it("séparateur point-virgule, montants en euros à la française, champs échappés", () => {
    const csv = commissionsCsv([
      {
        partner: "Agence ; Nice",
        siret: "73282932000074",
        kind: "demande_qualifiee",
        status: "validee",
        amountCents: 1550,
        createdAt: "2026-10-19T08:00:00Z",
        validatedAt: "2026-11-18T03:45:00Z",
        reference: null,
      },
      {
        partner: 'Comptable "Durand"',
        siret: "73282932000074",
        kind: "abonne_payant",
        status: "payee",
        amountCents: 5000,
        createdAt: "2026-10-20T08:00:00Z",
        validatedAt: null,
        reference: "FAC-12",
      },
    ]);
    expect(csv.split("\r\n")).toEqual([
      "Partenaire;SIRET;Type;Statut;Montant (EUR);Créée le;Validée le;Référence de paiement",
      '"Agence ; Nice";73282932000074;Demande qualifiée;Validée;15,50;2026-10-19;2026-11-18;',
      '"Comptable ""Durand""";73282932000074;Abonné payant;Payée;50,00;2026-10-20;;FAC-12',
    ]);
  });

  it("neutralise les formules de tableur (=, +, -, @)", () => {
    const csv = commissionsCsv([
      {
        partner: '=HYPERLINK("x")',
        siret: "73282932000074",
        kind: "abonne_payant",
        status: "validee",
        amountCents: 0,
        createdAt: "2026-10-20T08:00:00Z",
        validatedAt: null,
        reference: "+33",
      },
    ]);
    expect(csv.split("\r\n")[1]).toBe(
      '"\'=HYPERLINK(""x"")";73282932000074;Abonné payant;Validée;0,00;2026-10-20;;\'+33',
    );
  });
});

describe("montant saisi en euros", () => {
  it("virgule ou point, espaces tolérés ; vide : null", () => {
    expect(eurosToCents("15,50")).toBe(1550);
    expect(eurosToCents(" 15.5 ")).toBe(1550);
    expect(eurosToCents("40")).toBe(4000);
    expect(eurosToCents("1 000")).toBe(100000);
    expect(eurosToCents("")).toBeNull();
    expect(eurosToCents(undefined)).toBeNull();
  });

  it("invalide : négatif, plus de 2 décimales, texte", () => {
    for (const bad of ["-5", "12,345", "douze", "1e3"])
      expect(eurosToCents(bad), bad).toBe(Number.NaN);
  });
});
