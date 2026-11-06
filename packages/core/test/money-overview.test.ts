import { describe, expect, it } from "vitest";
import {
  canRemindNow,
  daysSince,
  moneyMonthLabel,
  openItemLevel,
  openTotalCents,
  parseMoneyOverview,
} from "../src/money-overview";

describe("suivi de l'argent (ADR 0237)", () => {
  it("lecture défensive de my_money_overview", () => {
    const overview = parseMoneyOverview({
      inclus: true,
      mois: {
        mois: "2026-11",
        devis_signes: 2,
        devis_signes_cents: 450000,
        encaisse_cents: 30000,
        depenses_cents: 1200,
        factures: 1,
      },
      mois_precedent: { mois: "2026-10" },
      a_encaisser: [
        {
          chantier_id: "c1",
          chantier: "Salle de bains",
          tranche: "acompte",
          montant_cents: 30000,
          depuis: "2026-10-27T10:00:00Z",
          echec: true,
          derniere_relance: "2026-11-04T09:00:00Z",
          relances: 2,
        },
        {
          chantier_id: "c2",
          chantier: "Cuisine",
          tranche: "solde",
          montant_cents: 70000,
          depuis: null,
        },
        { tranche: "solde" },
      ],
      sans_facture: [
        {
          chantier_id: "c3",
          chantier: "Toiture",
          tranche: "acompte",
          montant_cents: 5000,
          le: "2026-11-05T08:00:00Z",
        },
      ],
    });
    expect(overview?.included).toBe(true);
    expect(overview?.autoReminders).toBe(false);
    expect(overview?.open[0]).toMatchObject({ lastReminder: "2026-11-04T09:00:00Z", reminders: 2 });
    expect(overview?.open[1]).toMatchObject({ lastReminder: null, reminders: 0 });
    expect(overview?.current.collectedCents).toBe(30000);
    expect(overview?.previous).toEqual({
      month: "2026-10",
      signedQuotes: 0,
      signedCents: 0,
      collectedCents: 0,
      expensesCents: 0,
      invoices: 0,
    });
    expect(overview?.open).toHaveLength(2);
    expect(overview?.open[0]).toMatchObject({ kind: "acompte", failed: true });
    expect(overview?.open[1]?.since).toBeNull();
    expect(openTotalCents(overview?.open ?? [])).toBe(100000);
    expect(overview?.withoutInvoice[0]?.paidAt).toBe("2026-11-05T08:00:00Z");
    expect(parseMoneyOverview(null)).toBeNull();
  });

  it("ancienneté et paliers J+7, J+30", () => {
    const now = new Date("2026-11-06T12:00:00Z");
    expect(daysSince("2026-11-06T08:00:00Z", now)).toBe(0);
    expect(daysSince("2026-10-27T12:00:00Z", now)).toBe(10);
    expect(daysSince(null, now)).toBeNull();
    expect(openItemLevel(3)).toBe("recent");
    expect(openItemLevel(7)).toBe("a_relancer");
    expect(openItemLevel(29)).toBe("a_relancer");
    expect(openItemLevel(30)).toBe("en_retard");
    expect(openItemLevel(null)).toBe("recent");
  });

  it("nom du mois", () => {
    expect(moneyMonthLabel("2026-11")).toBe("novembre");
    expect(moneyMonthLabel("2026-01", true)).toBe("janvier 2026");
    expect(moneyMonthLabel("x")).toBe("");
  });

  it("relance possible tous les 3 jours", () => {
    const now = new Date("2026-11-06T12:00:00Z");
    expect(canRemindNow(null, now)).toBe(true);
    expect(canRemindNow("2026-11-04T12:00:00Z", now)).toBe(false);
    expect(canRemindNow("2026-11-03T12:00:00Z", now)).toBe(true);
  });
});
