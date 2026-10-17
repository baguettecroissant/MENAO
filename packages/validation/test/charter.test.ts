import { CHARTER_RULES } from "@menao/core";
import { describe, expect, it } from "vitest";
import { charterAcceptanceSchema } from "../src/charter";
import { messages } from "../src/messages";

// Données fictives : SIRET inexistant dans Sirene (vérifié : 404).
const valide = {
  version: "V5",
  rules: CHARTER_RULES.map((r) => r.code),
  name: " Alex Exemple ",
  company: "Exemple Électricité",
  siret: "000 000 018 00010",
  signature: "M 10 10 L 200 80 L 400 40",
  agree: true,
  engagementVersion: "B1",
  engagement: true,
};

describe("charterAcceptanceSchema", () => {
  it("accepte une signature complète et normalise nom et SIRET", () => {
    const r = charterAcceptanceSchema.parse(valide);
    expect(r.name).toBe("Alex Exemple");
    expect(r.siret).toBe("00000001800010");
  });

  it("refuse s'il manque une règle", () => {
    const r = charterAcceptanceSchema.safeParse({ ...valide, rules: valide.rules.slice(1) });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe(messages.charterRules);
  });

  it("refuse une version périmée, un SIRET faux, un tracé vide ou sans accord", () => {
    for (const [champ, valeur, message] of [
      ["version", "V4", messages.charterOutdated],
      ["siret", "12345678901234", messages.charterSiret],
      ["signature", "", messages.charterSignature],
      ["signature", "<script>", messages.charterSignature],
      ["agree", false, messages.charterAgree],
      ["engagement", false, messages.engagementAgree],
      ["engagementVersion", "B0", messages.charterOutdated],
      ["name", " ", messages.charterName],
    ] as const) {
      const r = charterAcceptanceSchema.safeParse({ ...valide, [champ]: valeur });
      expect(r.success, champ).toBe(false);
      expect(r.error?.issues.map((i) => i.message)).toContain(message);
    }
  });
});
