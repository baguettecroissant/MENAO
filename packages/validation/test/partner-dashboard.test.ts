import { describe, expect, it } from "vitest";
import { parsePartnerDashboard } from "../src/partner-dashboard";

const ok = {
  nom: "Agence Exemple",
  code: "agence-nice",
  status: "actif",
  projects: 12,
  qualified: 5,
  artisans: 2,
  paying: 1,
  pending_cents: 1500,
  validated_cents: 3000,
  paid_cents: 0,
  montant_demande_centimes: 1500,
  montant_abonne_centimes: null,
  delai_validation_jours: 30,
};

describe("espace partenaire (F-59)", () => {
  it("réponse attendue, montant non réglé accepté", () => {
    expect(parsePartnerDashboard(ok)).toEqual(ok);
  });

  it("lien inconnu (null) ou réponse inattendue : null", () => {
    expect(parsePartnerDashboard(null)).toBeNull();
    expect(parsePartnerDashboard({ ...ok, status: "inconnu" })).toBeNull();
    expect(parsePartnerDashboard({ ...ok, pending_cents: -1 })).toBeNull();
  });
});
