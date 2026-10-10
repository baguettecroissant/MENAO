import { describe, expect, it } from "vitest";
import { balanceInvoiceVat, depositInvoiceVat, invoiceTotals } from "../src/invoice";

describe("facture d'acompte (F-35)", () => {
  it("un seul taux : 30 % de 330 € TTC à 10 %, soit 90 € HT et 9 € de TVA", () => {
    const vat = depositInvoiceVat(
      [{ rateBp: 1000, baseHtCents: 30000, tvaCents: 3000 }],
      33000,
      9900,
    );
    expect(vat).toEqual([{ rateBp: 1000, baseHtCents: 9000, tvaCents: 900 }]);
    expect(invoiceTotals(vat)).toEqual({
      totalHtCents: 9000,
      totalTvaCents: 900,
      totalTtcCents: 9900,
    });
  });

  it("plusieurs taux : prorata du TTC, somme exacte du montant payé", () => {
    const quote = [
      { rateBp: 1000, baseHtCents: 8333, tvaCents: 833 },
      { rateBp: 2000, baseHtCents: 6, tvaCents: 1 },
    ];
    const vat = depositInvoiceVat(quote, 9173, 2751);
    expect(invoiceTotals(vat).totalTtcCents).toBe(2751);
    // 10 % : ⌊2751 × 9166 ÷ 9173⌋ = 2748 TTC (2498 HT) ; 20 % : le reste, 3 TTC (HT 2,5 arrondi à 3).
    expect(vat[0]).toEqual({ rateBp: 1000, baseHtCents: 2498, tvaCents: 250 });
    expect(vat[1]).toEqual({ rateBp: 2000, baseHtCents: 3, tvaCents: 0 });
  });

  it("franchise en base : TVA nulle, HT = montant payé", () => {
    expect(depositInvoiceVat([{ rateBp: 0, baseHtCents: 3000, tvaCents: 0 }], 3000, 1500)).toEqual([
      { rateBp: 0, baseHtCents: 1500, tvaCents: 0 },
    ]);
  });

  it("très grands montants : calcul exact", () => {
    const vat = depositInvoiceVat(
      [
        { rateBp: 550, baseHtCents: 100_000_000_000, tvaCents: 5_500_000_000 },
        { rateBp: 2000, baseHtCents: 50_000_000_000, tvaCents: 10_000_000_000 },
      ],
      165_500_000_000,
      49_650_000_000,
    );
    expect(invoiceTotals(vat).totalTtcCents).toBe(49_650_000_000);
  });

  it("devis ou paiement nul : aucune ventilation", () => {
    expect(depositInvoiceVat([], 0, 100)).toEqual([]);
    expect(depositInvoiceVat([{ rateBp: 1000, baseHtCents: 100, tvaCents: 10 }], 110, 0)).toEqual(
      [],
    );
  });
});

describe("facture de solde (F-35)", () => {
  it("ventilation du devis moins celle de l'acompte : 330 € − 99 € = 231 € TTC", () => {
    const vat = balanceInvoiceVat(
      [{ rateBp: 1000, baseHtCents: 30000, tvaCents: 3000 }],
      [{ rateBp: 1000, baseHtCents: 9000, tvaCents: 900 }],
    );
    expect(vat).toEqual([{ rateBp: 1000, baseHtCents: 21000, tvaCents: 2100 }]);
    expect(invoiceTotals(vat).totalTtcCents).toBe(23100);
  });

  it("plusieurs taux : le solde TTC vaut exactement le total du devis moins l'acompte", () => {
    const quote = [
      { rateBp: 1000, baseHtCents: 8333, tvaCents: 833 },
      { rateBp: 2000, baseHtCents: 6, tvaCents: 1 },
    ];
    const deposit = depositInvoiceVat(quote, 9173, 2751);
    const vat = balanceInvoiceVat(quote, deposit);
    expect(vat).toEqual([
      { rateBp: 1000, baseHtCents: 5835, tvaCents: 583 },
      { rateBp: 2000, baseHtCents: 3, tvaCents: 1 },
    ]);
    expect(invoiceTotals(vat).totalTtcCents).toBe(9173 - 2751);
  });

  it("sans acompte : la ventilation du devis entière", () => {
    const quote = [{ rateBp: 550, baseHtCents: 10000, tvaCents: 550 }];
    expect(balanceInvoiceVat(quote, [])).toEqual(quote);
  });
});
