import { describe, expect, it } from "vitest";
import { parseReferenceKind, referenceCode } from "../src/reference";

describe("listes de référence (F-57)", () => {
  it("code tiré du libellé : minuscules, sans accents, mots reliés par des tirets", () => {
    expect(referenceCode("Électricien")).toBe("electricien");
    expect(referenceCode("Pose de parquet")).toBe("pose-de-parquet");
    expect(referenceCode("Salle d'eau")).toBe("salle-d-eau");
    expect(referenceCode("  Cœur de métier  ")).toBe("coeur-de-metier");
    expect(referenceCode("Façade & ravalement")).toBe("facade-ravalement");
  });

  it("au plus 60 caractères, sans tiret final ; vide sans lettre ni chiffre", () => {
    const code = referenceCode(`${"a".repeat(59)} b`);
    expect(code).toBe("a".repeat(59));
    expect(
      referenceCode("Isolation des combles perdus et rampants par soufflage de laine minérale")
        .length,
    ).toBeLessThanOrEqual(60);
    expect(referenceCode("!!!")).toBe("");
  });

  it("liste lue dans un formulaire", () => {
    expect(parseReferenceKind("metier")).toBe("metier");
    expect(parseReferenceKind("piece")).toBe("piece");
    expect(parseReferenceKind("plan")).toBeNull();
    expect(parseReferenceKind(undefined)).toBeNull();
  });
});
