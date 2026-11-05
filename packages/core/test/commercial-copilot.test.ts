import { describe, expect, it } from "vitest";
import {
  briefTexts,
  callSlot,
  composeProspectMessage,
  copilotViolations,
  demandWorthCiting,
  emailMessageUrl,
  normalizeCopilotBrief,
  normalizeCopilotMessage,
  normalizeCopilotReport,
  parseStoredBrief,
  prospectTradeCodes,
  reportTexts,
  smsMessageUrl,
  upperMenao,
  whatsAppMessageUrl,
  type RawCopilotReport,
} from "../src/commercial-copilot";

// Jeudi 5 novembre 2026, 11 h à Paris.
const NOW = { date: "2026-11-05", time: "11:00" };

describe("copilote du commercial (ADR 0223) : métiers d'après le code APE", () => {
  it("codes sans ambiguïté, avec ou sans point", () => {
    expect(prospectTradeCodes("43.22A")).toEqual(["plombier"]);
    expect(prospectTradeCodes("4322B")).toEqual(["chauffagiste", "climaticien"]);
    expect(prospectTradeCodes(" 43.21a ")).toEqual(["electricien"]);
  });
  it("codes ambigus ou inconnus : aucun métier", () => {
    expect(prospectTradeCodes("43.29A")).toEqual([]);
    expect(prospectTradeCodes("62.01Z")).toEqual([]);
    expect(prospectTradeCodes(null)).toEqual([]);
  });
  it("la liste renvoyée est une copie", () => {
    prospectTradeCodes("43.22A").push("intrus");
    expect(prospectTradeCodes("43.22A")).toEqual(["plombier"]);
  });
});

describe("copilote : promesses et formules interdites", () => {
  it.each([
    ["Avec MENAO, des clients garantis dès le premier mois.", "garantie"],
    ["Je vous garantis des chantiers toute l'année.", "garantie"],
    ["Vous recevrez au moins 5 demandes par mois.", "nombre_promis"],
    ["Nos artisans ont en moyenne dix chantiers de plus.", "nombre_promis"],
    ["Avec la formule Base, jusqu'à 10 demandes par mois.", "nombre_promis"],
    ["Vous pourriez gagner 2 000 € de plus par mois.", "revenu"],
    ["Votre chiffre d'affaires peut doubler.", "revenu"],
    ["Contrairement à Checkatrade, rien n'est revendu.", "concurrent"],
    ["Vous êtes sur Pages Jaunes ? Ici c'est différent.", "concurrent"],
    ["Vous gardez Obat pour vos devis ?", "concurrent"],
    ["MENAO réunit les meilleurs artisans de la Côte d'Azur.", "meilleurs"],
    ["Dernière chance : plus que 3 places dans votre secteur !", "urgence"],
    ["20 % de remise si vous signez aujourd'hui.", "remise"],
    ["C'est gratuit à vie pour les premiers inscrits.", "remise"],
    ["Votre dossier est validé en 48 h.", "delai_dossier"],
    ["Et à l'année, c'est 2 mois offerts.", "engagement_annuel"],
    ["Inscrivez-vous sur https://menao.fr/p/julien/pro", "adresse_web"],
    ["Rendez-vous sur www.menao.fr", "adresse_web"],
  ])("« %s » → %s", (text, code) => {
    expect(copilotViolations(text)).toContain(code);
  });

  it.each([
    "Bonjour, je suis Julien, de MENAO. 150 € HT par mois, sans commission, et 2 mois gratuits pour juger.",
    "Chaque demande est envoyée à 3 artisans au plus, et vous avez 72 h pour répondre.",
    "Exemple : une commission de 15 % sur un chantier de 8 000 €, c'est 1 200 €.",
    "Ces 30 derniers jours, 14 particuliers ont cherché un plombier près d'Antibes.",
    "On fait l'inscription ensemble en une dizaine de minutes.",
    "Personne ne peut promettre un nombre de demandes : pendant l'essai, vous arrêtez quand vous voulez.",
    "Tout est sur menao.fr, et je vous laisse le lien : [lien]",
    "Au mois, c'est sans engagement.",
  ])("texte conforme : « %s »", (text) => {
    expect(copilotViolations(text)).toEqual([]);
  });

  it("MENAO en majuscules, pas le nom de domaine", () => {
    expect(upperMenao("Bonjour de Menao, voir menao.fr")).toBe("Bonjour de MENAO, voir menao.fr");
  });
});

describe("copilote : fiche de préparation", () => {
  const raw = {
    portrait: "  Plombier installé depuis 2019 à   Antibes, entreprise individuelle. ",
    arguments: [
      { titre: "Zéro commission", detail: "150 € HT par mois, rien sur ses chantiers." },
      { titre: "Devis à la voix", detail: "Il dicte, MENAO rédige les lignes." },
      {
        titre: "Ses propres clients",
        detail: "Sa carte de visite envoie les demandes à lui seul.",
      },
      { titre: "En trop", detail: "Quatrième argument ignoré." },
    ],
    objections: [
      { objection: "Je n'ai pas le temps", reponse: "On fait l'inscription ensemble." },
      { objection: "C'est cher", reponse: "Une commission de 15 % coûterait bien plus." },
      { objection: "", reponse: "Réponse sans objection, ignorée." },
    ],
    question_ouverture: "Comment trouvez-vous vos clients aujourd'hui ?",
  };

  it("nettoyée et bornée à 3 arguments", () => {
    const brief = normalizeCopilotBrief(raw);
    expect(brief?.portrait).toBe(
      "Plombier installé depuis 2019 à Antibes, entreprise individuelle.",
    );
    expect(brief?.arguments).toHaveLength(3);
    expect(brief?.objections).toHaveLength(2);
  });

  it("inutilisable sans question ou avec un seul argument", () => {
    expect(normalizeCopilotBrief({ ...raw, question_ouverture: " " })).toBeNull();
    expect(normalizeCopilotBrief({ ...raw, arguments: raw.arguments.slice(0, 1) })).toBeNull();
  });

  it("seuls les textes dits à l'artisan sont vérifiés", () => {
    const brief = normalizeCopilotBrief({
      ...raw,
      portrait: "Il dit faire 20 chantiers par mois avec Obat.",
      objections: [
        {
          objection: "J'ai déjà 15 clients par mois",
          reponse: "Tant mieux : vos clients passent par votre fiche.",
        },
        ...raw.objections,
      ],
    });
    if (!brief) throw new Error("fiche attendue");
    expect(briefTexts(brief).flatMap(copilotViolations)).toEqual([]);
  });

  it("relue depuis la base", () => {
    const brief = normalizeCopilotBrief(raw);
    if (!brief) throw new Error("fiche attendue");
    const demand = { recherches: 14, jours: 30, rayonKm: 20, metiers: ["plombier"] };
    expect(parseStoredBrief({ v: 1, ...brief, demand })).toEqual({ v: 1, ...brief, demand });
    expect(parseStoredBrief({ v: 1, ...brief, demand: "x" })?.demand).toBeNull();
    expect(parseStoredBrief({ v: 2, ...brief })).toBeNull();
    expect(parseStoredBrief(null)).toBeNull();
  });

  it("demande citée à partir de 5 recherches", () => {
    expect(demandWorthCiting({ recherches: 4, jours: 30, rayonKm: 20, metiers: [] })).toBe(false);
    expect(demandWorthCiting({ recherches: 5, jours: 30, rayonKm: 20, metiers: [] })).toBe(true);
    expect(demandWorthCiting(null)).toBe(false);
  });
});

describe("copilote : premier message", () => {
  it("emplacement du lien ajouté s'il manque, objet seulement pour un e-mail", () => {
    expect(
      normalizeCopilotMessage({ objet: "Ignoré", texte: "Bonjour, Julien de menao." }, "sms"),
    ).toEqual({
      subject: null,
      body: "Bonjour, Julien de MENAO.\n\n[lien]",
    });
    expect(
      normalizeCopilotMessage(
        { objet: "MENAO à Antibes", texte: "Bonjour,\n\nVoici : [lien]\n\nJulien" },
        "email",
      ),
    ).toEqual({ subject: "MENAO à Antibes", body: "Bonjour,\n\nVoici : [lien]\n\nJulien" });
  });

  it("script d'appel : aucun lien", () => {
    expect(
      normalizeCopilotMessage({ objet: "", texte: "Bonjour, Julien de MENAO. [lien]" }, "appel"),
    ).toEqual({
      subject: null,
      body: "Bonjour, Julien de MENAO.",
    });
  });

  it("vide ou bien trop long : refusé", () => {
    expect(normalizeCopilotMessage({ objet: "", texte: "  " }, "sms")).toBeNull();
    expect(normalizeCopilotMessage({ objet: "", texte: "a".repeat(481) }, "sms")).toBeNull();
    expect(normalizeCopilotMessage({ objet: "", texte: "a".repeat(470) }, "sms")).not.toBeNull();
  });

  it("assemblé avec le lien et la mention de refus", () => {
    const options = {
      link: "https://menao.fr/p/julien/pro",
      optOut: "Pas intéressé ? Dites-le-moi.",
    };
    expect(composeProspectMessage("sms", "Bonjour.\n\n[lien]", options)).toBe(
      "Bonjour.\n\nhttps://menao.fr/p/julien/pro\n\nPas intéressé ? Dites-le-moi.",
    );
    expect(composeProspectMessage("email", "Voici : [lien] et encore [lien]", options)).toBe(
      "Voici : https://menao.fr/p/julien/pro et encore\n\nPas intéressé ? Dites-le-moi.",
    );
    expect(composeProspectMessage("appel", "Bonjour [lien]", options)).toBe("Bonjour");
  });

  it("liens d'ouverture : WhatsApp, SMS, e-mail", () => {
    expect(whatsAppMessageUrl("+33612345678", "Bonjour à vous")).toBe(
      "https://wa.me/33612345678?text=Bonjour%20%C3%A0%20vous",
    );
    expect(whatsAppMessageUrl(null, "Bonjour")).toBe("https://wa.me/?text=Bonjour");
    expect(smsMessageUrl("+33612345678", "Bonjour")).toBe("sms:+33612345678?&body=Bonjour");
    expect(smsMessageUrl(null, "Bonjour")).toBe("sms:?&body=Bonjour");
    expect(emailMessageUrl("Objet", "Texte")).toBe("mailto:?subject=Objet&body=Texte");
    expect(emailMessageUrl(null, "Texte")).toBe("mailto:?body=Texte");
  });
});

describe("copilote : créneau d'appel dans la plage du guide", () => {
  it("en semaine dans la plage : inchangé", () => {
    expect(callSlot("2026-11-06", "15:00", NOW)).toEqual({ date: "2026-11-06", time: "15:00" });
  });
  it("samedi → lundi, à l'heure voulue", () => {
    expect(callSlot("2026-11-07", "11:00", NOW)).toEqual({ date: "2026-11-09", time: "11:00" });
  });
  it("trop tôt → 10 h ; midi → 14 h ; trop tard → lendemain 10 h", () => {
    expect(callSlot("2026-11-06", "08:30", NOW)).toEqual({ date: "2026-11-06", time: "10:00" });
    expect(callSlot("2026-11-06", "13:15", NOW)).toEqual({ date: "2026-11-06", time: "14:00" });
    expect(callSlot("2026-11-06", "21:00", NOW)).toEqual({ date: "2026-11-09", time: "10:00" });
  });
  it("jamais dans le passé, arrondi au quart d'heure", () => {
    expect(callSlot("2026-11-01", "10:00", NOW)).toEqual({ date: "2026-11-05", time: "11:00" });
    expect(callSlot("2026-11-05", "10:00", { date: "2026-11-05", time: "16:07" })).toEqual({
      date: "2026-11-05",
      time: "16:15",
    });
    expect(callSlot("2026-11-05", null, { date: "2026-11-05", time: "19:50" })).toEqual({
      date: "2026-11-06",
      time: "10:00",
    });
  });
  it("date invalide : aujourd'hui", () => {
    expect(callSlot("demain", "15:00", NOW)).toEqual({ date: "2026-11-05", time: "15:00" });
  });
});

describe("copilote : compte rendu dicté", () => {
  const raw: RawCopilotReport = {
    resume: "Visite chez le plombier. Intéressé par le devis à la voix, hésite sur le prix.",
    interet: "tiede",
    objections: ["C'est cher", "Pas le temps"],
    statut: "demo_faite",
    ne_plus_contacter: false,
    prochaine_action: {
      type: "appel",
      date: "2026-11-07",
      heure: "18:00",
      libelle: "Rappeler après sa réflexion",
    },
    message_suivi: "Merci pour votre accueil ce matin, de la part de Julien, de Menao.",
  };

  it("appel ramené dans la plage du guide, MENAO en majuscules", () => {
    const report = normalizeCopilotReport(raw, NOW);
    expect(report?.nextAction).toEqual({
      kind: "appel",
      date: "2026-11-09",
      time: "18:00",
      label: "Rappeler après sa réflexion",
    });
    expect(report?.followUp).toContain("MENAO");
    expect(report && reportTexts(report)).toEqual([report?.followUp]);
  });

  it("« ne plus contacter » l'emporte : pas intéressé, ni action ni message", () => {
    const report = normalizeCopilotReport(
      { ...raw, ne_plus_contacter: true, statut: "rdv_pris" },
      NOW,
    );
    expect(report).toMatchObject({
      status: "pas_interesse",
      doNotContact: true,
      nextAction: null,
      followUp: null,
    });
    expect(report && reportTexts(report)).toEqual([]);
  });

  it("valeurs inconnues : repli prudent", () => {
    const report = normalizeCopilotReport(
      {
        ...raw,
        interet: "brûlant",
        statut: "signé",
        prochaine_action: { type: "visite", date: "2026-10-01", heure: null, libelle: "Démo" },
        message_suivi: null,
      },
      NOW,
    );
    expect(report).toMatchObject({
      interest: "tiede",
      status: "a_contacter",
      nextAction: { kind: "visite", date: "2026-11-05", time: "09:00", label: "Démo" },
      followUp: null,
    });
  });

  it("aucune action, ou date absente", () => {
    expect(
      normalizeCopilotReport(
        { ...raw, prochaine_action: { type: "aucune", date: null, heure: null, libelle: "" } },
        NOW,
      )?.nextAction,
    ).toBeNull();
    expect(
      normalizeCopilotReport(
        {
          ...raw,
          prochaine_action: { type: "appel", date: null, heure: null, libelle: "Relancer" },
        },
        NOW,
      )?.nextAction,
    ).toEqual({ kind: "appel", date: "2026-11-09", time: "10:00", label: "Relancer" });
  });

  it("résumé vide : inutilisable", () => {
    expect(normalizeCopilotReport({ ...raw, resume: " " }, NOW)).toBeNull();
  });
});
