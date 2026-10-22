import { Constants } from "@menao/db";
import { describe, expect, it } from "vitest";
import {
  DEPOSIT_ADVICE_MAX_PERCENT,
  depositAboveAdvice,
  PAYMENT_KINDS,
  PAYMENT_STATUSES,
  paymentStatusFromCheckout,
} from "../src/payment";

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

describe("encaissé ce mois et évolution (tableau de bord F-16)", () => {
  it("du 1er à aujourd'hui, comparé à la même période du mois précédent, heure de Paris", async () => {
    const { monthToDateRevenue } = await import("../src/payment");
    const now = new Date("2026-10-11T12:00:00Z");
    expect(
      monthToDateRevenue(
        [
          { amountCents: 14580, paidAt: "2026-10-11T09:00:00Z" },
          { amountCents: 30000, paidAt: "2026-10-01T00:30:00+02:00" },
          // 30 septembre 23 h 30 à Paris : mois précédent, après le 11 : hors comparaison.
          { amountCents: 99900, paidAt: "2026-09-30T21:30:00Z" },
          // 11 septembre, 23 h 59 à Paris : dans la même période.
          { amountCents: 20000, paidAt: "2026-09-11T21:59:00Z" },
          { amountCents: 7000, paidAt: "2026-09-12T08:00:00Z" },
          { amountCents: 5000, paidAt: null },
        ],
        now,
      ),
    ).toEqual({ currentCents: 44580, previousCents: 20000, previousMonth: "2026-09" });
    expect(monthToDateRevenue([], now)).toEqual({
      currentCents: 0,
      previousCents: 0,
      previousMonth: "2026-09",
    });
  });

  it("fin de mois : la période précédente s'arrête au dernier jour du mois précédent ; janvier → décembre", async () => {
    const { monthToDateRevenue } = await import("../src/payment");
    const march31 = new Date("2026-03-31T10:00:00Z");
    expect(
      monthToDateRevenue([{ amountCents: 1000, paidAt: "2026-02-28T15:00:00Z" }], march31),
    ).toEqual({ currentCents: 0, previousCents: 1000, previousMonth: "2026-02" });
    expect(monthToDateRevenue([], new Date("2027-01-05T10:00:00Z")).previousMonth).toBe("2026-12");
  });

  it("évolution : hausse ou baisse en %, stable, ou montant si rien le mois précédent", async () => {
    const { revenueTrend } = await import("../src/payment");
    expect(revenueTrend(11200, 10000)).toEqual({ kind: "hausse", percent: 12 });
    expect(revenueTrend(9200, 10000)).toEqual({ kind: "baisse", percent: 8 });
    expect(revenueTrend(10040, 10000)).toEqual({ kind: "stable", percent: 0 });
    expect(revenueTrend(48600, 0)).toEqual({ kind: "nouveau", deltaCents: 48600 });
    expect(revenueTrend(0, 0)).toBeNull();
    expect(revenueTrend(0, 10000)).toEqual({ kind: "baisse", percent: 100 });
  });
});

describe("conseil sur l'acompte (ADR 0158)", () => {
  it("au-delà de 30 % à la signature : le pourcentage, sinon rien", () => {
    expect(DEPOSIT_ADVICE_MAX_PERCENT).toBe(30);
    expect(
      depositAboveAdvice([
        { percent: 30, trigger: "signature" },
        { percent: 70, trigger: "reception" },
      ]),
    ).toBeNull();
    expect(
      depositAboveAdvice([
        { percent: 40, trigger: "signature" },
        { percent: 60, trigger: "reception" },
      ]),
    ).toBe(40);
    expect(depositAboveAdvice([{ percent: 100, trigger: "reception" }])).toBeNull();
    expect(depositAboveAdvice([])).toBeNull();
  });
});
