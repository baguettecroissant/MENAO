import { describe, expect, it } from "vitest";
import {
  artisanVisibility,
  connectAccountFromStripe,
  connectAccountStatus,
  connectRequirementGroups,
} from "../src/connect";

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
      requirementsDue: [],
      requirementsPending: [],
      disabledReason: null,
      requirementsDeadline: null,
    });
  });

  it("informations encore demandées par Stripe : en retard et à fournir, puis en cours de vérification", () => {
    const snapshot = connectAccountFromStripe({
      ...account,
      charges_enabled: false,
      requirements: {
        past_due: ["external_account"],
        currently_due: ["external_account", "individual.verification.document"],
        pending_verification: ["individual.dob.day"],
        disabled_reason: "requirements.past_due",
        current_deadline: 1793750400,
      },
    });
    expect(snapshot).toMatchObject({
      requirementsDue: ["external_account", "individual.verification.document"],
      requirementsPending: ["individual.dob.day"],
      disabledReason: "requirements.past_due",
      requirementsDeadline: "2026-11-04T00:00:00.000Z",
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

describe("informations demandées par Stripe, en clair (F-14)", () => {
  it("regroupe les champs Stripe en rubriques compréhensibles, sans doublon, dans un ordre stable", () => {
    expect(
      connectRequirementGroups([
        "individual.verification.document",
        "external_account",
        "individual.address.line1",
        "individual.dob.day",
        "business_profile.url",
        "tos_acceptance.date",
        "company.verification.document",
        "company.tax_id",
        "person_1AbC.verification.document",
        "owners.first_name",
        "external_account",
        "something.unknown",
      ]),
    ).toEqual([
      "banque",
      "identite",
      "representant",
      "adresse",
      "entreprise",
      "justificatif_entreprise",
      "personnes",
      "activite",
      "conditions",
      "autre",
    ]);
    expect(connectRequirementGroups([])).toEqual([]);
  });

  it("statut du compte : à démarrer, actif, à compléter, en vérification, refusé", () => {
    const base = {
      hasAccount: true,
      chargesEnabled: false,
      detailsSubmitted: false,
      requirementsDue: [] as string[],
      requirementsPending: [] as string[],
      disabledReason: null as string | null,
    };
    expect(connectAccountStatus({ ...base, hasAccount: false })).toBe("a_demarrer");
    expect(connectAccountStatus({ ...base, chargesEnabled: true })).toBe("actif");
    expect(connectAccountStatus({ ...base, requirementsDue: ["external_account"] })).toBe(
      "a_completer",
    );
    expect(connectAccountStatus({ ...base, requirementsPending: ["individual.dob.day"] })).toBe(
      "verification",
    );
    expect(connectAccountStatus({ ...base, detailsSubmitted: true })).toBe("verification");
    expect(connectAccountStatus({ ...base, disabledReason: "under_review" })).toBe("verification");
    expect(connectAccountStatus({ ...base, disabledReason: "rejected.fraud" })).toBe("refuse");
    // Compte créé, rien encore transmis : reprendre l'inscription chez Stripe.
    expect(connectAccountStatus(base)).toBe("a_completer");
  });
});
