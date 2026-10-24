import { describe, expect, it } from "vitest";
import {
  appendDescription,
  normalizePhotoDescription,
  photoDescriptionJsonSchema,
} from "../src/need-photo";

describe("photo → description (ADR 0180)", () => {
  it("schéma : description et lisibilité obligatoires, rien d'autre", () => {
    const schema = photoDescriptionJsonSchema();
    expect(schema.required).toEqual(["description", "lisible"]);
    expect(schema.additionalProperties).toBe(false);
  });

  it("phrase nettoyée : majuscule, point final, espaces réduits", () => {
    expect(
      normalizePhotoDescription({
        description: "  mon évier fuit sous le siphon,   il faudrait le réparer ",
        lisible: true,
      }),
    ).toBe("Mon évier fuit sous le siphon, il faudrait le réparer.");
  });

  it("rien si la photo est illisible, hors sujet, chiffrée ou trop longue", () => {
    expect(normalizePhotoDescription({ description: "Une fissure.", lisible: false })).toBeNull();
    expect(normalizePhotoDescription({ description: null, lisible: true })).toBeNull();
    expect(normalizePhotoDescription({ description: "null", lisible: true })).toBeNull();
    expect(
      normalizePhotoDescription({
        description: "Une salle de bain de 6 m² à refaire.",
        lisible: true,
      }),
    ).toBeNull();
    expect(normalizePhotoDescription({ description: "a".repeat(300), lisible: true })).toBeNull();
  });

  it("ajout au texte déjà saisi, en nouvelle phrase", () => {
    expect(appendDescription("", "Mon évier fuit.")).toBe("Mon évier fuit.");
    expect(appendDescription("Fuite urgente", "Mon évier fuit.")).toBe(
      "Fuite urgente. Mon évier fuit.",
    );
    expect(appendDescription("Fuite urgente !  ", "Mon évier fuit.")).toBe(
      "Fuite urgente ! Mon évier fuit.",
    );
  });
});
