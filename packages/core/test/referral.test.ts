import { describe, expect, it } from "vitest";
import {
  ARTISAN_INVITATIONS_PER_PERIOD,
  ARTISAN_INVITATION_PERIOD_DAYS,
  ARTISAN_INVITATION_RETENTION_MONTHS,
  REFERRAL_MONTHS_PER_YEAR,
  REFERRAL_PARTNERS_SHOWN,
  REFERRAL_STEPS,
  REFERRAL_SUGGESTION_COOLDOWN_DAYS,
  REFERRAL_SUGGESTION_MOMENTS,
  WELCOME_GIFT_ITEMS,
  referralProgress,
  whatsAppShareUrl,
} from "../src/referral";

describe("parrainage V2 (F-60, ADR 0154)", () => {
  it("plafond de 12 mois offerts par an pour le parrain", () => {
    expect(REFERRAL_MONTHS_PER_YEAR).toBe(12);
  });

  it("progression du parrain : mois gagnés cette année, restants, plafond atteint", () => {
    expect(referralProgress(0)).toEqual({ earned: 0, left: 12, capped: false });
    expect(referralProgress(5)).toEqual({ earned: 5, left: 7, capped: false });
    expect(referralProgress(12)).toEqual({ earned: 12, left: 0, capped: true });
  });

  it("valeurs inattendues : jamais de mois négatifs ni au-delà du plafond", () => {
    expect(referralProgress(15)).toEqual({ earned: 12, left: 0, capped: true });
    expect(referralProgress(-3)).toEqual({ earned: 0, left: 12, capped: false });
    expect(referralProgress(Number.NaN)).toEqual({ earned: 0, left: 12, capped: false });
    expect(referralProgress(2.7)).toEqual({ earned: 2, left: 10, capped: false });
  });

  it("cadeau de bienvenue du filleul : t-shirt ou casquette", () => {
    expect(WELCOME_GIFT_ITEMS).toEqual(["tshirt", "casquette"]);
  });
});

describe("réseau du parrain (ADR 0161)", () => {
  it("étapes des filleuls, moments des propositions, partenaires affichés", () => {
    expect(REFERRAL_STEPS).toEqual(["inscription", "valide", "abonne", "annule"]);
    expect(REFERRAL_SUGGESTION_MOMENTS).toEqual([
      "premier_chantier",
      "trois_mois",
      "avis_5_etoiles",
    ]);
    expect(REFERRAL_SUGGESTION_COOLDOWN_DAYS).toBe(7);
    expect(REFERRAL_PARTNERS_SHOWN).toBe(6);
  });

  it("message WhatsApp déjà rédigé, encodé dans le lien", () => {
    expect(whatsAppShareUrl("Rejoins MENAO : https://menao.fr/pros?parrain=ab12cd34 & co")).toBe(
      "https://wa.me/?text=Rejoins%20MENAO%20%3A%20https%3A%2F%2Fmenao.fr%2Fpros%3Fparrain%3Dab12cd34%20%26%20co",
    );
  });
});

describe("invitation d'un artisan par un particulier (ADR 0162)", () => {
  it("5 invitations sur 30 jours, coordonnées effacées après 12 mois", () => {
    expect(ARTISAN_INVITATIONS_PER_PERIOD).toBe(5);
    expect(ARTISAN_INVITATION_PERIOD_DAYS).toBe(30);
    expect(ARTISAN_INVITATION_RETENTION_MONTHS).toBe(12);
  });
});
