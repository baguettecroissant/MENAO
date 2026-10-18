import { beforeEach, describe, expect, it } from "vitest";
import {
  clearScreenCache,
  readScreenCache,
  sameScreenData,
  setScreenCacheOwner,
  writeScreenCache,
} from "./screen-cache";

const loadZone = async () => ({ radiusKm: 30 });

describe("données des écrans gardées en mémoire", () => {
  beforeEach(() => clearScreenCache());

  it("retrouve les données d'un écran par sa fonction de chargement ou par un texte", () => {
    expect(readScreenCache(loadZone)).toBeUndefined();
    writeScreenCache(loadZone, { radiusKm: 30 });
    writeScreenCache("chantier:1", { titre: "Cuisine" });
    expect(readScreenCache(loadZone)).toEqual({ radiusKm: 30 });
    expect(readScreenCache("chantier:1")).toEqual({ titre: "Cuisine" });
  });

  it("garde une donnée nulle (écran sans compte, par exemple)", () => {
    writeScreenCache("vide", null);
    expect(readScreenCache("vide")).toBeNull();
  });

  it("oublie tout quand le compte change, pas quand il reste le même", () => {
    setScreenCacheOwner("compte-a");
    writeScreenCache(loadZone, { radiusKm: 30 });
    setScreenCacheOwner("compte-a");
    expect(readScreenCache(loadZone)).toEqual({ radiusKm: 30 });
    setScreenCacheOwner("compte-b");
    expect(readScreenCache(loadZone)).toBeUndefined();
    writeScreenCache("chantier:1", 1);
    setScreenCacheOwner(null);
    expect(readScreenCache("chantier:1")).toBeUndefined();
  });

  it("garde au plus 40 écrans à paramètre, en oubliant les plus anciens", () => {
    for (let i = 0; i < 41; i++) writeScreenCache(`chantier:${i}`, i);
    expect(readScreenCache("chantier:0")).toBeUndefined();
    expect(readScreenCache("chantier:40")).toBe(40);
    // Une lecture rend l'écran récent : il survit au suivant.
    readScreenCache("chantier:1");
    writeScreenCache("chantier:41", 41);
    expect(readScreenCache("chantier:1")).toBe(1);
    expect(readScreenCache("chantier:2")).toBeUndefined();
  });

  it("compare les données par leur contenu", () => {
    expect(sameScreenData({ a: [1, 2] }, { a: [1, 2] })).toBe(true);
    expect(sameScreenData({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameScreenData(null, undefined)).toBe(false);
  });
});
