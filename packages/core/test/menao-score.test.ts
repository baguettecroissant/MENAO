import { describe, expect, it } from "vitest";
import {
  experiencePoints,
  MENAO_SCORE_POINTS,
  menaoScore,
  menaoScoreTips,
  responsePoints,
  reviewsPoints,
  type MenaoScoreInput,
} from "../src/menao-score";

// Nouvel artisan sérieux du plan V1.1 : 12 ans, CAP, fiche à 80 %, vérifié, sans demande ni avis.
const nouveau: MenaoScoreInput = {
  verified: true,
  experienceYears: 12,
  diploma: true,
  qualification: false,
  profilePercent: 80,
  responseMinutes: null,
  quoteOnTimeRate: null,
  google: null,
  menao: null,
};

describe("Score MENAO sur 100 (ADR 0155)", () => {
  it("barème validé : 20 + 10 + 10 + 10 + 10 + 40", () => {
    expect(Object.values(MENAO_SCORE_POINTS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("expérience par paliers", () => {
    expect([null, 0, 1, 2, 4, 5, 9, 10, 35].map(experiencePoints)).toEqual([
      3, 3, 3, 6, 6, 8, 8, 10, 10,
    ]);
  });

  it("temps de réponse par paliers, 7 sans réponse", () => {
    expect([null, 30, 119, 120, 719, 720, 1439, 1440, 4319, 4320].map(responsePoints)).toEqual([
      7, 10, 10, 8, 8, 6, 6, 3, 3, 0,
    ]);
  });

  it("avis : valeur d'accueil, Google en base, poids des avis MENAO qui grandit", () => {
    expect(reviewsPoints(null, null)).toBe(24);
    expect(reviewsPoints({ rating: 4.7, count: 38 }, null)).toBeCloseTo(37.6);
    // 5 avis MENAO : la moitié du poids ; 20 avis : 80 %.
    expect(reviewsPoints(null, { rating: 5, count: 5 })).toBeCloseTo(32);
    expect(reviewsPoints({ rating: 4.5, count: 12 }, { rating: 4.8, count: 20 })).toBeCloseTo(
      37.92,
    );
  });

  it("exemples du plan V1.1", () => {
    expect(menaoScore(nouveau).total).toBe(74);
    expect(menaoScore({ ...nouveau, google: { rating: 4.7, count: 38 } }).total).toBe(88);
    expect(
      menaoScore({ ...nouveau, experienceYears: 3, diploma: false, profilePercent: 50 }).total,
    ).toBe(62);
    expect(
      menaoScore({
        verified: true,
        experienceYears: 15,
        diploma: true,
        qualification: true,
        profilePercent: 100,
        responseMinutes: 60,
        quoteOnTimeRate: 100,
        google: { rating: 4.5, count: 12 },
        menao: { rating: 4.8, count: 20 },
      }).total,
    ).toBe(98);
    expect(
      menaoScore({
        verified: true,
        experienceYears: 8,
        diploma: false,
        qualification: false,
        profilePercent: 60,
        responseMinutes: 30 * 60,
        quoteOnTimeRate: 30,
        google: null,
        menao: { rating: 3.2, count: 10 },
      }).total,
    ).toBe(62);
  });

  it("réactivité : moitié temps de réponse, moitié devis envoyés sous 72 h", () => {
    const parts = menaoScore({ ...nouveau, responseMinutes: 60, quoteOnTimeRate: 50 }).parts;
    expect(parts.reactivite).toBeCloseTo(7.5);
  });

  it("valeurs inattendues bornées", () => {
    const parts = menaoScore({
      ...nouveau,
      verified: false,
      profilePercent: 140,
      quoteOnTimeRate: -10,
      google: { rating: 9, count: 3 },
    }).parts;
    expect(parts.verifie).toBe(0);
    expect(parts.profil).toBe(10);
    expect(parts.avis).toBe(40);
  });

  it("conseils : les points à gagner d'abord", () => {
    expect(menaoScoreTips(menaoScore(nouveau).parts, nouveau)).toEqual([
      { key: "qualification", points: 5 },
      { key: "profil", points: 2 },
    ]);
  });
});
