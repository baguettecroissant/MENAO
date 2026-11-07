import { describe, expect, it } from "vitest";
import { SMS_MAX_LENGTH, gsmLength, gsmSafe, smsContent } from "../src/sms.ts";

describe("SMS des rappels au client (ADR 0239)", () => {
  it("alphabet GSM : accents remplacés, guillemets droits", () => {
    expect(gsmSafe("Fenêtre « côté » jardin — été")).toBe('Fenetre " coté " jardin - été');
    expect(gsmSafe("Façade 🙂 œuvre")).toBe("Facade oeuvre");
    expect(gsmLength("10 €")).toBe(5);
  });

  it("rendez-vous : au nom de l'entreprise, heure de Paris, un seul SMS", () => {
    const text = smsContent(
      "rdv_rappel",
      {
        entreprise: "Plomberie Dupont",
        titre: "Fuite sous l'évier",
        rendez_vous: "2026-11-10T08:30:00Z",
      },
      "menao.fr",
    );
    expect(text).toBe(
      'Plomberie Dupont (via MENAO) : rappel de votre rendez-vous demain à 09h30 pour "Fuite sous l\'évier". Détails sur menao.fr/mon-espace',
    );
    expect(gsmLength(text ?? "")).toBeLessThanOrEqual(SMS_MAX_LENGTH);
    expect(text).not.toMatch(/stop/i);
  });

  it("acompte et solde : montant, lien de paiement", () => {
    expect(
      smsContent(
        "paiement_relance",
        { entreprise: "Plâtrerie Paul", titre: "Doublage", tranche: "acompte", montant: 21000 },
        "menao.fr",
      ),
    ).toBe(
      'Platrerie Paul (via MENAO) : l\'acompte de 210,00 € pour "Doublage" reste à régler. Paiement en ligne : menao.fr/mon-espace',
    );
    expect(
      smsContent(
        "acompte_relance",
        { entreprise: "X", titre: "Cuisine", tranche: "solde" },
        "menao.fr",
      ),
    ).toContain("le solde pour");
  });

  it("titre trop long : raccourci pour tenir en un SMS", () => {
    const text = smsContent(
      "avis_relance",
      { entreprise: "Entreprise Générale du Bâtiment", titre: "Rénovation complète ".repeat(10) },
      "menao.fr",
    );
    expect(gsmLength(text ?? "")).toBeLessThanOrEqual(SMS_MAX_LENGTH);
    expect(text).toContain('..."');
    expect(text).toContain("menao.fr/mon-espace");
  });

  it("type sans SMS : rien", () => {
    expect(smsContent("devis_recu", {}, "menao.fr")).toBeNull();
  });
});
