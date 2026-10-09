import { describe, expect, it } from "vitest";
import { SIGNUP_REQUIRED_DOCUMENTS, LEGAL_DOCUMENT_VERSIONS } from "../src/legal";

describe("documents légaux", () => {
  it("l'inscription exige CGU et politique de confidentialité (F-08)", () => {
    expect(SIGNUP_REQUIRED_DOCUMENTS).toEqual(["cgu", "confidentialite"]);
  });

  it("chaque document requis a une version", () => {
    for (const doc of SIGNUP_REQUIRED_DOCUMENTS) {
      expect(LEGAL_DOCUMENT_VERSIONS[doc]).toMatch(/^\d{4}-\d{2}-\d{2}/);
    }
  });
});
