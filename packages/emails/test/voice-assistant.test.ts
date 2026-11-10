import { describe, expect, it } from "vitest";
import {
  notificationContent,
  renderVoiceAppointment,
  renderVoiceDossier,
  renderVoiceSignupLink,
  renderVoiceRequestsStatus,
  renderVoiceWorkRequest,
  voiceAppointmentContent,
  voiceDossierContent,
  voiceSignupLinkContent,
  voiceRequestsStatusContent,
  voiceWorkRequestContent,
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
    expect(link.text).toContain("Manon, l'assistante téléphonique de MENAO");
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
    ).toContain("Manon");
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

describe("demande de travaux préparée au téléphone (ADR 0227)", () => {
  const base = {
    firstName: "Léa",
    summary: "Réparer une fuite sous l'évier",
    city: "Antibes",
    available: 3,
    url: "https://menao.example/demande-preparee/abc",
  };

  it("lien de vérification, résumé en citation, artisans proposés", () => {
    const content = voiceWorkRequestContent(base);
    expect(content.cta.url).toBe(base.url);
    expect(content.quote).toBe(base.summary);
    expect(content.paragraphs[0]).toBe("Bonjour Léa,");
    expect(content.paragraphs[2]).toContain("3 artisans vérifiés disponibles près de Antibes");
    expect(content.paragraphs.join(" ")).toContain("rien n'est envoyé aux artisans");
  });

  it("un seul artisan, ou aucun : l'équipe peut chercher", () => {
    expect(voiceWorkRequestContent({ ...base, available: 1 }).paragraphs[2]).toContain(
      "Un artisan vérifié disponible près de Antibes vous est proposé",
    );
    expect(voiceWorkRequestContent({ ...base, available: 0, city: null }).paragraphs[2]).toBe(
      "Aucun artisan n'est encore disponible pour ces travaux : depuis le lien, vous pourrez demander à l'équipe MENAO de chercher pour vous.",
    );
  });

  it("rendu HTML et texte", () => {
    const email = renderVoiceWorkRequest(base, SITE);
    expect(email.subject).toBe("Votre demande de travaux est prête");
    expect(email.html).toContain(base.url);
    expect(email.text).toContain(base.url);
  });
});

describe("« Où en est ma demande ? » (ADR 0229)", () => {
  const project = {
    summary: "Réparer une fuite sous l'évier",
    trade: "Plombier",
    city: "Antibes",
    sentAt: "2026-11-03T09:00:00Z",
    artisans: [
      { name: "Bruno", status: "acceptee" },
      { name: "Marc Plomberie", status: "envoyee" },
      { name: null, status: "refusee" },
    ],
  };

  it("chaque projet avec la réponse de chaque artisan, bouton vers l'espace client", () => {
    const content = voiceRequestsStatusContent(
      { firstName: "Léa", account: true, pendingPrepared: 0, projects: [project] },
      SITE,
    );
    expect(content.paragraphs[0]).toBe("Bonjour Léa,");
    expect(content.paragraphs[1]).toBe(
      "« Réparer une fuite sous l'évier » (Plombier, Antibes), envoyée le 3 novembre : Bruno a accepté, ses coordonnées sont dans votre espace ; Marc Plomberie n'a pas encore répondu ; un artisan n'est pas disponible.",
    );
    expect(content.cta).toEqual({
      label: "Ouvrir mon espace",
      url: "https://menao.example/mon-espace",
    });
  });

  it("aucun artisan n'a donné suite : proposer d'en choisir un autre", () => {
    const content = voiceRequestsStatusContent(
      {
        firstName: null,
        account: true,
        pendingPrepared: 0,
        projects: [{ ...project, artisans: [{ name: "Bruno", status: "expiree" }] }],
      },
      SITE,
    );
    expect(content.paragraphs.join(" ")).toContain("vous pouvez choisir un autre artisan");
  });

  it("demande préparée au téléphone en attente, sans compte", () => {
    const content = voiceRequestsStatusContent(
      { firstName: "Nina", account: false, pendingPrepared: 1, projects: [] },
      SITE,
    );
    expect(content.paragraphs.join(" ")).toContain("« Votre demande de travaux est prête »");
    expect(content.cta.url).toBe("https://menao.example");
  });

  it("compte sans demande récente", () => {
    const content = voiceRequestsStatusContent(
      { firstName: null, account: true, pendingPrepared: 0, projects: [] },
      SITE,
    );
    expect(content.paragraphs[1]).toBe(
      "Vous n'avez envoyé aucune demande de travaux ces quatre derniers mois.",
    );
  });

  it("rendu", () => {
    const email = renderVoiceRequestsStatus(
      { firstName: "Léa", account: true, pendingPrepared: 0, projects: [project] },
      SITE,
    );
    expect(email.subject).toBe("Où en est votre demande de travaux");
    expect(email.text).toContain("Marc Plomberie n'a pas encore répondu");
  });
});
