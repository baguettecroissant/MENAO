import { describe, expect, it } from "vitest";
import {
  collectedTotals,
  connectOverviewFromStripe,
  parisMonthStart,
} from "../src/connect-overview";

// Réponses Stripe réduites aux champs lus (API balance, payouts, accounts, balance_transactions).
const balance = {
  object: "balance",
  available: [
    { amount: 145629, currency: "eur" },
    { amount: 900, currency: "usd" },
  ],
  pending: [{ amount: 48543, currency: "eur" }],
};
const payouts = {
  object: "list",
  data: [
    {
      object: "payout",
      amount: 120000,
      currency: "eur",
      arrival_date: 1792800000,
      status: "pending",
    },
    {
      object: "payout",
      amount: 30000,
      currency: "eur",
      arrival_date: 1792540800,
      status: "in_transit",
    },
    { object: "payout", amount: 98000, currency: "eur", arrival_date: 1791936000, status: "paid" },
    { object: "payout", amount: 5000, currency: "usd", arrival_date: 1791936000, status: "paid" },
    {
      object: "payout",
      amount: 12000,
      currency: "eur",
      arrival_date: 1791331200,
      status: "failed",
    },
  ],
};
const account = {
  object: "account",
  id: "acct_123",
  settings: {
    payouts: { schedule: { interval: "weekly", delay_days: 7, weekly_anchor: "monday" } },
  },
  external_accounts: {
    data: [
      {
        object: "bank_account",
        bank_name: "BNP PARIBAS",
        last4: "4321",
        default_for_currency: true,
        currency: "eur",
      },
    ],
  },
};
const transactions = {
  object: "list",
  data: [
    { object: "balance_transaction", fee: 2264, currency: "eur" },
    { object: "balance_transaction", fee: 735, currency: "eur" },
    { object: "balance_transaction", fee: 50, currency: "usd" },
  ],
};

describe("aperçu du compte Stripe de l'artisan (ADR 0152)", () => {
  it("solde, virements, calendrier, banque et frais, en centimes et en euros seulement", () => {
    expect(connectOverviewFromStripe({ balance, payouts, account, transactions })).toEqual({
      availableCents: 145629,
      pendingCents: 48543,
      // Le prochain virement : le plus proche des virements en route.
      nextPayout: { amountCents: 30000, arrivalDate: "2026-10-21", status: "in_transit" },
      recentPayouts: [
        { amountCents: 120000, arrivalDate: "2026-10-24", status: "pending" },
        { amountCents: 30000, arrivalDate: "2026-10-21", status: "in_transit" },
        { amountCents: 98000, arrivalDate: "2026-10-14", status: "paid" },
        { amountCents: 12000, arrivalDate: "2026-10-07", status: "failed" },
      ],
      schedule: { interval: "weekly", delayDays: 7, weeklyAnchor: "monday", monthlyAnchor: null },
      bank: { name: "BNP PARIBAS", last4: "4321" },
      feesThisMonthCents: 2999,
    });
  });

  it("réponses vides ou inattendues : zéros et absences, jamais d'erreur", () => {
    expect(
      connectOverviewFromStripe({
        balance: null,
        payouts: {},
        account: 42,
        transactions: undefined,
      }),
    ).toEqual({
      availableCents: 0,
      pendingCents: 0,
      nextPayout: null,
      recentPayouts: [],
      schedule: null,
      bank: null,
      feesThisMonthCents: 0,
    });
  });

  it("virements manuels et calendrier mensuel", () => {
    const monthly = {
      ...account,
      settings: {
        payouts: { schedule: { interval: "monthly", delay_days: 2, monthly_anchor: 1 } },
      },
      external_accounts: { data: [] },
    };
    const overview = connectOverviewFromStripe({
      balance,
      payouts: { data: [] },
      account: monthly,
      transactions,
    });
    expect(overview.schedule).toEqual({
      interval: "monthly",
      delayDays: 2,
      weeklyAnchor: null,
      monthlyAnchor: 1,
    });
    expect(overview.bank).toBeNull();
    expect(overview.nextPayout).toBeNull();
  });

  it("début du mois à Paris, en secondes Unix (requête des frais du mois)", () => {
    // 20 octobre 2026, 9 h à Paris : le mois commence le 1er octobre à 0 h, heure de Paris (UTC+2).
    expect(parisMonthStart(new Date("2026-10-20T07:00:00Z"))).toBe(
      Date.UTC(2026, 8, 30, 22) / 1000,
    );
    // 1er novembre à 0 h 30 à Paris (UTC+1) : déjà novembre.
    expect(parisMonthStart(new Date("2026-10-31T23:30:00Z"))).toBe(
      Date.UTC(2026, 9, 31, 23) / 1000,
    );
  });

  it("encaissé via MENAO : ce mois et depuis le 1er janvier, heure de Paris", () => {
    const payments = [
      { amountCents: 145629, paidAt: "2026-10-18T10:00:00Z" },
      { amountCents: 48543, paidAt: "2026-10-01T05:00:00Z" },
      { amountCents: 20000, paidAt: "2026-09-30T22:30:00Z" }, // 1er octobre, 0 h 30 à Paris
      { amountCents: 30000, paidAt: "2026-03-02T10:00:00Z" },
      { amountCents: 99999, paidAt: "2025-12-31T10:00:00Z" },
      { amountCents: 777, paidAt: null },
    ];
    expect(collectedTotals(payments, "2026-10-20")).toEqual({
      monthCents: 214172,
      yearCents: 244172,
    });
  });
});
