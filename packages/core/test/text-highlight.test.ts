import { describe, expect, it } from "vitest";
import { highlightParts } from "../src/text-highlight";

describe("highlightParts", () => {
  const text = "Je cherche un plombier sur Antibes car j'ai une fuite au plafond !";

  it("surligne chaque terme trouvé, dans l'ordre du texte", () => {
    const parts = highlightParts(text, [
      { term: "fuite", tone: "urgent" },
      { term: "Plombier", tone: "info" },
      { term: "antibes", tone: "info" },
    ]);
    expect(parts).toEqual([
      { text: "Je cherche un ", tone: null },
      { text: "plombier", tone: "info" },
      { text: " sur ", tone: null },
      { text: "Antibes", tone: "info" },
      { text: " car j'ai une ", tone: null },
      { text: "fuite", tone: "urgent" },
      { text: " au plafond !", tone: null },
    ]);
    expect(parts.map((p) => p.text).join("")).toBe(text);
  });

  it("ignore les termes absents, vides ou nuls", () => {
    expect(
      highlightParts(text, [
        { term: "Nice", tone: "info" },
        { term: "  ", tone: "info" },
        { term: null, tone: "info" },
      ]),
    ).toEqual([{ text, tone: null }]);
  });

  it("quand deux termes se chevauchent, le premier de la liste l'emporte", () => {
    expect(
      highlightParts("fuite au plafond", [
        { term: "fuite au plafond", tone: "urgent" },
        { term: "plafond", tone: "info" },
      ]),
    ).toEqual([{ text: "fuite au plafond", tone: "urgent" }]);
  });

  it("texte vide : aucun morceau", () => {
    expect(highlightParts("", [{ term: "fuite", tone: "urgent" }])).toEqual([]);
  });
});
