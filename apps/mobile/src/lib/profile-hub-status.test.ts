import type { ArtisanOnboardingSnapshot } from "@menao/core";
import { describe, expect, it } from "vitest";
import { hubStatuses, type HubFacts } from "./profile-hub-status";

// Données fictives ; « aujourd'hui » fixé pour les échéances.
const now = new Date("2026-10-18T10:00:00+02:00");
const today = "2026-10-18";

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
    kbis: { status: "valide", dateEmission: "2026-01-10", dateFin: null },
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

const documents = [
  { type: "decennale", status: "valide", date_fin: "2027-06-30" },
  { type: "rc_pro", status: "valide", date_fin: "2027-06-30" },
  { type: "identite", status: "valide", date_fin: "2031-01-01" },
  { type: "urssaf", status: "valide", date_fin: "2027-03-01" },
];

const facts: HubFacts = {
  snapshot,
  validated: true,
  documents,
  photoCount: 5,
  reviewsToAnswer: 0,
  reviewCount: 23,
  level: 3,
  hasRge: true,
  paused: false,
  availableFrom: null,
  today,
};

describe("états des rubriques de « Mon profil » (ADR 0129)", () => {
  it("artisan validé, tout en ordre", () => {
    expect(hubStatuses(facts, now)).toEqual({
      photo: { text: "À jour", tone: "success" },
      portfolio: { text: "5 photos", tone: "neutral" },
      reviews: { text: "23 avis", tone: "neutral" },
      grade: { text: "Niveau 3", tone: "neutral" },
      company: { text: "Vérifiée", tone: "success" },
      trades: { text: "2 métiers · RGE", tone: "neutral" },
      zone: { text: "30 km", tone: "neutral" },
      availability: { text: "Disponible", tone: "success" },
      documents: { text: "À jour", tone: "success" },
      charter: { text: "Signée", tone: "success" },
      payments: { text: "Activés", tone: "success" },
    });
  });

  it("validé depuis plus de 3 mois : le Kbis ancien ne compte plus", () => {
    const old = {
      ...snapshot,
      documents: {
        ...snapshot.documents,
        kbis: { status: "valide" as const, dateEmission: "2025-01-10", dateFin: null },
      },
    };
    expect(hubStatuses({ ...facts, snapshot: old }, now).documents).toEqual({
      text: "À jour",
      tone: "success",
    });
    // Dossier pas encore validé : le Kbis est à refaire.
    expect(hubStatuses({ ...facts, snapshot: old, validated: false }, now).documents).toEqual({
      text: "À compléter",
      tone: "warning",
    });
  });

  it("une attestation qui expire dans 12 jours est à renouveler", () => {
    const soon = documents.map((d) => (d.type === "urssaf" ? { ...d, date_fin: "2026-10-30" } : d));
    expect(hubStatuses({ ...facts, documents: soon }, now).documents).toEqual({
      text: "1 à renouveler",
      tone: "warning",
    });
  });

  it("document refusé, puis en vérification", () => {
    const refused = {
      ...snapshot,
      documents: {
        ...snapshot.documents,
        rc_pro: { status: "refuse" as const, dateEmission: null, dateFin: null },
      },
    };
    expect(hubStatuses({ ...facts, snapshot: refused }, now).documents).toEqual({
      text: "1 refusé",
      tone: "danger",
    });
    const pending = [...documents, { type: "urssaf", status: "en_attente", date_fin: null }];
    expect(hubStatuses({ ...facts, documents: pending }, now).documents).toEqual({
      text: "En vérification",
      tone: "neutral",
    });
  });

  it("avis à répondre, fiche à compléter, zone et paiements manquants", () => {
    const s = hubStatuses(
      {
        ...facts,
        reviewsToAnswer: 2,
        photoCount: 0,
        snapshot: {
          ...snapshot,
          presentationLength: 120,
          zoneMode: null,
          connectChargesEnabled: false,
          charterAccepted: false,
          sireneActive: false,
        },
      },
      now,
    );
    expect(s.reviews).toEqual({ text: "2 à répondre", tone: "danger" });
    expect(s.photo).toEqual({ text: "À compléter", tone: "warning" });
    expect(s.portfolio).toEqual({ text: "Aucune photo", tone: "warning" });
    expect(s.zone).toEqual({ text: "À définir", tone: "warning" });
    expect(s.payments).toEqual({ text: "À activer", tone: "warning" });
    expect(s.charter).toEqual({ text: "À signer", tone: "warning" });
    expect(s.company).toEqual({ text: "À vérifier", tone: "warning" });
  });

  it("disponibilités : en pause, ou à partir d'une date", () => {
    expect(hubStatuses({ ...facts, paused: true }, now).availability).toEqual({
      text: "En pause",
      tone: "warning",
    });
    expect(hubStatuses({ ...facts, availableFrom: "2026-11-12" }, now).availability).toEqual({
      text: "Dès le 12 novembre 2026",
      tone: "neutral",
    });
  });

  it("zone en communes, sans grade connu", () => {
    const s = hubStatuses(
      { ...facts, level: null, snapshot: { ...snapshot, zoneMode: "communes", communeCount: 4 } },
      now,
    );
    expect(s.zone).toEqual({ text: "4 communes", tone: "neutral" });
    expect(s.grade).toBeNull();
  });
});
