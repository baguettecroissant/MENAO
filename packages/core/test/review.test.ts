import { describe, expect, it } from "vitest";
import {
  REVIEW_COMMENT_LIMITS,
  REVIEW_REMINDER_DAYS,
  VALUE_FOR_MONEY_SCORE,
  canReview,
  reviewBand,
  reviewInvited,
  reviewScore,
  reviewStars,
} from "../src/review";

describe("libellés des curseurs (maquette « Comment s'est passée votre expérience ? »)", () => {
  it("cinq tranches, de « Inacceptable » à « Irréprochable »", () => {
    expect([0, 5, 19].map(reviewBand)).toEqual([0, 0, 0]);
    expect([20, 30, 39].map(reviewBand)).toEqual([1, 1, 1]);
    expect([40, 50, 59].map(reviewBand)).toEqual([2, 2, 2]);
    expect([60, 65, 80, 89].map(reviewBand)).toEqual([3, 3, 3, 3]);
    expect([90, 100].map(reviewBand)).toEqual([4, 4]);
  });
});

describe("score d'un avis (même calcul en base : app.review_score)", () => {
  it("moyenne des trois critères et du rapport qualité/prix converti en pourcentage", () => {
    expect(VALUE_FOR_MONEY_SCORE).toEqual({ excellent: 100, convenable: 60, trop_cher: 20 });
    expect(
      reviewScore({ quality: 100, delays: 100, communication: 100, valueForMoney: "excellent" }),
    ).toBe(100);
    expect(
      reviewScore({ quality: 80, delays: 100, communication: 100, valueForMoney: "excellent" }),
    ).toBe(95);
    // (100 + 65 + 30 + 20) / 4 = 53,75 → 54
    expect(
      reviewScore({ quality: 100, delays: 65, communication: 30, valueForMoney: "trop_cher" }),
    ).toBe(54);
    expect(
      reviewScore({ quality: 0, delays: 0, communication: 0, valueForMoney: "trop_cher" }),
    ).toBe(5);
  });

  it("arrondi au plus proche, moitié vers le haut", () => {
    // (90 + 91 + 90 + 60) / 4 = 82,75 → 83
    expect(
      reviewScore({ quality: 90, delays: 91, communication: 90, valueForMoney: "convenable" }),
    ).toBe(83);
    // (1 + 0 + 1 + 20) / 4 = 5,5 → 6
    expect(
      reviewScore({ quality: 1, delays: 0, communication: 1, valueForMoney: "trop_cher" }),
    ).toBe(6);
  });
});

describe("étoiles affichées", () => {
  it("score sur 100 ramené à 5 étoiles, à l'étoile la plus proche", () => {
    expect([100, 96, 90, 89, 70, 50, 29, 9, 0].map(reviewStars)).toEqual([
      5, 5, 5, 4, 4, 3, 1, 0, 0,
    ]);
  });
});

describe("droit de laisser un avis (F-28, F-27)", () => {
  it("un avis par chantier, dès le PV de réception signé", () => {
    expect(canReview({ receptionSigned: true, hasReview: false })).toBe(true);
    expect(canReview({ receptionSigned: true, hasReview: true })).toBe(false);
    expect(canReview({ receptionSigned: false, hasReview: false })).toBe(false);
  });

  it("invitation (carte « Noter … », relance) seulement au chantier clôturé, après le solde", () => {
    expect(reviewInvited("cloture", false)).toBe(true);
    expect(reviewInvited("cloture", true)).toBe(false);
    expect(reviewInvited("receptionne", false)).toBe(false);
    expect(reviewInvited("reserves_a_lever", false)).toBe(false);
  });

  it("commentaire de 50 caractères au moins ; une relance 3 jours après la clôture", () => {
    expect(REVIEW_COMMENT_LIMITS).toEqual({ min: 50, max: 2000 });
    expect(REVIEW_REMINDER_DAYS).toBe(3);
  });
});
