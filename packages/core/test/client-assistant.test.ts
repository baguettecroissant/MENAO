import { describe, expect, it } from "vitest";
import {
  CLIENT_DRAFT_MAX_LENGTH,
  clientAssistantJsonSchema,
  normalizeClientDraft,
} from "../src/client-assistant";

const trades = ["plombier", "couvreur"];
const description = "J'ai une tache d'humidité au plafond de ma chambre, sous la toiture, à Nice.";

describe("assistant des particuliers (ADR 0220)", () => {
  it("schéma : réponse, indicateurs, relances et demande préparée obligatoires", () => {
    const schema = clientAssistantJsonSchema();
    expect(schema.required).toEqual([
      "reponse",
      "sans_reponse",
      "hors_sujet",
      "suggestions",
      "demande",
    ]);
    expect(schema.properties.demande.additionalProperties).toBe(false);
  });

  it("demande préparée : seulement si elle est prête et assez détaillée", () => {
    expect(normalizeClientDraft({ prete: false, description, metier: "couvreur" }, trades)).toBe(
      null,
    );
    expect(normalizeClientDraft({ prete: true, description: null, metier: null }, trades)).toBe(
      null,
    );
    expect(normalizeClientDraft({ prete: true, description: "Fuite.", metier: null }, trades)).toBe(
      null,
    );
    expect(
      normalizeClientDraft(
        { prete: true, description: `  ${description}  `, metier: "couvreur" },
        trades,
      ),
    ).toEqual({ description, trade: "couvreur" });
  });

  it("métier inconnu écarté, description trop longue coupée à la fin d'une phrase", () => {
    const long = "Une phrase de description assez détaillée. ".repeat(30);
    const draft = normalizeClientDraft(
      { prete: true, description: long, metier: "astronaute" },
      trades,
    );
    expect(draft?.trade).toBeNull();
    expect(draft?.description.length).toBeLessThanOrEqual(CLIENT_DRAFT_MAX_LENGTH);
    expect(draft?.description.endsWith(".")).toBe(true);
  });
});
