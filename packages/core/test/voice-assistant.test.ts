import { describe, expect, it } from "vitest";
import {
  VOICE_TOOLS,
  parseVoiceToolCalls,
  sameSecret,
  spokenEmail,
  spokenPhoneToE164,
  voiceCallSeconds,
  voiceText,
  voiceToolDefinitions,
} from "../src/voice-assistant";

describe("secrétaire vocale (ADR 0225)", () => {
  it("un outil défini par nom attendu", () => {
    expect(voiceToolDefinitions().map((t) => t.name)).toEqual([...VOICE_TOOLS]);
  });

  it("appels d'outils de Vapi : arguments en objet ou en texte JSON, le reste ignoré", () => {
    expect(
      parseVoiceToolCalls({
        type: "tool-calls",
        toolCallList: [
          {
            id: "a",
            type: "function",
            function: { name: "demander_rappel", arguments: { prenom: "Jean" } },
          },
          {
            id: "b",
            function: { name: "envoyer_lien_inscription", arguments: '{"email":"a@b.fr"}' },
          },
          { id: "c", function: { name: "envoyer_etat_dossier", arguments: "pas du JSON" } },
          { function: { name: "sans_id" } },
          null,
        ],
      }),
    ).toEqual([
      { id: "a", name: "demander_rappel", args: { prenom: "Jean" } },
      { id: "b", name: "envoyer_lien_inscription", args: { email: "a@b.fr" } },
      { id: "c", name: "envoyer_etat_dossier", args: {} },
    ]);
    expect(parseVoiceToolCalls(null)).toEqual([]);
    expect(parseVoiceToolCalls({ toolCallList: "x" })).toEqual([]);
  });

  it("texte nettoyé et borné", () => {
    expect(voiceText("  demain   matin ")).toBe("demain matin");
    expect(voiceText("a".repeat(300), 10)).toBe("a".repeat(10));
    expect(voiceText("  ")).toBeNull();
    expect(voiceText(12)).toBeNull();
  });

  it.each([
    ["06 12 34 56 78", "+33612345678"],
    ["0612345678", "+33612345678"],
    ["+33 6 12 34 56 78", "+33612345678"],
    ["0033612345678", "+33612345678"],
    ["33612345678", "+33612345678"],
    ["04.93.12.34.56", "+33493123456"],
    ["+41 79 123 45 67", "+41791234567"],
  ])("numéro dicté « %s » → %s", (spoken, e164) => {
    expect(spokenPhoneToE164(spoken)).toBe(e164);
  });

  it.each(["123", "06 12", "0012345", "", "abc"])("numéro invalide « %s »", (spoken) => {
    expect(spokenPhoneToE164(spoken)).toBeNull();
  });

  it("adresse dictée", () => {
    expect(spokenEmail(" Jean.Dupont@Gmail.com ")).toBe("jean.dupont@gmail.com");
    expect(spokenEmail("jean dupont arobase gmail point com")).toBe("jeandupont@gmail.com");
    expect(spokenEmail("matthieu@orange.fr")).toBe("matthieu@orange.fr");
    expect(spokenEmail("jean at free point fr")).toBe("jean@free.fr");
    expect(spokenEmail("jean.dupont")).toBeNull();
    expect(spokenEmail(null)).toBeNull();
  });

  it("durée d'un appel terminé", () => {
    expect(voiceCallSeconds({ durationSeconds: 100.04 })).toBe(100);
    expect(
      voiceCallSeconds({
        call: { startedAt: "2026-11-05T14:52:00Z", endedAt: "2026-11-05T14:53:40Z" },
      }),
    ).toBe(100);
    expect(voiceCallSeconds({})).toBeNull();
  });

  it("secret comparé sans fuite de longueur partielle", () => {
    expect(sameSecret("abc", "abc")).toBe(true);
    expect(sameSecret("abc", "abd")).toBe(false);
    expect(sameSecret("abc", "abcd")).toBe(false);
    expect(sameSecret("", "")).toBe(false);
  });
});
