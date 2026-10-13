import { describe, expect, it } from "vitest";
import { appRouteForSitePath } from "./links";

const ID = "3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b";

describe("liens des notifications vers les écrans de l'application", () => {
  it("ouvre l'écran qui correspond à la page du site", () => {
    expect(appRouteForSitePath(`/mon-espace/chantiers/${ID}`)).toBe(`/chantier/${ID}`);
    expect(appRouteForSitePath(`/mon-espace/chantiers/${ID}/solde`)).toBe(`/chantier/${ID}/solde`);
    expect(appRouteForSitePath(`/mon-espace/devis/${ID}`)).toBe(`/devis/${ID}`);
    expect(appRouteForSitePath(`/mon-espace/devis/${ID}/acompte`)).toBe(`/devis/${ID}/acompte`);
    expect(appRouteForSitePath(`/mon-espace/messages/${ID}`)).toBe(`/conversation/${ID}`);
    expect(appRouteForSitePath("/mon-espace")).toBe("/chantiers");
    expect(appRouteForSitePath("/notifications")).toBe("/notifications");
  });

  it("ignore les paramètres et la barre finale", () => {
    expect(appRouteForSitePath(`/mon-espace/devis/${ID}?signature=terminee`)).toBe(`/devis/${ID}`);
    expect(appRouteForSitePath(`/mon-espace/chantiers/${ID}/`)).toBe(`/chantier/${ID}`);
  });

  it("laisse sur le site les pages sans écran dans l'application", () => {
    expect(appRouteForSitePath(`/mon-espace/chantiers/${ID}/avis`)).toBeNull();
    expect(appRouteForSitePath(`/signalements/${ID}`)).toBeNull();
    expect(appRouteForSitePath("/pro/demandes")).toBeNull();
    expect(appRouteForSitePath("/mon-espace/chantiers/pas-un-identifiant")).toBeNull();
  });
});
