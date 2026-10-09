import { describe, expect, it } from "vitest";
import { artisanVisibility, connectAccountFromStripe } from "../src/connect";

describe("visibilité de l'artisan (F-14)", () => {
  const ok = { status: "valide" as const, subscriptionActive: true, connectChargesEnabled: true };

  it("visible si validé, abonné et compte de paiement actif", () => {
    expect(artisanVisibility(ok)).toEqual({ visible: true, missing: [] });
  });

  it("liste ce qui manque", () => {
    expect(
      artisanVisibility({
        status: "en_verification",
        subscriptionActive: false,
        connectChargesEnabled: false,
      }),
    ).toEqual({
      visible: false,
      missing: ["validation", "abonnement", "paiements"],
    });
    expect(artisanVisibility({ ...ok, status: "suspendu" }).missing).toEqual(["validation"]);
  });
});

describe("connectAccountFromStripe", () => {
  const account = {
    id: "acct_123",
    object: "account",
    charges_enabled: true,
    payouts_enabled: false,
    details_submitted: true,
    metadata: { artisan_id: "11111111-1111-4111-8111-111111111111" },
  };

  it("lit l'état du compte connecté", () => {
    expect(connectAccountFromStripe(account)).toEqual({
      stripeAccountId: "acct_123",
      chargesEnabled: true,
      payoutsEnabled: false,
      detailsSubmitted: true,
      artisanId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("valeurs absentes = faux ; objet inexploitable = null", () => {
    expect(connectAccountFromStripe({ id: "acct_1", object: "account" })).toMatchObject({
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      artisanId: null,
    });
    expect(connectAccountFromStripe({ id: "sub_1", object: "subscription" })).toBeNull();
    expect(connectAccountFromStripe(null)).toBeNull();
  });
});
