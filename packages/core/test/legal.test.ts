import { describe, expect, it } from "vitest";
import {
  ARTISAN_SIGNUP_REQUIRED_DOCUMENTS,
  LEGAL_DOCUMENT_VERSIONS,
  SIGNUP_REQUIRED_DOCUMENTS,
} from "../src/legal";

describe("documents légaux", () => {
  it("l'inscription exige CGU et politique de confidentialité (F-08)", () => {
    expect(SIGNUP_REQUIRED_DOCUMENTS).toEqual(["cgu", "confidentialite"]);
  });

  it("l'inscription artisan exige en plus les CGV artisans", () => {
    expect(ARTISAN_SIGNUP_REQUIRED_DOCUMENTS).toEqual(["cgu", "confidentialite", "cgv_artisan"]);
  });

  it("chaque document requis a une version", () => {
    for (const doc of ARTISAN_SIGNUP_REQUIRED_DOCUMENTS) {
      expect(LEGAL_DOCUMENT_VERSIONS[doc]).toMatch(/^\d{4}-\d{2}-\d{2}/);
    }
  });
});
