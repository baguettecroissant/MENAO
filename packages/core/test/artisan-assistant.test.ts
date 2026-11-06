import { describe, expect, it } from "vitest";
import {
  ARTISAN_ASSISTANT_ANSWER_MAX_LENGTH,
  artisanAccountText,
  artisanAssistantQuestionCount,
  normalizeArtisanAssistantAnswer,
  normalizeArtisanAssistantHistory,
} from "../src/artisan-assistant";

describe("assistant de l'espace artisan (ADR 0236)", () => {
  it("résumé du compte : états et nombres, sans client", () => {
    const text = artisanAccountText({
      dossier: "valide",
      en_pause: false,
      paiements_actives: false,
      franchise_tva: true,
      abonnement: { formule: "base", statut: "trialing", fin_essai: "2026-11-26" },
      agents: { secondes_incluses: 0, secondes_recharge: 0, secondes_restantes: 0 },
      demandes_en_attente: 2,
      prochaine_expiration_demande: "2026-11-08T09:30:00Z",
      chantiers: { rdv_planifie: 1, devis_envoye: 2, annule: 0 },
      devis_brouillons: 1,
      devis_en_attente_client: 0,
      documents_refuses: 0,
      documents_a_renouveler: 1,
      prochain_rendez_vous: "2026-11-09T07:00:00Z",
    });
    expect(text).toContain("Dossier : vérifié.");
    expect(text).toContain("Paiements en ligne de ses clients : pas encore activés.");
    expect(text).toContain("TVA : franchise en base");
    expect(text).toContain("Formule : Base, essai gratuit en cours jusqu'au jeudi 26 novembre.");
    expect(text).toContain(
      "Demandes en attente de sa réponse : 2 (la plus proche expire le dimanche 8 novembre",
    );
    expect(text).toContain(
      "Chantiers : rendez-vous planifié, devis à faire (1) ; devis envoyé, en attente du client (2).",
    );
    expect(text).not.toContain("annulé");
    expect(text).toContain("Documents qui expirent dans les 30 jours : 1.");
    expect(text).toContain("Prochain rendez-vous : lundi 9 novembre");
    expect(text).not.toContain("Minutes de voix");
    expect(artisanAccountText(null)).toBe("");
    expect(artisanAccountText({ dossier: "en_verification" })).toContain(
      "Formule : aucune pour l'instant.",
    );
  });

  it("minutes de voix seulement si la formule en compte", () => {
    expect(
      artisanAccountText({
        abonnement: { formule: "premium", statut: "active" },
        agents: { secondes_incluses: 18000, secondes_restantes: 17400 },
      }),
    ).toContain("Minutes de voix restantes ce mois-ci : 290.");
  });

  it("réponse nettoyée : texte simple, deux écrans connus au plus", () => {
    const answer = normalizeArtisanAssistantAnswer({
      reponse: "## Titre\nAllez dans **Argent**, onglet Devis.",
      sans_reponse: false,
      hors_sujet: false,
      suggestions: ["Comment l'envoyer", "Comment l'envoyer ?", "x".repeat(80)],
      ecrans: ["devis", "inconnu", "devis", "factures", "agenda"],
    });
    expect(answer).toEqual({
      answer: "Titre\nAllez dans Argent, onglet Devis.",
      suggestHuman: false,
      suggestions: ["Comment l'envoyer ?"],
      screens: ["devis", "factures"],
    });
    const off = normalizeArtisanAssistantAnswer({
      reponse: "Je réponds seulement aux questions sur MENAO.",
      sans_reponse: false,
      hors_sujet: true,
      suggestions: [],
      ecrans: ["accueil"],
    });
    expect(off?.screens).toEqual([]);
    expect(off?.suggestHuman).toBe(true);
    const long = normalizeArtisanAssistantAnswer({
      reponse: "Une phrase. ".repeat(200),
      sans_reponse: false,
      hors_sujet: false,
      suggestions: [],
      ecrans: [],
    });
    expect(long?.answer.length).toBeLessThanOrEqual(ARTISAN_ASSISTANT_ANSWER_MAX_LENGTH);
    expect(
      normalizeArtisanAssistantAnswer({
        reponse: "  ",
        sans_reponse: true,
        hors_sujet: false,
        suggestions: [],
        ecrans: [],
      }),
    ).toBeNull();
  });

  it("historique de l'interface rendu sûr", () => {
    const history = normalizeArtisanAssistantHistory([
      { role: "assistant", text: "Bonjour" },
      { role: "user", text: "Q1" },
      { role: "assistant", text: "R1" },
      { role: "user", text: "Q2" },
      { role: "pirate", text: "x" },
    ]);
    expect(history).toEqual([
      { role: "user", text: "Q1" },
      { role: "assistant", text: "R1" },
    ]);
    expect(artisanAssistantQuestionCount(history)).toBe(1);
    expect(normalizeArtisanAssistantHistory("non")).toEqual([]);
  });
});
