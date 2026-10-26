import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearScreenCache,
  parseScreenCache,
  readScreenCache,
  restoreScreenCache,
  sameScreenData,
  serializeScreenCache,
  setScreenCacheOwner,
  setScreenCachePersistence,
  setScreenCacheStore,
  takeFreshPreload,
  writePreloadedScreen,
  writeScreenCache,
  type ScreenCacheStore,
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

describe("onglets gardés sur le téléphone d'une ouverture à l'autre (ADR 0192)", () => {
  let saved: string | null = null;
  const store: ScreenCacheStore = {
    read: vi.fn(async () => saved),
    write: vi.fn(async (text: string) => {
      saved = text;
    }),
    remove: vi.fn(async () => {
      saved = null;
    }),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    saved = null;
    vi.clearAllMocks();
    setScreenCacheStore(store);
    setScreenCachePersistence(true);
    setScreenCacheOwner(null);
  });
  afterEach(() => {
    setScreenCacheOwner(null);
    setScreenCacheStore(null);
    vi.useRealTimers();
  });

  it("ne garde que les onglets, pour un compte donné, sans les erreurs de chargement", () => {
    const text = serializeScreenCache("compte-a", [
      ["tab:demandes", [{ id: 1 }]],
      ["tab:factures", null],
      ["chantier:1", { titre: "Cuisine" }],
    ]);
    expect(parseScreenCache(text, "compte-a")).toEqual([["tab:demandes", [{ id: 1 }]]]);
    expect(parseScreenCache(text, "compte-b")).toEqual([]);
    expect(parseScreenCache("pas du JSON", "compte-a")).toEqual([]);
    expect(parseScreenCache(null, "compte-a")).toEqual([]);
  });

  it("écrit les onglets une seconde après la dernière mise à jour, puis les relit", async () => {
    setScreenCacheOwner("compte-a");
    writeScreenCache("tab:devis", [{ id: "d1" }]);
    writeScreenCache("chantier:1", { titre: "Cuisine" });
    expect(store.write).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(store.write).toHaveBeenCalledTimes(1);

    clearScreenCache();
    await restoreScreenCache("compte-a");
    expect(readScreenCache("tab:devis")).toEqual([{ id: "d1" }]);
    expect(readScreenCache("chantier:1")).toBeUndefined();
  });

  it("n'écrit rien pendant les exemples", async () => {
    setScreenCacheOwner("compte-a");
    setScreenCachePersistence(false);
    writeScreenCache("tab:devis", [{ id: "exemple" }]);
    await vi.advanceTimersByTimeAsync(2000);
    expect(store.write).not.toHaveBeenCalled();
  });

  it("efface le fichier à la déconnexion ou au changement de compte", () => {
    setScreenCacheOwner("compte-a");
    expect(store.remove).not.toHaveBeenCalled();
    setScreenCacheOwner("compte-b");
    expect(store.remove).toHaveBeenCalledTimes(1);
    setScreenCacheOwner(null);
    expect(store.remove).toHaveBeenCalledTimes(2);
  });

  it("affiche un onglet chargé d'avance sans recharger, une seule fois et dans les 20 s", async () => {
    writePreloadedScreen("tab:demandes", []);
    expect(takeFreshPreload("tab:demandes")).toBe(true);
    expect(takeFreshPreload("tab:demandes")).toBe(false);
    writePreloadedScreen("tab:chantiers", []);
    await vi.advanceTimersByTimeAsync(21_000);
    expect(takeFreshPreload("tab:chantiers")).toBe(false);
  });
});
