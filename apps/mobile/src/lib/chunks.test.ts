import { describe, expect, it } from "vitest";
import { joinChunks, splitIntoChunks } from "./chunks";

describe("stockage de la session en morceaux", () => {
  it("découpe puis recompose la même valeur", () => {
    const session = "x".repeat(4100);
    const chunks = splitIntoChunks(session, 1800);
    expect(chunks.map((c) => c.length)).toEqual([1800, 1800, 500]);
    expect(joinChunks(chunks)).toBe(session);
  });

  it("une valeur courte tient en un morceau, une valeur vide aussi", () => {
    expect(splitIntoChunks("abc", 1800)).toEqual(["abc"]);
    expect(splitIntoChunks("", 1800)).toEqual([""]);
  });

  it("un morceau manquant rend la valeur illisible", () => {
    expect(joinChunks(["ab", null, "cd"])).toBeNull();
    expect(joinChunks([])).toBeNull();
  });

  it("refuse une taille nulle", () => {
    expect(() => splitIntoChunks("abc", 0)).toThrow();
  });
});
