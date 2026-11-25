import { describe, expect, it } from "vitest";
import {
  displayPoints,
  experienceYearsOf,
  standOut,
  STAND_OUT_KEYS,
  type StandOutFacts,
} from "../src/stand-out";

const empty: StandOutFacts = {
  hasAvatar: false,
  photoCount: 0,
  diploma: false,
  experienceYears: null,
  workTypeCount: 0,
  certificationCount: 0,
  rge: false,
};

describe("« Pour vous démarquer » (lot 81)", () => {
  it("quatre atouts, dans l'ordre de la maquette", () => {
    expect(STAND_OUT_KEYS).toEqual(["image", "savoir_faire", "certifications", "realisations"]);
  });

  it("une fiche vide : 23 points du Score MENAO à gagner, aucun atout fait", () => {
    const s = standOut(empty);
    expect(s.items.map((i) => [i.key, i.gain])).toEqual([
      ["image", 2],
      ["savoir_faire", 13],
      ["certifications", 6],
      ["realisations", 2],
    ]);
    expect(s.max).toBe(23);
    expect(s.earned).toBe(0);
    expect(s.remaining).toBe(23);
    expect(s.doneCount).toBe(0);
  });

  it("tout rempli : rien à gagner, 4 sur 4", () => {
    const s = standOut({
      hasAvatar: true,
      photoCount: 5,
      diploma: true,
      experienceYears: 12,
      workTypeCount: 2,
      certificationCount: 1,
      rge: false,
    });
    expect(s.remaining).toBe(0);
    expect(s.earned).toBe(23);
    expect(s.doneCount).toBe(4);
    expect(s.items.every((i) => i.done && i.gain === 0)).toBe(true);
  });

  it("réalisations au prorata jusqu'à 3 photos", () => {
    const one = standOut({ ...empty, photoCount: 1 }).items.find((i) => i.key === "realisations");
    expect(one?.done).toBe(false);
    expect(one?.earned).toBeCloseTo(2 / 3);
    expect(one?.gain).toBeCloseTo(4 / 3);
    const three = standOut({ ...empty, photoCount: 3 }).items.find((i) => i.key === "realisations");
    expect(three).toMatchObject({ done: true, gain: 0 });
  });

  it("savoir-faire : diplôme +5, spécialités +1, expérience de 3 à 10 points", () => {
    const old = standOut({ ...empty, experienceYears: 6 }).items.find(
      (i) => i.key === "savoir_faire",
    );
    // 6 ans : 8 points d'expérience sur 10, il en reste 2 ; diplôme 5 et spécialités 1.
    expect(old?.gain).toBe(8);
    expect(old?.done).toBe(false);
    const full = standOut({ ...empty, diploma: true, workTypeCount: 1, experienceYears: 3 });
    // Diplôme, spécialités et années déclarées : l'atout est fait même sous 10 ans.
    expect(full.items.find((i) => i.key === "savoir_faire")).toMatchObject({ done: true, gain: 4 });
  });

  it("certifications : RGE détecté au SIRET compte comme une qualification", () => {
    const rge = standOut({ ...empty, rge: true }).items.find((i) => i.key === "certifications");
    expect(rge).toMatchObject({ done: true, gain: 1 });
    const added = standOut({ ...empty, certificationCount: 1 }).items.find(
      (i) => i.key === "certifications",
    );
    expect(added).toMatchObject({ done: true, gain: 0 });
  });
});

describe("experienceYearsOf", () => {
  it("prend la plus grande valeur entre les années déclarées et l'âge de l'entreprise", () => {
    expect(experienceYearsOf(null, null, "2026-11-25")).toBeNull();
    expect(experienceYearsOf(4, null, "2026-11-25")).toBe(4);
    expect(experienceYearsOf(2, "2019-03-01", "2026-11-25")).toBe(7);
    expect(experienceYearsOf(null, "2019-12-01", "2026-11-25")).toBe(6);
    expect(experienceYearsOf(12, "2019-03-01", "2026-11-25")).toBe(12);
  });
});

describe("displayPoints", () => {
  it("arrondit, sans jamais afficher +0 pour un reste non nul", () => {
    expect(displayPoints(0)).toBe(0);
    expect(displayPoints(-1)).toBe(0);
    expect(displayPoints(0.3)).toBe(1);
    expect(displayPoints(4 / 3)).toBe(1);
    expect(displayPoints(12.6)).toBe(13);
  });
});
