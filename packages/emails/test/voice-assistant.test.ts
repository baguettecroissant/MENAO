import { describe, expect, it } from "vitest";
import {
  renderVoiceDossier,
  renderVoiceSignupLink,
  voiceDossierContent,
  voiceSignupLinkContent,
} from "../src/index";

const SITE = "https://menao.example/";

describe("e-mails de la secrétaire vocale (ADR 0225)", () => {
  it("lien d'inscription : bouton vers l'inscription artisan, prénom s'il est connu", () => {
    const content = voiceSignupLinkContent({ firstName: "Jean", siteUrl: SITE });
    expect(content.cta.url).toBe("https://menao.example/pro/inscription");
    expect(content.paragraphs[0]).toBe("Bonjour Jean,");
    expect(voiceSignupLinkContent({ firstName: null, siteUrl: SITE }).paragraphs[0]).toBe(
      "Bonjour,",
    );
  });

  it("dossier en brouillon : étapes manquantes listées", () => {
    const content = voiceDossierContent(
      {
        firstName: null,
        status: "brouillon",
        signupMissing: ["charte", "documents"],
        activationMissing: [],
      },
      SITE,
    );
    expect(content.paragraphs).toContain(
      "Pour envoyer votre dossier, il vous reste : la charte qualité et vos documents.",
    );
    expect(content.cta.url).toBe("https://menao.example/pro/onboarding");
  });

  it("dossier validé : paiements et formule, ou tout est prêt", () => {
    const missing = voiceDossierContent(
      {
        firstName: null,
        status: "valide",
        signupMissing: [],
        activationMissing: ["paiements", "formule"],
      },
      SITE,
    );
    expect(missing.paragraphs.join(" ")).toContain(
      "l'activation de vos paiements et le choix de votre formule",
    );
    const ready = voiceDossierContent(
      { firstName: null, status: "valide", signupMissing: [], activationMissing: [] },
      SITE,
    );
    expect(ready.paragraphs.join(" ")).toContain("vous êtes visible");
  });

  it("dossier en vérification, ou refusé : jamais de délai ni de motif", () => {
    const checking = voiceDossierContent(
      { firstName: null, status: "en_verification", signupMissing: [], activationMissing: [] },
      SITE,
    );
    expect(checking.paragraphs.join(" ")).not.toMatch(/\d+ ?(h|heures|jours)/);
    const refused = voiceDossierContent(
      { firstName: null, status: "refuse", signupMissing: [], activationMissing: [] },
      SITE,
    );
    expect(refused.cta.url).toBe("https://menao.example/contact");
  });

  it("rendus HTML et texte, avec le pied de page de la secrétaire", () => {
    const link = renderVoiceSignupLink("Jean", SITE);
    expect(link.html).toContain("https://menao.example/pro/inscription");
    expect(link.text).toContain("Camille, l'assistante téléphonique de MENAO");
    const dossier = renderVoiceDossier(
      { firstName: "Jean", status: "en_verification", signupMissing: [], activationMissing: [] },
      SITE,
    );
    expect(dossier.subject).toBe("Votre dossier MENAO est en cours de vérification");
  });
});
