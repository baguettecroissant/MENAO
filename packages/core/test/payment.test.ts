import { Constants } from "@menao/db";
import { describe, expect, it } from "vitest";
import { PAYMENT_KINDS, PAYMENT_STATUSES, paymentStatusFromCheckout } from "../src/payment";

describe("paiements des chantiers (F-31)", () => {
  it("paiement immédiat (carte) : payé dès la fin du Checkout", () => {
    expect(paymentStatusFromCheckout("checkout.session.completed", "paid")).toBe("paye");
  });

  it("paiement différé (virement) : en cours, puis payé ou échoué", () => {
    expect(paymentStatusFromCheckout("checkout.session.completed", "unpaid")).toBe("en_cours");
    expect(paymentStatusFromCheckout("checkout.session.async_payment_succeeded", "paid")).toBe(
      "paye",
    );
    expect(paymentStatusFromCheckout("checkout.session.async_payment_failed", "unpaid")).toBe(
      "echoue",
    );
  });

  it("session expirée : annulé ; autres événements ignorés", () => {
    expect(paymentStatusFromCheckout("checkout.session.expired", "unpaid")).toBe("annule");
    expect(
      paymentStatusFromCheckout("checkout.session.completed", "no_payment_required"),
    ).toBeNull();
    expect(paymentStatusFromCheckout("payment_intent.created", "paid")).toBeNull();
  });

  it("types et états identiques aux énumérations de la base", () => {
    expect([...PAYMENT_KINDS]).toEqual(Constants.public.Enums.payment_kind);
    expect([...PAYMENT_STATUSES]).toEqual(Constants.public.Enums.payment_status);
  });
});

describe("encaissé ce mois (tableau de bord F-16)", () => {
  it("additionne les paiements reçus pendant le mois en cours, heure de Paris", async () => {
    const { collectedThisMonth } = await import("../src/payment");
    const now = new Date("2026-10-11T12:00:00Z");
    expect(
      collectedThisMonth(
        [
          { amountCents: 14580, paidAt: "2026-10-11T09:00:00Z" },
          { amountCents: 30000, paidAt: "2026-10-01T00:30:00+02:00" },
          // 30 septembre 23 h 30 à Paris : mois précédent.
          { amountCents: 99900, paidAt: "2026-09-30T21:30:00Z" },
          { amountCents: 5000, paidAt: null },
        ],
        now,
      ),
    ).toBe(44580);
    expect(collectedThisMonth([], now)).toBe(0);
  });
});
