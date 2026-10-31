import { describe, expect, it } from "vitest";
import {
  ARTISAN_SIGNUP_FINALIZE_PATH,
  SIGNUP_DEFAULT_RADIUS_KM,
  emptySignupDraft,
  firstOpenSignupStep,
  isArtisanFinalizePath,
  parseSignupDraft,
  signupBaseFromCompany,
  signupStepDone,
  type ArtisanSignupCompany,
  type ArtisanSignupDraft,
} from "../src/artisan-signup";

// Entreprise fictive.
const company: ArtisanSignupCompany = {
  siret: "12345678900012",
  name: "PLOMBERIE DES OLIVIERS",
  legalFormCode: "5499",
  apeCode: "43.22A",
  creationYear: "2014",
  address: "12 Avenue des Oliviers 06100 Nice",
  postcode: "06100",
  city: "Nice",
  citycode: "06088",
  lon: 7.26,
  lat: 43.72,
  managers: [{ firstName: "Camille", lastName: "Durand", role: "Gérant" }],
};

const complete: ArtisanSignupDraft = {
  tradeCodes: ["plombier"],
  company,
  isDirigeant: true,
  assujettiTva: true,
  base: { label: "12 Avenue des Oliviers 06100 Nice", citycode: "06088", lon: 7.26, lat: 43.72 },
  zoneMode: "rayon",
  radiusKm: 20,
  territories: [],
};

describe("étapes de l'inscription artisan", () => {
  it("brouillon vide : tout reste à faire, rayon de 20 km par défaut", () => {
    const draft = emptySignupDraft();
    expect(draft.radiusKm).toBe(SIGNUP_DEFAULT_RADIUS_KM);
    expect(firstOpenSignupStep(draft)).toBe("metiers");
  });

  it("chaque étape a ses conditions", () => {
    expect(signupStepDone("metiers", complete)).toBe(true);
    expect(signupStepDone("metiers", { ...complete, tradeCodes: [] })).toBe(false);
    expect(signupStepDone("entreprise", complete)).toBe(true);
    expect(signupStepDone("entreprise", { ...complete, isDirigeant: null })).toBe(false);
    expect(signupStepDone("entreprise", { ...complete, assujettiTva: null })).toBe(false);
    expect(signupStepDone("entreprise", { ...complete, company: null })).toBe(false);
    expect(signupStepDone("zone", complete)).toBe(true);
    expect(signupStepDone("zone", { ...complete, base: null })).toBe(false);
    expect(signupStepDone("zone", { ...complete, radiusKm: 42 })).toBe(false);
    // Le compte n'est jamais « fait » dans le brouillon : il se crée sur le serveur.
    expect(signupStepDone("compte", complete)).toBe(false);
  });

  it("reprend à la première étape non terminée", () => {
    expect(firstOpenSignupStep({ ...complete, company: null })).toBe("entreprise");
    expect(firstOpenSignupStep({ ...complete, base: null })).toBe("zone");
    expect(firstOpenSignupStep(complete)).toBe("compte");
  });

  it("zone par territoire : au moins un département ou une région (ADR 0213)", () => {
    const zone = { ...complete, zoneMode: "departements" as const, territories: [] };
    expect(signupStepDone("zone", zone)).toBe(false);
    expect(signupStepDone("zone", { ...zone, territories: ["06"] })).toBe(true);
    expect(signupStepDone("zone", { ...zone, zoneMode: "france" })).toBe(true);
    expect(signupStepDone("zone", { ...zone, zoneMode: "france", base: null })).toBe(false);
  });

  it("relit la zone du brouillon et écarte les codes inconnus", () => {
    expect(
      parseSignupDraft({ zoneMode: "regions", territories: ["93", "93", "99", 4] }),
    ).toMatchObject({ zoneMode: "regions", territories: ["93"] });
    expect(parseSignupDraft({ zoneMode: "communes", territories: ["06"] })).toMatchObject({
      zoneMode: "rayon",
      territories: [],
    });
  });

  it("part de l'adresse du siège pour la zone", () => {
    expect(signupBaseFromCompany(company)).toEqual({
      label: "12 Avenue des Oliviers 06100 Nice",
      citycode: "06088",
      lon: 7.26,
      lat: 43.72,
    });
    expect(signupBaseFromCompany({ ...company, address: null })?.label).toBe("Nice (06100)");
    expect(signupBaseFromCompany({ ...company, lat: null })).toBeNull();
    expect(signupBaseFromCompany({ ...company, citycode: null })).toBeNull();
  });

  it("relit un brouillon gardé dans le navigateur, sans faire confiance à son contenu", () => {
    expect(parseSignupDraft(JSON.parse(JSON.stringify(complete)))).toEqual(complete);
    expect(parseSignupDraft(null)).toEqual(emptySignupDraft());
    expect(parseSignupDraft("oops")).toEqual(emptySignupDraft());
    const broken = parseSignupDraft({
      tradeCodes: ["plombier", 3, "<script>"],
      company: { siret: "abc" },
      isDirigeant: "oui",
      assujettiTva: false,
      base: { label: "x", citycode: "06088", lon: "7", lat: 43 },
      radiusKm: 999,
    });
    expect(broken).toEqual({
      ...emptySignupDraft(),
      tradeCodes: ["plombier"],
      assujettiTva: false,
    });
  });

  it("reconnaît le retour de Google ou Apple vers l'inscription artisan", () => {
    expect(isArtisanFinalizePath(ARTISAN_SIGNUP_FINALIZE_PATH)).toBe(true);
    expect(isArtisanFinalizePath(`${ARTISAN_SIGNUP_FINALIZE_PATH}?x=1`)).toBe(true);
    expect(isArtisanFinalizePath("/pro/finaliser-autre")).toBe(false);
    expect(isArtisanFinalizePath("/mon-espace")).toBe(false);
  });
});
