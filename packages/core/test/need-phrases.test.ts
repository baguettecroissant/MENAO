import { describe, expect, it } from "vitest";
import { NEED_PHRASES, matchNeedPhrases } from "../src/need-phrases";

const texts = (input: string, limit?: number) => matchNeedPhrases(input, limit).map((p) => p.text);

describe("propositions instantanées (ADR 0178)", () => {
  it("demandes types : uniques, sans chiffre, métier renseigné", () => {
    const all = NEED_PHRASES.map((p) => p.text);
    expect(new Set(all).size).toBe(all.length);
    for (const phrase of NEED_PHRASES) {
      expect(phrase.text).not.toMatch(/\d/);
      expect(phrase.trade).toMatch(/^[a-z]+$/);
    }
  });

  it("dernier mot en cours de frappe comparé au début des mots", () => {
    expect(texts("salle de b")).toContain("Rénover entièrement ma salle de bain");
    expect(texts("salle de ba")).toContain("Rénover entièrement ma salle de bain");
    expect(texts("salle de bai")).toContain("Rénover entièrement ma salle de bain");
    expect(texts("wc")).toContain("Déboucher mes WC");
    expect(texts("douche à l'ita")).toEqual(
      expect.arrayContaining([
        "Remplacer ma baignoire par une douche à l'italienne",
        "Installer une douche à l'italienne",
      ]),
    );
  });

  it("chaque mot important tapé doit se retrouver dans la demande", () => {
    const fuites = texts("fuite cuisine");
    expect(fuites).toEqual(["Réparer une fuite sous l'évier de la cuisine"]);
  });

  it("synonymes courants : WC, cumulus, placo, clim", () => {
    expect(texts("toilettes bouchées")[0]).toBe("Déboucher mes WC");
    expect(texts("cumulus")).toContain("Remplacer mon chauffe-eau électrique");
    expect(texts("placo")).toContain("Monter une cloison en placo");
    expect(texts("clim")).toContain("Installer une climatisation réversible");
  });

  it("accents et majuscules ignorés ; le verbe départage", () => {
    expect(texts("RENOVER MA CUISINE")[0]).toBe("Rénover entièrement ma cuisine");
    expect(texts("Je veux refaire")).toEqual(
      expect.arrayContaining(["Refaire la toiture de ma maison"]),
    );
  });

  it("rien sur une saisie trop courte, sans mot utile, longue ou déjà complète", () => {
    expect(texts("sa")).toEqual([]);
    expect(texts("Je cherche un")).toEqual([]);
    expect(texts("Bonjour, j'ai besoin d'un artisan pour")).toEqual([]);
    expect(texts("je voudrais refaire entièrement ma salle de bain avec une douche")).toEqual([]);
    expect(texts("Installer une pompe à chaleur")).not.toContain("Installer une pompe à chaleur");
  });

  it("cinq propositions au plus", () => {
    expect(texts("repeindre").length).toBeLessThanOrEqual(5);
    expect(texts("repeindre", 3)).toHaveLength(3);
  });
});
