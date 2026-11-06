import { describe, expect, it } from "vitest";
import {
  VOICE_TOOLS,
  isCommercialSlot,
  nextCommercialSlots,
  parisInstant,
  frenchNumberWords,
  parisSlotLabel,
  parisSlotSpoken,
  parseSlotCode,
  parseVoiceToolCalls,
  slotCode,
  sameSecret,
  spokenEmail,
  spokenPhoneToE164,
  voiceCallSeconds,
  voiceText,
  voiceToolDefinitions,
  voiceSquad,
  voicePreparedRequestPath,
  voiceWorkDescription,
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

describe("rendez-vous avec le commercial du secteur (ADR 0226)", () => {
  // Jeudi 5 novembre 2026, 15 h 10 à Paris (UTC+1).
  const now = new Date("2026-11-05T14:10:00Z");

  it("heure de Paris, y compris en été", () => {
    expect(parisInstant("2026-11-10", "10:00").toISOString()).toBe("2026-11-10T09:00:00.000Z");
    expect(parisInstant("2026-07-10", "10:00").toISOString()).toBe("2026-07-10T08:00:00.000Z");
  });

  it("créneaux : deux heures d'avance, un par demi-journée, jamais le week-end", () => {
    const slots = nextCommercialSlots(now, []);
    expect(slots.map(slotCode)).toEqual([
      "2026-11-05T17:30",
      "2026-11-06T10:00",
      "2026-11-06T14:00",
    ]);
  });

  it("créneaux : une heure d'écart avec les rendez-vous déjà pris", () => {
    const busy = [parisInstant("2026-11-06", "10:30"), parisInstant("2026-11-05", "18:00")];
    expect(nextCommercialSlots(now, busy).map(slotCode)).toEqual([
      "2026-11-05T19:00",
      "2026-11-06T11:30",
      "2026-11-06T14:00",
    ]);
  });

  it("vendredi soir → lundi", () => {
    const friday = new Date("2026-11-06T18:00:00Z");
    expect(slotCode(nextCommercialSlots(friday, [], 1)[0] as Date)).toBe("2026-11-09T10:00");
  });

  it("créneau valide : début prévu, en semaine", () => {
    expect(isCommercialSlot(parisInstant("2026-11-10", "14:30"))).toBe(true);
    expect(isCommercialSlot(parisInstant("2026-11-10", "13:00"))).toBe(false);
    expect(isCommercialSlot(parisInstant("2026-11-10", "10:15"))).toBe(false);
    expect(isCommercialSlot(parisInstant("2026-11-08", "10:00"))).toBe(false);
  });

  it("libellé et code des créneaux", () => {
    expect(parisSlotLabel(parisInstant("2026-11-10", "10:00"))).toBe("mardi 10 novembre à 10 h");
    expect(parisSlotLabel(parisInstant("2026-11-10", "14:30"))).toBe("mardi 10 novembre à 14 h 30");
    expect(parseSlotCode("2026-11-10T10:00")?.toISOString()).toBe("2026-11-10T09:00:00.000Z");
    expect(parseSlotCode("2026-11-10T09:00:00.000Z")?.toISOString()).toBe(
      "2026-11-10T09:00:00.000Z",
    );
    expect(parseSlotCode("mardi")).toBeNull();
  });
});

describe("créneaux lus au téléphone (ADR 0226)", () => {
  it("nombres en toutes lettres", () => {
    expect([0, 1, 16, 17, 20, 21, 22, 30, 31, 45, 59].map(frenchNumberWords)).toEqual([
      "zéro",
      "un",
      "seize",
      "dix-sept",
      "vingt",
      "vingt et un",
      "vingt-deux",
      "trente",
      "trente et un",
      "quarante-cinq",
      "cinquante-neuf",
    ]);
  });
  it("créneau entier en lettres", () => {
    expect(parisSlotSpoken(parisInstant("2026-11-06", "14:00"))).toBe(
      "vendredi six novembre à quatorze heures",
    );
    expect(parisSlotSpoken(parisInstant("2026-11-05", "17:30"))).toBe(
      "jeudi cinq novembre à dix-sept heures trente",
    );
    expect(parisSlotSpoken(parisInstant("2026-12-01", "12:30"))).toBe(
      "mardi premier décembre à midi trente",
    );
  });
});

describe("demande de travaux par téléphone (ADR 0227)", () => {
  it("description pour l'analyse : besoin, commune et délai dictés", () => {
    expect(
      voiceWorkDescription({
        besoin: "  Fuite  sous l'évier de la cuisine, ça goutte depuis hier. ",
        commune: "Antibes",
        delai: "cette semaine",
      }),
    ).toBe(
      "Fuite sous l'évier de la cuisine, ça goutte depuis hier.\nCommune des travaux : Antibes.\nDélai souhaité : cette semaine.",
    );
  });

  it("lien de l'e-mail : la page de la demande préparée, hors de /recherche", () => {
    expect(voicePreparedRequestPath("abc")).toBe("/demande-preparee/abc");
  });

  it("délai facultatif", () => {
    expect(
      voiceWorkDescription({
        besoin: "Repeindre un salon de vingt mètres carrés",
        commune: "Nice",
      }),
    ).toBe("Repeindre un salon de vingt mètres carrés\nCommune des travaux : Nice.");
  });

  it("besoin trop court ou commune absente : rien", () => {
    expect(voiceWorkDescription({ besoin: "fuite", commune: "Nice" })).toBeNull();
    expect(
      voiceWorkDescription({ besoin: "Repeindre un salon de vingt mètres carrés" }),
    ).toBeNull();
    expect(voiceWorkDescription({ besoin: 42, commune: "Nice" })).toBeNull();
  });

  it("besoin borné à 1 500 caractères", () => {
    const text = voiceWorkDescription({ besoin: "a".repeat(3000), commune: "Nice" });
    expect(text?.startsWith("a".repeat(1500) + "\n")).toBe(true);
  });
});

describe("une seule Camille : passage de relais (ADR 0228)", () => {
  const ids = { pro: "assistant-pro", client: "assistant-client" };

  it("le groupe commence par la Camille de la page, l'autre en relais", () => {
    const squad = voiceSquad("client", ids);
    expect(squad.members.map((m) => m.assistantId)).toEqual(["assistant-client", "assistant-pro"]);
    expect(voiceSquad("pro", ids).members[0]?.assistantId).toBe("assistant-pro");
  });

  it("chaque Camille peut passer la main à l'autre, sans rien dire, en gardant la conversation", () => {
    const [first, second] = voiceSquad("pro", ids).members;
    expect(first?.assistantDestinations).toEqual([
      expect.objectContaining({
        type: "assistant",
        assistantName: "Camille particuliers",
        message: "",
        transferMode: "swap-system-message-in-history",
      }),
    ]);
    expect(second?.assistantDestinations[0]?.assistantName).toBe("Camille MENAO");
  });

  it("la Camille qui reprend la main enchaîne au lieu de se présenter à nouveau", () => {
    const [first, second] = voiceSquad("client", ids).members;
    expect(first?.assistantOverrides).toBeUndefined();
    expect(second?.assistantOverrides).toEqual({
      firstMessageMode: "assistant-speaks-first-with-model-generated-message",
    });
  });
});
