import { describe, expect, it } from "vitest";
import {
  addMonths,
  commercialReady,
  formationModulePassed,
  gradeQuiz,
  normalizeRsacNumber,
  commercialOnboardingProgress,
  commercialOnboardingSteps,
  urssafStatus,
  type CommercialOnboardingRaw,
} from "../src/commercial-onboarding";

const EMPTY: CommercialOnboardingRaw = {
  contractSignedOn: null,
  rsacNumber: null,
  urssafDepositedOn: null,
  ribDepositedOn: null,
  homeScreenOn: null,
  remindersOn: true,
  modules: {},
  bestTraining: null,
  firstBrief: false,
};
const READY: CommercialOnboardingRaw = {
  ...EMPTY,
  contractSignedOn: "2027-01-02",
  rsacNumber: "2027 AC 00042",
  modules: { menao: 5, parcours: 4, objections: 4, offre: 5, regles: 4 },
  bestTraining: 14,
};

describe("ajout de mois", () => {
  it("garde le jour, ou le ramène au dernier jour du mois", () => {
    expect(addMonths("2027-01-04", 6)).toBe("2027-07-04");
    expect(addMonths("2026-08-31", 6)).toBe("2027-02-28");
    expect(addMonths("2027-11-15", 3)).toBe("2028-02-15");
  });
});

describe("attestation Urssaf", () => {
  it("à déposer tant qu'elle manque", () => {
    expect(urssafStatus(null, "2027-01-04")).toEqual({ state: "manquante", expiresOn: null });
  });
  it("valable 6 mois, à renouveler 15 jours avant, expirée ensuite", () => {
    expect(urssafStatus("2027-01-04", "2027-06-18").state).toBe("valide");
    expect(urssafStatus("2027-01-04", "2027-06-19")).toEqual({
      state: "bientot",
      expiresOn: "2027-07-04",
    });
    expect(urssafStatus("2027-01-04", "2027-07-04").state).toBe("expiree");
  });
});

describe("quiz de formation", () => {
  it("compte les bonnes réponses, une réponse manquante est fausse", () => {
    expect(gradeQuiz([1, 0, 2, 1, 3], [1, 0, 2, 1, 3])).toBe(5);
    expect(gradeQuiz([1, 2], [1, 0, 2, 1, 3])).toBe(1);
  });
  it("réussi à partir de 4 sur 5", () => {
    expect(formationModulePassed(4)).toBe(true);
    expect(formationModulePassed(3)).toBe(false);
    expect(formationModulePassed(undefined)).toBe(false);
  });
});

describe("étapes de « Bien démarrer »", () => {
  it("13 étapes ; les rappels par e-mail comptent faits par défaut", () => {
    const steps = commercialOnboardingSteps(EMPTY, "2027-01-04");
    expect(steps).toHaveLength(13);
    expect(commercialOnboardingProgress(steps)).toEqual({ done: 1, total: 13, next: "contrat" });
  });
  it("un quiz raté garde sa note mais n'est pas fait", () => {
    const steps = commercialOnboardingSteps({ ...EMPTY, modules: { menao: 3 } }, "2027-01-04");
    expect(steps.find((s) => s.key === "module_menao")).toEqual({
      key: "module_menao",
      group: "formation",
      done: false,
      score: 3,
    });
  });
  it("une attestation expirée redevient à faire", () => {
    const steps = commercialOnboardingSteps(
      { ...EMPTY, urssafDepositedOn: "2026-06-01" },
      "2027-01-04",
    );
    expect(steps.find((s) => s.key === "urssaf")?.done).toBe(false);
  });
});

describe("badge « Prêt pour le terrain »", () => {
  it("contrat, RSAC, 5 quiz et simulateur à 14 suffisent", () => {
    expect(commercialReady(READY)).toBe(true);
  });
  it("manque le simulateur ou un quiz : pas encore", () => {
    expect(commercialReady({ ...READY, bestTraining: 13 })).toBe(false);
    expect(commercialReady({ ...READY, modules: { ...READY.modules, regles: 3 } })).toBe(false);
    expect(commercialReady({ ...READY, contractSignedOn: null })).toBe(false);
  });
});

describe("numéro RSAC", () => {
  it("resserre les espaces et refuse un numéro trop court", () => {
    expect(normalizeRsacNumber("  2027   AC 00042 ")).toBe("2027 AC 00042");
    expect(normalizeRsacNumber("12")).toBeNull();
  });
});
