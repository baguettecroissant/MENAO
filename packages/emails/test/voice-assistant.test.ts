import { describe, expect, it } from "vitest";
import {
  notificationContent,
  renderVoiceAppointment,
  renderVoiceDossier,
  renderVoiceSignupLink,
  voiceAppointmentContent,
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

describe("rendez-vous avec le conseiller (ADR 0226)", () => {
  it("confirmation à l'artisan : appel avec le numéro, visite avec l'adresse", () => {
    const call = voiceAppointmentContent(
      {
        firstName: "Jean",
        advisor: "Bruno",
        when: "mardi 10 novembre à 10 h",
        kind: "appel",
        phone: "06 12 34 56 78",
        address: null,
      },
      SITE,
    );
    expect(call.subject).toBe("Votre rendez-vous MENAO le mardi 10 novembre à 10 h");
    expect(call.paragraphs[1]).toBe(
      "Bruno, conseiller MENAO de votre secteur, vous appelle le mardi 10 novembre à 10 h au 06 12 34 56 78.",
    );
    const visit = voiceAppointmentContent(
      {
        firstName: "Jean",
        advisor: "Bruno",
        when: "mardi 10 novembre à 10 h",
        kind: "visite",
        phone: null,
        address: "1 rue Exemple, Antibes",
      },
      SITE,
    );
    expect(visit.paragraphs[1]).toContain(
      "passe vous voir le mardi 10 novembre à 10 h, 1 rue Exemple, Antibes",
    );
    expect(
      renderVoiceAppointment(
        {
          firstName: "Jean",
          advisor: "Bruno",
          when: "mardi 10 novembre à 10 h",
          kind: "appel",
          phone: null,
          address: null,
        },
        SITE,
      ).text,
    ).toContain("Camille");
  });

  it("e-mail au commercial : jamais de coordonnées, lien vers Ma journée", () => {
    const content = notificationContent(
      "rdv_commercial",
      {
        rendez_vous: "2026-11-10T09:00:00Z",
        type: "appel",
        prenom: "Jean",
        metier: "plombier",
        commune: "Antibes",
        motif: "Inscription accompagnée",
        telephone: "+33612345678",
      },
      { siteUrl: SITE, firstName: "Bruno" },
    );
    expect(content.subject).toBe("Nouveau rendez-vous le mardi 10 novembre à 10h00");
    expect(content.paragraphs[1]).toContain("avec Jean, plombier, Antibes");
    expect(JSON.stringify(content)).not.toContain("+33612345678");
    expect(content.quote).toBe("Inscription accompagnée");
    expect(content.cta.url).toBe("https://menao.example/commercial/journee");
  });
});
