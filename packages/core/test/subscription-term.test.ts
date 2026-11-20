import { describe, expect, it } from "vitest";
import {
  CANCEL_NOTICE_MONTHS,
  TERM_PERIOD_MONTHS,
  RENEWAL_REMINDER_DAYS,
  addEngagementDays,
  addEngagementMonths,
  cancellationPlan,
  engagementDates,
  parisDay,
  parisMidnight,
  subscriptionTermSummary,
  trialEndAfterGoLive,
} from "../src/subscription-term";

describe("engagement de 12 mois (F-184)", () => {
  it("décisions du 20 novembre 2026 : 12 mois, préavis de 3 mois, rappel 30 jours avant", () => {
    expect(TERM_PERIOD_MONTHS).toBe(12);
    expect(CANCEL_NOTICE_MONTHS).toBe(3);
    expect(RENEWAL_REMINDER_DAYS).toBe(30);
  });

  it("dates civiles : jours et mois, fin de mois ramenée au dernier jour", () => {
    expect(addEngagementDays("2027-03-15", -1)).toBe("2027-03-14");
    expect(addEngagementDays("2027-12-31", 1)).toBe("2028-01-01");
    expect(addEngagementMonths("2027-03-15", 12)).toBe("2028-03-15");
    expect(addEngagementMonths("2028-03-15", -3)).toBe("2027-12-15");
    expect(addEngagementMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addEngagementMonths("2028-02-29", 12)).toBe("2029-02-28");
  });

  it("jour civil à Paris, y compris tard le soir en heure d'hiver et d'été", () => {
    expect(parisDay("2027-03-14T23:30:00Z")).toBe("2027-03-15");
    expect(parisDay("2027-07-14T21:59:00Z")).toBe("2027-07-14");
    expect(parisDay("2027-07-14T22:01:00Z")).toBe("2027-07-15");
  });

  it("l'essai démarre à la mise en ligne : 60 jours après", () => {
    expect(trialEndAfterGoLive(new Date("2027-01-14T09:00:00Z")).toISOString()).toBe(
      "2027-03-15T09:00:00.000Z",
    );
  });

  it("première année : échéance, dernier jour, date limite d'arrêt et rappel", () => {
    expect(engagementDates("2027-03-15", "2027-09-01")).toEqual({
      start: "2027-03-15",
      renewal: "2028-03-15",
      lastDay: "2028-03-14",
      cancelDeadline: "2027-12-14",
      reminderDay: "2027-11-14",
    });
  });

  it("années suivantes : la période en cours avance de 12 mois en 12 mois", () => {
    expect(engagementDates("2027-03-15", "2028-03-14").start).toBe("2027-03-15");
    expect(engagementDates("2027-03-15", "2028-03-15")).toMatchObject({
      start: "2028-03-15",
      renewal: "2029-03-15",
      cancelDeadline: "2028-12-14",
    });
    expect(engagementDates("2027-03-15", "2030-06-01").start).toBe("2030-03-15");
  });

  it("échéances comptées depuis le premier paiement, sans dérive d'un 29 février", () => {
    expect(engagementDates("2028-02-29", "2031-06-01").renewal).toBe("2032-02-29");
    expect(engagementDates("2028-02-29", "2028-06-01").renewal).toBe("2029-02-28");
  });

  it("minuit à Paris, en heure d'hiver et d'été", () => {
    expect(parisMidnight("2028-03-15").toISOString()).toBe("2028-03-14T23:00:00.000Z");
    expect(parisMidnight("2028-07-15").toISOString()).toBe("2028-07-14T22:00:00.000Z");
  });

  it("avant le premier paiement, la période affichée est la première", () => {
    expect(engagementDates("2027-03-15", "2027-01-20").start).toBe("2027-03-15");
  });

  it("pendant l'essai : arrêt immédiat, sans frais", () => {
    expect(
      cancellationPlan({ engaged: true, firstPaymentDay: "2027-03-15", today: "2027-03-14" }),
    ).toEqual({ kind: "trial" });
  });

  it("pendant l'année, avant la date limite : arrêt à l'échéance", () => {
    expect(
      cancellationPlan({ engaged: true, firstPaymentDay: "2027-03-15", today: "2027-12-14" }),
    ).toEqual({ kind: "renewal", cancelAt: "2028-03-15", lastDay: "2028-03-14", late: false });
  });

  it("après la date limite : arrêt à l'échéance suivante", () => {
    expect(
      cancellationPlan({ engaged: true, firstPaymentDay: "2027-03-15", today: "2027-12-15" }),
    ).toEqual({ kind: "renewal", cancelAt: "2029-03-15", lastDay: "2029-03-14", late: true });
  });

  it("abonnement souscrit avant l'engagement : arrêt à la fin de la période payée", () => {
    expect(
      cancellationPlan({ engaged: false, firstPaymentDay: "2027-03-15", today: "2027-05-02" }),
    ).toEqual({ kind: "periodEnd" });
    expect(
      cancellationPlan({ engaged: false, firstPaymentDay: "2027-03-15", today: "2027-03-01" }),
    ).toEqual({ kind: "trial" });
  });

  it("date du premier paiement inconnue (essai pas encore démarré) : arrêt immédiat", () => {
    expect(cancellationPlan({ engaged: true, firstPaymentDay: null, today: "2027-03-01" })).toEqual(
      { kind: "trial" },
    );
  });
});

describe("case d'engagement (F-184)", () => {
  it("le texte conservé est celui affiché, avec sa version", async () => {
    const m = await import("../src/subscription-term");
    expect(m.TERM_CHECKBOX_TEXT).toBe(
      "Je m'engage pour douze mois à compter de mon premier paiement, à la fin de mon essai gratuit de deux mois. Je peux renoncer sans frais à tout moment pendant l'essai.",
    );
    expect(m.TERM_TEXT_VERSION).toBe("2026-11-20");
  });
});

describe("« Ma formule » : les dates qui comptent (F-184)", () => {
  const base = {
    engaged: true,
    status: "trialing",
    trialEnd: "2027-03-15T08:00:00Z",
    goLiveAt: "2027-01-14T08:00:00Z",
    stopLastDay: null,
    today: "2027-02-01",
  } as const;

  it("fiche pas encore en ligne : l'essai attend la mise en ligne", () => {
    expect(subscriptionTermSummary({ ...base, goLiveAt: null })).toEqual({
      phase: "awaitingGoLive",
    });
  });

  it("pendant l'essai : premier paiement, engagement et date pour renoncer sans frais", () => {
    expect(subscriptionTermSummary(base)).toEqual({
      phase: "trial",
      trialLastDay: "2027-03-14",
      firstPaymentDay: "2027-03-15",
      termLastDay: "2028-03-14",
    });
  });

  it("pendant l'année : fin de l'engagement, renouvellement et date limite d'arrêt", () => {
    expect(subscriptionTermSummary({ ...base, status: "active", today: "2027-09-15" })).toEqual({
      phase: "engaged",
      termLastDay: "2028-03-14",
      renewal: "2028-03-15",
      cancelDeadline: "2027-12-14",
    });
  });

  it("arrêt demandé : le dernier jour couvert", () => {
    expect(
      subscriptionTermSummary({ ...base, status: "active", stopLastDay: "2028-03-14" }),
    ).toEqual({ phase: "stopping", stopLastDay: "2028-03-14" });
  });

  it("abonnement souscrit avant l'engagement : affichage d'avant", () => {
    expect(subscriptionTermSummary({ ...base, engaged: false })).toEqual({ phase: "legacy" });
  });

  it("abonnement terminé ou incomplet : rien à afficher de l'engagement", () => {
    expect(subscriptionTermSummary({ ...base, status: "canceled" })).toEqual({ phase: "legacy" });
  });
});
