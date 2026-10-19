import { describe, expect, it } from "vitest";
import {
  TRIAL_DAYS,
  commissionComparison,
  paidSubscriptionInvoice,
  subscriptionFromStripe,
  subscriptionGrantsAccess,
} from "../src/billing";

describe("abonnement (F-15)", () => {
  it("3 mois offerts : essai de 90 jours", () => {
    expect(TRIAL_DAYS).toBe(90);
  });

  it.each([
    ["trialing", true],
    ["active", true],
    ["past_due", true],
    ["incomplete", false],
    ["incomplete_expired", false],
    ["unpaid", false],
    ["canceled", false],
    ["paused", false],
    [null, false],
  ] as const)("statut %s → accès %s", (status, access) => {
    expect(subscriptionGrantsAccess(status)).toBe(access);
  });
});

describe("subscriptionFromStripe", () => {
  // Abonnement au format de l'API Stripe (fin de période portée par l'élément d'abonnement).
  const sub = {
    id: "sub_123",
    object: "subscription",
    customer: "cus_123",
    status: "trialing",
    cancel_at_period_end: false,
    trial_end: 1_800_000_000,
    metadata: { artisan_id: "11111111-1111-4111-8111-111111111111" },
    items: {
      data: [
        {
          current_period_end: 1_800_000_000,
          price: { id: "price_123", lookup_key: "menao_base_mensuel" },
        },
      ],
    },
  };

  it("lit les champs utiles", () => {
    expect(subscriptionFromStripe(sub)).toEqual({
      stripeSubscriptionId: "sub_123",
      stripeCustomerId: "cus_123",
      status: "trialing",
      lookupKey: "menao_base_mensuel",
      artisanId: "11111111-1111-4111-8111-111111111111",
      currentPeriodEnd: "2027-01-15T08:00:00.000Z",
      trialEnd: "2027-01-15T08:00:00.000Z",
      cancelAtPeriodEnd: false,
      endedAt: null,
    });
  });

  it("date de fin d'un abonnement résilié (résiliations du back-office)", () => {
    expect(
      subscriptionFromStripe({ ...sub, status: "canceled", ended_at: 1_800_000_000 }),
    ).toMatchObject({ status: "canceled", endedAt: "2027-01-15T08:00:00.000Z" });
  });

  it("accepte un client développé et l'ancienne position de la fin de période", () => {
    const old = {
      ...sub,
      customer: { id: "cus_456" },
      current_period_end: 1_700_000_000,
      trial_end: null,
      metadata: {},
      items: { data: [{ price: { lookup_key: "menao_base_mensuel" } }] },
    };
    expect(subscriptionFromStripe(old)).toMatchObject({
      stripeCustomerId: "cus_456",
      currentPeriodEnd: "2023-11-14T22:13:20.000Z",
      trialEnd: null,
      artisanId: null,
    });
  });

  it.each([
    null,
    {},
    { id: "sub_1" },
    { ...sub, object: "invoice" },
    { ...sub, status: "inconnu" },
  ])("objet inexploitable → null (%j)", (input) => {
    expect(subscriptionFromStripe(input)).toBeNull();
  });
});

describe("simulation de la page Espace Pro", () => {
  it("commission d'une plateforme comparée à l'abonnement Base", () => {
    // 8 000 € de chantiers à 15 % : 1 200 € de commission, soit 1 050 € de plus avec 150 € HT.
    expect(
      commissionComparison({
        monthlyRevenueCents: 800_000,
        commissionRateBp: 1_500,
        subscriptionCents: 15_000,
      }),
    ).toEqual({
      commissionCents: 120_000,
      monthlySavingCents: 105_000,
      yearlySavingCents: 1_260_000,
    });
  });

  it("petite activité : la commission peut coûter moins cher (économie négative)", () => {
    expect(
      commissionComparison({
        monthlyRevenueCents: 50_000,
        commissionRateBp: 1_000,
        subscriptionCents: 15_000,
      }),
    ).toEqual({ commissionCents: 5_000, monthlySavingCents: -10_000, yearlySavingCents: -120_000 });
  });
});

describe("paidSubscriptionInvoice (F-59 : premier paiement réel)", () => {
  const invoice = (extra: Record<string, unknown>) => ({
    object: "invoice",
    id: "in_1",
    status: "paid",
    amount_paid: 18000,
    ...extra,
  });

  it("abonnement lu dans parent.subscription_details (API récente)", () => {
    expect(
      paidSubscriptionInvoice(
        invoice({ parent: { subscription_details: { subscription: "sub_123" } } }),
      ),
    ).toEqual({ stripeSubscriptionId: "sub_123", amountPaidCents: 18000 });
  });

  it("ancien champ « subscription » encore accepté", () => {
    expect(paidSubscriptionInvoice(invoice({ subscription: "sub_456" }))).toEqual({
      stripeSubscriptionId: "sub_456",
      amountPaidCents: 18000,
    });
  });

  it("facture à 0 € (essai), non payée, sans abonnement ou mal formée : ignorée", () => {
    expect(paidSubscriptionInvoice(invoice({ subscription: "sub_1", amount_paid: 0 }))).toBeNull();
    expect(paidSubscriptionInvoice(invoice({ subscription: "sub_1", status: "open" }))).toBeNull();
    expect(paidSubscriptionInvoice(invoice({}))).toBeNull();
    expect(paidSubscriptionInvoice({ object: "charge" })).toBeNull();
    expect(paidSubscriptionInvoice(null)).toBeNull();
  });
});
