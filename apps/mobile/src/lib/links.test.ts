import { describe, expect, it } from "vitest";
import { appRouteForSitePath } from "./links";

const ID = "3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b";

describe("liens des notifications vers les écrans de l'application", () => {
  it("ouvre l'écran qui correspond à la page du site", () => {
    expect(appRouteForSitePath(`/mon-espace/chantiers/${ID}`)).toBe(`/chantier/${ID}`);
    expect(appRouteForSitePath(`/mon-espace/chantiers/${ID}/solde`)).toBe(`/chantier/${ID}/solde`);
    expect(appRouteForSitePath(`/mon-espace/chantiers/${ID}/avis`)).toBe(`/chantier/${ID}/avis`);
    expect(appRouteForSitePath(`/mon-espace/devis/${ID}`)).toBe(`/devis/${ID}`);
    expect(appRouteForSitePath(`/mon-espace/devis/${ID}/acompte`)).toBe(`/devis/${ID}/acompte`);
    expect(appRouteForSitePath(`/mon-espace/messages/${ID}`)).toBe(`/conversation/${ID}`);
    expect(appRouteForSitePath("/mon-espace/documents")).toBe("/documents");
    expect(appRouteForSitePath("/compte")).toBe("/compte");
    expect(appRouteForSitePath("/mon-espace")).toBe("/chantiers");
    expect(appRouteForSitePath("/notifications")).toBe("/notifications");
    expect(appRouteForSitePath(`/signalements/${ID}`)).toBe(`/signalement/${ID}`);
  });

  it("ouvre les écrans de l'espace artisan, sans renvoi vers le site", () => {
    expect(appRouteForSitePath("/pro/tableau-de-bord")).toBe("/pro");
    expect(appRouteForSitePath("/pro/demandes")).toBe("/pro/demandes");
    expect(appRouteForSitePath(`/pro/demandes/${ID}`)).toBe(`/opportunite/${ID}`);
    expect(appRouteForSitePath("/pro/chantiers")).toBe("/pro/chantiers");
    expect(appRouteForSitePath("/pro/devis")).toBe("/pro/chantiers?vue=devis");
    expect(appRouteForSitePath("/pro/profil")).toBe("/pro-ma-fiche");
    expect(appRouteForSitePath("/pro/agenda")).toBe("/pro-agenda");
    expect(appRouteForSitePath(`/pro/chantiers/${ID}`)).toBe(`/pro-chantier/${ID}`);
    expect(appRouteForSitePath(`/pro/chantiers/${ID}/devis`)).toBe(`/pro-chantier/${ID}/devis`);
    expect(appRouteForSitePath(`/pro/messages/${ID}`)).toBe(`/conversation/${ID}`);
    expect(appRouteForSitePath("/pro/avis")).toBe("/pro-avis");
    expect(appRouteForSitePath("/pro/grade")).toBe("/pro-grade");
    expect(appRouteForSitePath("/pro/agenda/disponibilites")).toBe("/pro-disponibilites");
    expect(appRouteForSitePath("/pro/factures")).toBe("/pro-factures");
    expect(appRouteForSitePath("/pro/onboarding")).toBe("/pro");
    expect(appRouteForSitePath("/pro/bienvenue")).toBe("/pro-bienvenue");
    expect(appRouteForSitePath("/pro/onboarding/documents")).toBe("/pro-documents");
    expect(appRouteForSitePath("/pro/onboarding/profil")).toBe("/pro-profil-public");
    expect(appRouteForSitePath("/pro/onboarding/paiements")).toBe("/pro-paiements");
    expect(appRouteForSitePath("/pro/onboarding/entreprise")).toBe("/pro-entreprise");
    expect(appRouteForSitePath("/pro/onboarding/metiers")).toBe("/pro-metiers");
    expect(appRouteForSitePath("/pro/onboarding/zone")).toBe("/pro-zone");
  });

  it("ignore les paramètres et la barre finale", () => {
    expect(appRouteForSitePath(`/mon-espace/devis/${ID}?signature=terminee`)).toBe(`/devis/${ID}`);
    expect(appRouteForSitePath(`/mon-espace/chantiers/${ID}/`)).toBe(`/chantier/${ID}`);
  });

  it("laisse sur le site les pages sans écran dans l'application", () => {
    expect(appRouteForSitePath(`/mon-espace/chantiers/${ID}/signaler/plus`)).toBeNull();
    expect(appRouteForSitePath("/mon-espace/chantiers/pas-un-identifiant")).toBeNull();
  });
});
