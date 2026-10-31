import { describe, expect, it } from "vitest";
import type { ArtisanOnboardingSnapshot } from "../src/onboarding";
import { profileHubStatuses, type ProfileHubFacts } from "../src/profile-hub";

// Données fictives ; « aujourd'hui » fixé pour les échéances.
const now = new Date("2026-10-18T10:00:00+02:00");

const snapshot: ArtisanOnboardingSnapshot = {
  siretVerified: true,
  sireneActive: true,
  raisonSociale: "MENUISERIE EXEMPLE",
  assujettiTva: true,
  tradeCount: 2,
  zoneMode: "rayon",
  radiusKm: 30,
  hasBaseLocation: true,
  communeCount: 0,
  territoryCount: 0,
  documents: {
    kbis: { status: "valide", dateEmission: "2025-01-10", dateFin: null },
    decennale: { status: "valide", dateEmission: "2026-01-01", dateFin: "2027-06-30" },
    rc_pro: { status: "valide", dateEmission: "2026-01-01", dateFin: "2027-06-30" },
    identite: { status: "valide", dateEmission: null, dateFin: "2031-01-01" },
    urssaf: { status: "valide", dateEmission: "2026-09-01", dateFin: "2027-03-01" },
  },
  presentationLength: 420,
  hasAvatar: true,
  subscriptionActive: true,
  connectChargesEnabled: true,
  charterAccepted: true,
  decennaleExempt: false,
};

const facts: ProfileHubFacts = {
  snapshot,
  validated: true,
  documents: [
    { type: "decennale", status: "valide", date_fin: "2027-06-30" },
    { type: "rc_pro", status: "valide", date_fin: "2027-06-30" },
    { type: "identite", status: "valide", date_fin: "2031-01-01" },
    { type: "urssaf", status: "valide", date_fin: "2027-03-01" },
  ],
  photoCount: 5,
  reviewsToAnswer: 0,
  reviewCount: 23,
  level: 3,
  hasRge: true,
  paused: false,
  availableFrom: null,
  today: "2026-10-18",
};

describe("états de « Mon profil », communs au site et à l'application (ADR 0131)", () => {
  it("artisan validé en ordre : Kbis ancien ignoré, codes et tons", () => {
    expect(profileHubStatuses(facts, now)).toEqual({
      photo: { code: "upToDate", tone: "success" },
      portfolio: { code: "photos", n: 5, tone: "neutral" },
      reviews: { code: "reviews", n: 23, tone: "neutral" },
      grade: { code: "level", n: 3, tone: "neutral" },
      company: { code: "verifiedCompany", tone: "success" },
      trades: { code: "trades", n: 2, rge: true, tone: "neutral" },
      zone: { code: "radius", km: 30, tone: "neutral" },
      availability: { code: "available", tone: "success" },
      documents: { code: "upToDate", tone: "success" },
      charter: { code: "signed", tone: "success" },
      payments: { code: "active", tone: "success" },
    });
  });

  it("dossier pas encore validé : le Kbis de plus de 3 mois est à refaire", () => {
    expect(profileHubStatuses({ ...facts, validated: false }, now).documents).toEqual({
      code: "toComplete",
      tone: "warning",
    });
  });

  it("échéance proche, avis à répondre, date de disponibilité", () => {
    const s = profileHubStatuses(
      {
        ...facts,
        documents: facts.documents.map((d) =>
          d.type === "urssaf" ? { ...d, date_fin: "2026-10-30" } : d,
        ),
        reviewsToAnswer: 2,
        availableFrom: "2026-11-12",
      },
      now,
    );
    expect(s.documents).toEqual({ code: "toRenew", n: 1, tone: "warning" });
    expect(s.reviews).toEqual({ code: "toAnswer", n: 2, tone: "danger" });
    expect(s.availability).toEqual({ code: "from", date: "2026-11-12", tone: "neutral" });
  });
});
