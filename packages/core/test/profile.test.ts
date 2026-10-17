import { describe, expect, it } from "vitest";
import {
  PROFILE_GOOD_PRESENTATION_LENGTH,
  PROFILE_GOOD_PHOTO_COUNT,
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
