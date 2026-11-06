import { describe, expect, it } from "vitest";
import { normalizeVoiceLines, quoteTotals, rawVoiceLinesFrom } from "../src/quote";
import {
  eurosSpoken,
  frenchIntegerWords,
  quoteTotalsSpoken,
  quoteVatText,
  signVoiceQuoteSession,
  signVoiceSession,
  usualPricesText,
  verifyVoiceQuoteSession,
  verifyVoiceSession,
  voiceToolDefinitions,
} from "../src/voice-assistant";

describe("devis dicté en conversation avec Camille (ADR 0234)", () => {
  const artisan = "11111111-1111-4111-8111-111111111111";
  const chantier = "33333333-3333-4333-8333-333333333333";
  const now = new Date("2026-11-06T09:00:00Z");

  it("jeton « devis » : lié à l'artisan et au chantier, jamais confondu avec celui de la secrétaire", async () => {
    const token = await signVoiceQuoteSession(
      "secret-test",
      artisan,
      chantier,
      now.getTime() + 60_000,
    );
    expect(await verifyVoiceQuoteSession("secret-test", token, now)).toEqual({
      artisanId: artisan,
      chantierId: chantier,
    });
    expect(await verifyVoiceQuoteSession("autre-secret", token, now)).toBeNull();
    expect(
      await verifyVoiceQuoteSession("secret-test", token, new Date(now.getTime() + 120_000)),
    ).toBeNull();
    // Autre chantier avec la même signature : refusé.
    const [a, , exp, sig] = token.split(".");
    const forged = `${a}.44444444-4444-4444-8444-444444444444.${exp}.${sig}`;
    expect(await verifyVoiceQuoteSession("secret-test", forged, now)).toBeNull();
    // Un jeton de la secrétaire ne sert pas au devis, ni l'inverse.
    const secretary = await signVoiceSession("secret-test", artisan, now.getTime() + 60_000);
    expect(await verifyVoiceQuoteSession("secret-test", secretary, now)).toBeNull();
    expect(await verifyVoiceSession("secret-test", token, now)).toBeNull();
  });

  it("nombres et montants en toutes lettres", () => {
    expect(frenchIntegerWords(0)).toBe("zéro");
    expect(frenchIntegerWords(71)).toBe("soixante et onze");
    expect(frenchIntegerWords(77)).toBe("soixante-dix-sept");
    expect(frenchIntegerWords(80)).toBe("quatre-vingts");
    expect(frenchIntegerWords(91)).toBe("quatre-vingt-onze");
    expect(frenchIntegerWords(200)).toBe("deux cents");
    expect(frenchIntegerWords(1250)).toBe("mille deux cent cinquante");
    expect(frenchIntegerWords(80_000)).toBe("quatre-vingt mille");
    expect(frenchIntegerWords(200_300)).toBe("deux cent mille trois cents");
    expect(frenchIntegerWords(2_000_001)).toBe("deux millions un");
    expect(eurosSpoken(100)).toBe("un euro");
    expect(eurosSpoken(4500)).toBe("quarante-cinq euros");
    expect(eurosSpoken(125_050)).toBe("mille deux cent cinquante euros cinquante");
    expect(eurosSpoken(50)).toBe("cinquante centimes");
    expect(eurosSpoken(100_000_000)).toBe("un million d'euros");
  });

  it("prix habituels et TVA dits à Camille", () => {
    expect(
      usualPricesText([
        { designation: "Pose de carrelage au sol", unite: "m2", prix_ht_centimes: 4500 },
        { designation: "Déplacement", unite: "forfait", prix_ht_centimes: 3000 },
        { designation: 12 },
      ]),
    ).toBe(
      "Pose de carrelage au sol : quarante-cinq euros hors taxes le mètre carré ; Déplacement : trente euros hors taxes le forfait",
    );
    expect(usualPricesText(null)).toBe("");
    expect(quoteVatText(false)).toMatch(/franchise en base/);
  });

  it("lignes de l'outil : lues avec indulgence, puis contrôlées comme la dictée", () => {
    const raw = rawVoiceLinesFrom([
      {
        type: "main d'oeuvre",
        designation: "Pose de carrelage au sol",
        quantite: "12,5",
        unite: "mètre carré",
        prix_unitaire_ht: 45,
        tva: 10,
      },
      { type: "materiel", designation: "Colle", quantite: 3, unite: "u", prix_unitaire_ht: 0 },
      { type: "autre", quantite: 1 },
      "texte",
    ]);
    expect(raw).toHaveLength(2);
    const lines = normalizeVoiceLines(raw, { assujettiTva: true, defaultVatBp: 2000 });
    expect(lines).toEqual([
      {
        type: "main_oeuvre",
        designation: "Pose de carrelage au sol",
        description: "",
        quantityMilli: 12_500,
        unit: "m2",
        unitPriceHtCents: 4500,
        vatRateBp: 1000,
      },
      {
        type: "materiel",
        designation: "Colle",
        description: "",
        quantityMilli: 3000,
        unit: "u",
        unitPriceHtCents: 0,
        vatRateBp: 2000,
      },
    ]);
    expect(quoteTotalsSpoken(quoteTotals(lines))).toBe(
      "Total hors taxes : cinq cent soixante-deux euros cinquante ; TVA : cinquante-six euros vingt-cinq ; total toutes taxes comprises : six cent dix-huit euros soixante-quinze.",
    );
    expect(rawVoiceLinesFrom("pas une liste")).toEqual([]);
  });

  it("outils déclarés pour Vapi", () => {
    const names = voiceToolDefinitions().map((tool) => tool.name);
    expect(names).toContain("devis_prix_habituels");
    expect(names).toContain("devis_proposer");
  });
});
