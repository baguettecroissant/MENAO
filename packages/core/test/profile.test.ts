import { describe, expect, it } from "vitest";
import {
  PROFILE_GOOD_PRESENTATION_LENGTH,
  PROFILE_GOOD_PHOTO_COUNT,
  PROFILE_STRENGTH_WEIGHTS,
  profileStrength,
  profileTips,
} from "../src/profile";

const complete = {
  hasAvatar: true,
  presentationLength: 420,
  photoCount: 6,
  workTypeCount: 3,
  certificationCount: 1,
  verified: true,
};

describe("conseils pour une fiche plus convaincante (F-10)", () => {
  it("seuils : présentation de 300 caractères, 3 photos de réalisations", () => {
    expect(PROFILE_GOOD_PRESENTATION_LENGTH).toBe(300);
    expect(PROFILE_GOOD_PHOTO_COUNT).toBe(3);
  });

  it("fiche complète : aucun conseil", () => {
    expect(profileTips(complete)).toEqual([]);
  });

  it("conseils dans l'ordre d'impact : photo, réalisations, présentation, spécialités, certifications", () => {
    expect(
      profileTips({
        hasAvatar: false,
        presentationLength: 120,
        photoCount: 1,
        workTypeCount: 0,
        certificationCount: 0,
        verified: true,
      }),
    ).toEqual(["photo_profil", "realisations", "presentation", "specialites", "certifications"]);
    expect(profileTips({ ...complete, photoCount: 2 })).toEqual(["realisations"]);
    expect(profileTips({ ...complete, presentationLength: 299 })).toEqual(["presentation"]);
  });

  it("badge « Assuré et vérifié » manquant : premier conseil (ADR 0119)", () => {
    expect(profileTips({ ...complete, verified: false })).toEqual(["assure_verifie"]);
    expect(profileTips({ ...complete, verified: false, hasAvatar: false })).toEqual([
      "assure_verifie",
      "photo_profil",
    ]);
  });
});

describe("jauge « Fiche complète à X % » (ADR 0129)", () => {
  it("les poids font 100 et suivent l'ordre des conseils", () => {
    expect(Object.values(PROFILE_STRENGTH_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
    expect(Object.keys(PROFILE_STRENGTH_WEIGHTS)).toEqual([
      "assure_verifie",
      "photo_profil",
      "realisations",
      "presentation",
      "specialites",
      "certifications",
    ]);
  });

  it("fiche complète : 100 %, plus rien à faire", () => {
    expect(profileStrength(complete)).toEqual({ percent: 100, next: null });
  });

  it("fiche vide : 0 %, le badge « Assuré et vérifié » d'abord", () => {
    expect(
      profileStrength({
        hasAvatar: false,
        presentationLength: 0,
        photoCount: 0,
        workTypeCount: 0,
        certificationCount: 0,
        verified: false,
      }),
    ).toEqual({ percent: 0, next: "assure_verifie" });
  });

  it("réalisations et présentation comptent au prorata, arrondi à l'inférieur", () => {
    // 25 + 20 + 20 × 1/3 + 15 × 150/300 + 10 + 10 = 79,16… → 79.
    expect(profileStrength({ ...complete, photoCount: 1, presentationLength: 150 })).toEqual({
      percent: 79,
      next: "realisations",
    });
    // Presque complète : jamais 100 % tant qu'il manque quelque chose.
    expect(profileStrength({ ...complete, presentationLength: 299 }).percent).toBe(99);
  });

  it("au-delà des seuils, rien de plus", () => {
    expect(profileStrength({ ...complete, photoCount: 12, presentationLength: 2000 }).percent).toBe(
      100,
    );
  });
});
