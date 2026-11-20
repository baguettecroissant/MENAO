import { describe, expect, it } from "vitest";
import { stopView, termView, type TermSubscription } from "./subscription-term-view";

// Fin d'essai à minuit, heure de Paris : premier prélèvement le 15 mars 2027.
const TRIAL_END = "2027-03-14T23:00:00Z";
const base: TermSubscription = {
  status: "trialing",
  trial_end: TRIAL_END,
  current_period_end: TRIAL_END,
  cancel_at_period_end: false,
  cancel_at: null,
  engagement_version: "2026-11-20",
  essai_demarre_le: "2027-01-13T09:00:00Z",
  arret_effet_le: null,
};

describe("termView", () => {
  it("avant la mise en ligne : l'essai n'a pas commencé, pas de date provisoire", () => {
    const view = termView({ ...base, essai_demarre_le: null }, "2026-12-01");
    expect(view.state).toBe("Essai gratuit : il démarre à la mise en ligne de votre fiche");
    expect(view.rows).toEqual([["Engagement", "12 mois à partir du premier paiement"]]);
    expect(view.canStop).toBe(true);
  });

  it("pendant l'essai : premier prélèvement, engagement et date pour renoncer", () => {
    const view = termView(base, "2027-02-01");
    expect(view.state).toBe("Essai gratuit jusqu'au 14 mars 2027");
    expect(view.rows).toEqual([
      ["Premier prélèvement", "15 mars 2027"],
      ["Engagement", "du 15 mars 2027 au 14 mars 2028"],
      ["Pour renoncer sans frais", "avant le 15 mars 2027"],
    ]);
  });

  it("pendant l'année : échéance, renouvellement et date limite d'arrêt", () => {
    const view = termView({ ...base, status: "active" }, "2027-09-01");
    expect(view.state).toBe("En cours");
    expect(view.rows).toEqual([
      ["Engagement", "jusqu'au 14 mars 2028"],
      ["Renouvellement", "le 15 mars 2028, pour un an"],
      ["Pour arrêter à l'échéance", "au plus tard le 14 décembre 2027"],
    ]);
    expect(view.canStop).toBe(true);
  });

  it("arrêt demandé : la date de fin, plus de bouton", () => {
    const view = termView(
      { ...base, status: "active", arret_effet_le: "2028-03-14" },
      "2027-09-01",
    );
    expect(view.state).toBe("Se termine le 14 mars 2028");
    expect(view.rows).toEqual([["Fin de l'abonnement", "le 14 mars 2028, à votre demande"]]);
    expect(view.canStop).toBe(false);
  });

  it("abonnement d'avant l'engagement : aucune date d'engagement", () => {
    const view = termView({ ...base, status: "active", engagement_version: null }, "2027-09-01");
    expect(view.rows).toEqual([]);
    expect(view.state).toBe("En cours");
  });
});

describe("stopView", () => {
  it("pendant l'essai : renoncer sans frais", () => {
    const view = stopView(base, "2027-02-01");
    expect(view).toMatchObject({ kind: "trial", confirm: "Renoncer sans frais" });
    if (view.kind === "trial") expect(view.rows[0]).toEqual(["À payer", "0 €"]);
  });

  it("pendant l'année : arrêt à l'échéance, date limite en vue", () => {
    const view = stopView({ ...base, status: "active" }, "2027-09-01");
    expect(view).toMatchObject({
      kind: "renewal",
      option: "Arrêter à l'échéance",
      confirm: "Confirmer : arrêt le 14 mars 2028",
      noExitTitle: "Pas d'arrêt avant le 14 mars 2028",
    });
  });

  it("déjà demandé, ou rien à arrêter", () => {
    expect(
      stopView({ ...base, status: "active", arret_effet_le: "2028-03-14" }, "2027-09-01"),
    ).toEqual({
      kind: "requested",
      text: "Votre demande d'arrêt est enregistrée : votre abonnement prend fin le 14 mars 2028.",
    });
    expect(stopView({ ...base, status: "canceled" }, "2027-09-01")).toEqual({ kind: "closed" });
    expect(stopView(null, "2027-09-01")).toEqual({ kind: "closed" });
  });
});
