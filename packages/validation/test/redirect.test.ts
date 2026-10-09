import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "../src/redirect";

describe("safeRedirectPath", () => {
  it("garde un chemin interne", () => {
    expect(safeRedirectPath("/mon-espace")).toBe("/mon-espace");
    expect(safeRedirectPath("/mon-espace?onglet=documents#haut")).toBe(
      "/mon-espace?onglet=documents#haut",
    );
  });

  it.each([
    "https://exemple.test",
    "//exemple.test",
    "/\\exemple.test",
    "javascript:alert(1)",
    "mon-espace",
    "/\t/exemple.test",
    "/\n/exemple.test",
    "/ /exemple.test",
    "",
    null,
    undefined,
    42,
  ])("remplace %s par le chemin par défaut", (value) => {
    expect(safeRedirectPath(value)).toBe("/mon-espace");
  });

  it("accepte un chemin par défaut personnalisé", () => {
    expect(safeRedirectPath(null, "/")).toBe("/");
  });
});
