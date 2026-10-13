import { describe, expect, it } from "vitest";
import {
  appDeepLink,
  appReturnSitePath,
  appReturnUrl,
  parseAppReturn,
  type AppReturn,
} from "../src/app-return";

const ID = "3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b";
const params = (query: string) => new URLSearchParams(query);

describe("retour dans l'application après une page hébergée (ADR 0060)", () => {
  it("adresse de la page de retour, sans double barre oblique", () => {
    const target: AppReturn = { screen: "devis", id: ID, state: "signature" };
    expect(appReturnUrl("https://menao.fr/", target)).toBe(
      `https://menao.fr/retour-application?ecran=devis&id=${ID}&etat=signature`,
    );
  });

  it("lit les paramètres que la page de retour reçoit", () => {
    const url = new URL(
      appReturnUrl("https://menao.fr", { screen: "chantier", id: ID, state: "paiement" }),
    );
    expect(parseAppReturn(url.searchParams)).toEqual({
      screen: "chantier",
      id: ID,
      state: "paiement",
    });
  });

  it("refuse les écrans, états ou identifiants inconnus (aucune redirection libre)", () => {
    expect(parseAppReturn(params(`ecran=admin&id=${ID}&etat=paiement`))).toBeNull();
    expect(parseAppReturn(params(`ecran=devis&id=${ID}&etat=https://exemple.com`))).toBeNull();
    expect(parseAppReturn(params("ecran=devis&id=../../connexion&etat=paiement"))).toBeNull();
    expect(parseAppReturn(params(`ecran=devis&id=${ID.toUpperCase()}&etat=paiement`))).toBeNull();
    expect(parseAppReturn(params(`ecran=devis&etat=paiement`))).toBeNull();
    expect(parseAppReturn(params(""))).toBeNull();
  });

  it("rouvre l'application sur l'écran d'origine", () => {
    expect(appDeepLink({ screen: "devis", id: ID, state: "paiement" })).toBe(
      `menao://devis/${ID}?retour=paiement`,
    );
    expect(appDeepLink({ screen: "chantier", id: ID, state: "reception" })).toBe(
      `menao://chantier/${ID}?retour=reception`,
    );
  });

  it("page équivalente du site, avec les mêmes messages de retour que sur le web", () => {
    expect(appReturnSitePath({ screen: "devis", id: ID, state: "signature" })).toBe(
      `/mon-espace/devis/${ID}?signature=terminee`,
    );
    expect(appReturnSitePath({ screen: "devis", id: ID, state: "paiement" })).toBe(
      `/mon-espace/devis/${ID}?paiement=termine`,
    );
    expect(appReturnSitePath({ screen: "devis", id: ID, state: "annule" })).toBe(
      `/mon-espace/devis/${ID}`,
    );
    expect(appReturnSitePath({ screen: "chantier", id: ID, state: "reception" })).toBe(
      `/mon-espace/chantiers/${ID}?reception=signee`,
    );
    expect(appReturnSitePath({ screen: "chantier", id: ID, state: "paiement" })).toBe(
      `/mon-espace/chantiers/${ID}?paiement=termine`,
    );
    expect(appReturnSitePath({ screen: "chantier", id: ID, state: "annule" })).toBe(
      `/mon-espace/chantiers/${ID}`,
    );
  });
});
