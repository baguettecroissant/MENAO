import { describe, expect, it } from "vitest";
import { testFillable, testFillRowSteps, testFillUntil, TEST_FILL_STEPS } from "../src/test-fill";

describe("comptes d'essai : remplissage (ADR 0392)", () => {
  it("une ligne remplit ses étapes, l'entreprise avec métiers et zone", () => {
    expect(testFillRowSteps("entreprise")).toEqual(["entreprise", "metiers", "zone"]);
    expect(testFillRowSteps("identite")).toEqual(["identite"]);
  });

  it("la formule et les paiements ne se remplissent pas", () => {
    expect(testFillable("formule")).toBe(false);
    expect(testFillable("paiements")).toBe(false);
    expect(testFillable("attestations")).toBe(true);
  });

  it("« Tout remplir » jusqu'aux attestations couvre toutes les étapes, dans l'ordre", () => {
    expect(testFillUntil("attestations")).toEqual([...TEST_FILL_STEPS]);
    expect(testFillUntil("paiements")).toEqual([...TEST_FILL_STEPS]);
    expect(testFillUntil("charte")).toEqual(["entreprise", "metiers", "zone", "charte"]);
  });
});
