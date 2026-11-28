import { describe, expect, it } from "vitest";
import {
  invoiceNumber,
  commercialInvoiceTotals,
  commercialInvoicesCsv,
  gainsMonthSteps,
  isValidIban,
  lastDayOfMonth,
  maskIban,
  payoutDate,
  statementDue,
  suggestedInvoicePrefix,
  transfersCsv,
  upcomingTotal,
} from "../src/commercial-billing";

// IBAN d'exemple publié par l'ECBS (fictif).
const IBAN = "FR76 3000 6000 0112 3456 7890 189";

describe("IBAN", () => {
  it("accepte un IBAN valide, avec ou sans espaces", () => {
    expect(isValidIban(IBAN)).toBe(true);
    expect(isValidIban(IBAN.replace(/\s/g, "").toLowerCase())).toBe(true);
  });
  it("refuse une clé fausse ou un format faux", () => {
    expect(isValidIban("FR76 3000 6000 0112 3456 7890 188")).toBe(false);
    expect(isValidIban("1234")).toBe(false);
  });
  it("masque tout sauf le pays et la fin", () => {
    expect(maskIban(IBAN)).toBe("FR76 •••• •••• 0189");
  });
});

describe("numérotation", () => {
  it("préfixe et compteur sur trois chiffres", () => {
    expect(invoiceNumber("SK-2026-", 2)).toBe("SK-2026-002");
    expect(invoiceNumber("SK-2026-", 1234)).toBe("SK-2026-1234");
  });
  it("préfixe proposé : initiales sans accents et année", () => {
    expect(suggestedInvoicePrefix("Sarah Kébir", 2026)).toBe("SK-2026-");
    expect(suggestedInvoicePrefix("", 2027)).toBe("F-2027-");
  });
});

describe("TVA", () => {
  it("franchise : pas de TVA ; assujetti : 20 %", () => {
    expect(commercialInvoiceTotals(68000, "franchise")).toEqual({ ht: 68000, vat: 0, ttc: 68000 });
    expect(commercialInvoiceTotals(68000, "assujetti")).toEqual({
      ht: 68000,
      vat: 13600,
      ttc: 81600,
    });
    expect(commercialInvoiceTotals(333, "assujetti").vat).toBe(67);
  });
});

describe("dates", () => {
  it("dernier jour du mois, février compris", () => {
    expect(lastDayOfMonth("2026-11-25")).toBe("2026-11-30");
    expect(lastDayOfMonth("2028-02-10")).toBe("2028-02-29");
  });
  it("virement : fin de mois avant le 28, sinon sept jours après", () => {
    expect(payoutDate("2026-11-25")).toBe("2026-11-30");
    expect(payoutDate("2026-11-28")).toBe("2026-12-05");
  });
  it("relevé dû à partir du 25", () => {
    expect(statementDue("2026-11-24")).toBe(false);
    expect(statementDue("2026-11-25")).toBe(true);
  });
});

describe("virements", () => {
  it("CSV avec montants en euros et cellules protégées", () => {
    expect(
      transfersCsv([
        { name: "Sarah K.; agent", iban: IBAN, amountCents: 68000, reference: "SK-2026-002" },
      ]),
    ).toBe(
      'Bénéficiaire;IBAN;Montant;Devise;Référence\n"Sarah K.; agent";FR7630006000011234567890189;680,00;EUR;SK-2026-002\n',
    );
  });
});

describe("le mois étape par étape", () => {
  it("avant le relevé : primes comptées, relevé le 25", () => {
    const steps = gainsMonthSteps({
      today: "2026-11-20",
      monthCents: 68000,
      statementOn: null,
      invoiceOn: null,
      paidOn: null,
    });
    expect(steps.map((s) => s.state)).toEqual(["fait", "next", "todo", "todo"]);
    expect(steps[1]?.date).toBe("2026-11-25");
    expect(steps[2]?.date).toBe("2026-11-28");
    expect(steps[3]?.date).toBe("2026-11-30");
  });
  it("facture reçue le 28 : virement sept jours après", () => {
    const steps = gainsMonthSteps({
      today: "2026-11-28",
      monthCents: 68000,
      statementOn: "2026-11-25",
      invoiceOn: "2026-11-28",
      paidOn: null,
    });
    expect(steps.map((s) => s.state)).toEqual(["fait", "fait", "fait", "next"]);
    expect(steps[3]?.date).toBe("2026-12-05");
  });
  it("rien ce mois : tout reste à venir", () => {
    const steps = gainsMonthSteps({
      today: "2026-11-03",
      monthCents: 0,
      statementOn: null,
      invoiceOn: null,
      paidOn: null,
    });
    expect(steps.map((s) => s.state)).toEqual(["next", "todo", "todo", "todo"]);
  });
  it("relevé reçu, facture pas encore émise le 28 : virement sept jours après", () => {
    const steps = gainsMonthSteps({
      today: "2026-11-28",
      monthCents: 68000,
      statementOn: "2026-11-25",
      invoiceOn: null,
      paidOn: null,
    });
    expect(steps[3]?.date).toBe("2026-12-05");
  });
});

describe("à venir et comptable", () => {
  it("total des primes possibles", () => {
    expect(upcomingTotal([{ centimes: 11000 }, { centimes: null }, { centimes: 3000 }])).toBe(
      14000,
    );
  });
  it("CSV du comptable : TVA vide pour une facture déposée", () => {
    expect(
      commercialInvoicesCsv([
        {
          commercial: "Inès M.",
          number: null,
          issuedOn: "2026-11-26",
          htCents: 112000,
          vatCents: null,
          ttcCents: null,
          paidOn: null,
          reference: null,
        },
      ]),
    ).toBe(
      "Conseiller;Numéro;Date;Montant HT;TVA;Montant TTC;Payée le;Référence du virement\nInès M.;;2026-11-26;1120,00;;;;\n",
    );
  });
});
