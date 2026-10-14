import { Constants } from "@menao/db";
import { describe, expect, it } from "vitest";
import { NOTIFICATION_TYPES, notificationContent, plainText, quoted } from "../src/content.ts";
import { renderNotification } from "../src/render.tsx";

const ctx = { siteUrl: "https://menao.example/", firstName: "Camille" };
const ids = {
  request_id: "11111111-1111-4111-8111-111111111111",
  chantier_id: "22222222-2222-4222-8222-222222222222",
};

describe("contenu des notifications (F-41)", () => {
  it("nouvelle demande : client, ville, urgence, échéance et lien vers la demande", () => {
    const c = notificationContent(
      "nouvelle_demande",
      {
        ...ids,
        titre: "Réparer une fuite",
        client: "Dominique",
        ville: "Nice",
        urgence: true,
        expire_le: "2026-10-12T08:00:00Z",
      },
      { ...ctx, firstName: "Noé" },
    );
    expect(c.subject).toBe("Nouvelle demande de chantier à Nice");
    expect(c.paragraphs).toEqual([
      "Bonjour Noé,",
      "Dominique vous a choisi pour son projet «\u00a0Réparer une fuite\u00a0» à Nice.",
      "Le client indique que les travaux sont urgents.",
      "Répondez avant le lundi 12 octobre à 10h00 : fixez un rendez-vous ou refusez la demande.",
    ]);
    expect(c.cta).toEqual({
      label: "Voir la demande",
      url: "https://menao.example/pro/demandes/11111111-1111-4111-8111-111111111111",
    });
  });

  it("rendez-vous fixé, déplacé : date et heure de Paris", () => {
    const fixe = notificationContent(
      "rdv_fixe",
      { ...ids, titre: "Prises", artisan: "Xavier", rendez_vous: "2026-02-20T15:30:00Z" },
      ctx,
    );
    expect(fixe.subject).toBe("Rendez-vous fixé le vendredi 20 février à 16h30");
    expect(fixe.paragraphs[1]).toBe(
      "Xavier a fixé un rendez-vous pour votre projet «\u00a0Prises\u00a0» : le vendredi 20 février à 16h30.",
    );
    expect(fixe.cta).toEqual({
      label: "Voir mon chantier",
      url: `https://menao.example/mon-espace/chantiers/${ids.chantier_id}`,
    });
    const modifie = notificationContent(
      "rdv_modifie",
      { titre: "Prises", artisan: "Xavier", rendez_vous: "2026-07-14T07:00:00Z" },
      ctx,
    );
    expect(modifie.subject).toBe("Rendez-vous déplacé au mardi 14 juillet à 09h00");
  });

  it("rappel de la veille : version client et version artisan (adresse, lien du chantier)", () => {
    const data = {
      ...ids,
      titre: "Prises",
      artisan: "Xavier",
      client: "Camille Exemple",
      adresse: "1 Rue de l'Exemple 06000 Nice",
      rendez_vous: "2026-02-20T15:30:00Z",
    };
    const client = notificationContent("rdv_rappel", { ...data, destinataire: "particulier" }, ctx);
    expect(client.subject).toBe("Rappel : rendez-vous demain à 16h30");
    expect(client.paragraphs[1]).toBe(
      "Xavier vient demain, vendredi 20 février à 16h30 pour votre projet «\u00a0Prises\u00a0».",
    );
    const artisan = notificationContent("rdv_rappel", { ...data, destinataire: "artisan" }, ctx);
    expect(artisan.paragraphs.slice(1)).toEqual([
      "Vous avez rendez-vous demain, vendredi 20 février à 16h30 chez Camille Exemple pour «\u00a0Prises\u00a0».",
      "Adresse : 1 Rue de l'Exemple 06000 Nice.",
    ]);
    expect(artisan.cta.url).toBe(
      "https://menao.example/pro/chantiers/22222222-2222-4222-8222-222222222222",
    );
  });

  it("annulation : motif de l'artisan en citation", () => {
    const c = notificationContent(
      "chantier_annule",
      { titre: "Prises", artisan: "Xavier", motif: "  Planning complet  " },
      ctx,
    );
    expect(c.subject).toBe("Xavier a annulé le rendez-vous");
    expect(c.quote).toBe("Planning complet");
    expect(c.cta.label).toBe("Choisir un autre artisan");
  });

  it("annulation par le client (F-11, F-12) : demande ou chantier, motif et commentaire", () => {
    const pro = { ...ctx, firstName: "Xavier" };
    const demande = notificationContent(
      "demande_annulee",
      {
        client: "Camille",
        metier: "Électricien",
        ville: "Nice",
        raison: "autre_artisan",
        message: "  Trouvé plus près.  ",
      },
      pro,
    );
    expect(demande.subject).toBe("Camille a annulé sa demande");
    expect(demande.paragraphs.slice(1)).toEqual([
      "Camille a annulé sa demande de chantier (Électricien, à Nice) : vous n'avez plus à y répondre.",
      "Motif : un autre artisan a été choisi.",
    ]);
    expect(demande.quote).toBe("Trouvé plus près.");
    expect(demande.cta).toEqual({
      label: "Voir mes demandes",
      url: "https://menao.example/pro/demandes",
    });

    const chantier = notificationContent(
      "chantier_annule",
      {
        ...ids,
        destinataire: "artisan",
        titre: "Prises",
        client: "Camille",
        raison: "plus_besoin",
      },
      pro,
    );
    expect(chantier.subject).toBe("Camille a annulé le chantier");
    expect(chantier.paragraphs.slice(1)).toEqual([
      `Camille a annulé le chantier ${quoted("Prises")} : le rendez-vous est annulé.`,
      "Motif : les travaux ne sont plus nécessaires.",
    ]);
    expect(chantier.quote).toBeNull();
    expect(chantier.cta).toEqual({
      label: "Voir le chantier",
      url: `https://menao.example/pro/chantiers/${ids.chantier_id}`,
    });
  });

  it("devis reçu, refusé, modification demandée : numéro, montant, motif et message", () => {
    const quoteId = "33333333-3333-4333-8333-333333333333";
    const recu = notificationContent(
      "devis_recu",
      {
        ...ids,
        quote_id: quoteId,
        titre: "Prises",
        artisan: "Xavier",
        numero: "DEVIS-2026-0001",
        montant_ttc: 33000,
      },
      ctx,
    );
    expect(recu.subject).toBe("Nouveau devis disponible pour votre chantier !");
    expect(recu.paragraphs[1]).toContain(
      `Xavier vous a envoyé son devis n° DEVIS-2026-0001 pour votre projet ${quoted("Prises")}, d'un montant de 330,00`,
    );
    expect(recu.cta).toEqual({
      label: "Voir le devis",
      url: `https://menao.example/mon-espace/devis/${quoteId}`,
    });

    const refuse = notificationContent(
      "devis_refuse",
      {
        ...ids,
        titre: "Prises",
        client: "Camille",
        numero: "DEVIS-2026-0001-v2",
        motif: "trop_cher",
        message: " Budget dépassé. ",
      },
      { ...ctx, firstName: "Xavier" },
    );
    expect(refuse.subject).toBe("Camille a refusé votre devis");
    expect(refuse.paragraphs.slice(1)).toEqual([
      `Camille a refusé votre devis n° DEVIS-2026-0001-v2 pour ${quoted("Prises")}.`,
      "Motif indiqué : prix trop élevé.",
    ]);
    expect(refuse.quote).toBe("Budget dépassé.");
    expect(refuse.cta.url).toBe(`https://menao.example/pro/chantiers/${ids.chantier_id}`);

    const modification = notificationContent(
      "devis_modification",
      {
        ...ids,
        titre: "Prises",
        client: "Camille",
        numero: "DEVIS-2026-0001",
        message: "Une prise de plus.",
      },
      { ...ctx, firstName: "Xavier" },
    );
    expect(modification.subject).toBe("Camille demande une modification de votre devis");
    expect(modification.quote).toBe("Une prise de plus.");
    expect(modification.cta).toEqual({
      label: "Modifier le devis",
      url: `https://menao.example/pro/chantiers/${ids.chantier_id}/devis`,
    });
  });

  it("devis signé : client, numéro, montant et lien vers le chantier", () => {
    const signe = notificationContent(
      "devis_signe",
      { ...ids, titre: "Prises", client: "Camille", numero: "DEVIS-2026-0001", montant_ttc: 33000 },
      { ...ctx, firstName: "Xavier" },
    );
    expect(signe.subject).toBe("Camille a signé votre devis");
    expect(signe.paragraphs[1]).toContain(
      `Camille a signé votre devis n° DEVIS-2026-0001 pour ${quoted("Prises")}, d'un montant de 330,00`,
    );
    expect(signe.cta.url).toBe(`https://menao.example/pro/chantiers/${ids.chantier_id}`);
  });

  it("acompte payé : version artisan (Stripe, date à confirmer) et version client", () => {
    const data = { ...ids, titre: "Prises", client: "Camille", artisan: "Xavier", montant: 9900 };
    const artisan = notificationContent(
      "acompte_paye",
      { ...data, destinataire: "artisan" },
      { ...ctx, firstName: "Xavier" },
    );
    expect(artisan.subject).toBe("Chantier validé ! Confirmez la date de démarrage");
    expect(artisan.paragraphs[1]).toContain("directement sur votre compte Stripe");
    expect(artisan.cta).toEqual({
      label: "Confirmer la date de démarrage",
      url: `https://menao.example/pro/chantiers/${ids.chantier_id}`,
    });
    const client = notificationContent("acompte_paye", { ...data, destinataire: "client" }, ctx);
    expect(client.subject).toBe("Votre acompte est bien payé");
    expect(client.paragraphs[1]).toContain("a bien été payé à Xavier");
    expect(client.cta.url).toBe(`https://menao.example/mon-espace/chantiers/${ids.chantier_id}`);
  });

  it("suivi du chantier (F-22) : démarrage planifié ou déplacé, travaux terminés", () => {
    const data = { ...ids, titre: "Prises", artisan: "Xavier" };
    // 22 octobre 2026, 8 h à Paris (heure d'été).
    const planned = notificationContent(
      "chantier_planifie",
      { ...data, demarrage: "2026-10-22T06:00:00+00:00" },
      ctx,
    );
    expect(planned.subject).toBe("Démarrage des travaux le jeudi 22 octobre à 08h00");
    expect(planned.paragraphs[1]).toBe(
      `Xavier a confirmé le démarrage des travaux pour ${quoted("Prises")} : le jeudi 22 octobre à 08h00.`,
    );
    expect(planned.cta.url).toBe(`https://menao.example/mon-espace/chantiers/${ids.chantier_id}`);
    const moved = notificationContent(
      "demarrage_modifie",
      { ...data, demarrage: "2026-10-26T13:30:00Z" },
      ctx,
    );
    expect(moved.subject).toBe("Démarrage des travaux déplacé au lundi 26 octobre à 14h30");
    const done = notificationContent("travaux_termines", { ...data, photos: 6 }, ctx);
    expect(done.subject).toBe(`Travaux terminés pour ${quoted("Prises")}`);
    expect(done.title).toBe("Travaux terminés !");
    expect(done.paragraphs[1]).toContain("Xavier a déclaré terminés les travaux");
  });

  it("nouveautés du journal (F-12) : photos et messages regroupés, lien vers le suivi", () => {
    const data = { ...ids, titre: "Prises", artisan: "Jean" };
    const c = notificationContent("chantier_nouveautes", { ...data, photos: 6, messages: 1 }, ctx);
    expect(c.title).toBe("Du nouveau sur votre chantier !");
    expect(c.subject).toBe(`Du nouveau sur votre chantier ${quoted("Prises")}`);
    expect(c.paragraphs[1]).toBe(
      `Jean a ajouté 6 nouvelles photos et 1 nouveau message dans le suivi de votre chantier ${quoted("Prises")}.`,
    );
    expect(c.cta).toEqual({
      label: "Voir le suivi du chantier",
      url: `https://menao.example/mon-espace/chantiers/${ids.chantier_id}`,
    });
    expect(
      notificationContent("chantier_nouveautes", { ...data, photos: 1, messages: 0 }, ctx).preview,
    ).toBe("Jean a ajouté 1 nouvelle photo.");
    expect(notificationContent("chantier_nouveautes", { ...data, messages: 2 }, ctx).preview).toBe(
      "Jean a ajouté 2 nouveaux messages.",
    );
  });

  it("réception (F-25, F-26) : PV signé, réserves émises citées, lien vers le chantier", () => {
    const data = { ...ids, titre: "Prises", client: "Camille", numero: "PV-2026-R01" };
    const signed = notificationContent("pv_signe", data, { ...ctx, firstName: "Xavier" });
    expect(signed.subject).toBe(`Réception validée pour ${quoted("Prises")}`);
    expect(signed.paragraphs[1]).toContain("sans réserves");
    expect(signed.cta.url).toBe(`https://menao.example/pro/chantiers/${ids.chantier_id}`);
    const reserves = notificationContent(
      "reserves_emises",
      { ...data, reserves: "Plinthe à repeindre." },
      { ...ctx, firstName: "Xavier" },
    );
    expect(reserves.subject).toBe("Réserves émises par Camille");
    expect(reserves.quote).toBe("Plinthe à repeindre.");
    expect(reserves.cta.label).toBe("Voir les réserves");
    const done = notificationContent(
      "travaux_termines",
      { ...ids, titre: "Prises", artisan: "Jean" },
      ctx,
    );
    expect(done.cta).toEqual({
      label: "Valider la réception",
      url: `https://menao.example/mon-espace/chantiers/${ids.chantier_id}`,
    });
  });

  it("levée des réserves (F-26) : signalée, confirmée, relance", () => {
    const data = { ...ids, titre: "Prises", artisan: "Jean", client: "Camille" };
    const signaled = notificationContent(
      "levee_signalee",
      { ...data, message: "Plinthe repeinte." },
      ctx,
    );
    expect(signaled.subject).toBe("Jean a levé les réserves : confirmez");
    expect(signaled.quote).toBe("Plinthe repeinte.");
    expect(signaled.cta).toEqual({
      label: "Confirmer la levée",
      url: `https://menao.example/mon-espace/chantiers/${ids.chantier_id}`,
    });
    const confirmed = notificationContent("levee_confirmee", data, { ...ctx, firstName: "Jean" });
    expect(confirmed.paragraphs[1]).toContain("Camille a confirmé la levée des réserves");
    expect(confirmed.cta.url).toBe(`https://menao.example/pro/chantiers/${ids.chantier_id}`);
    expect(notificationContent("levee_relance", data, ctx).subject).toBe(
      "Rappel : confirmez la levée des réserves",
    );
  });

  it("solde payé (F-32) : artisan et client, chantier clôturé", () => {
    const data = { ...ids, titre: "Prises", artisan: "Jean", client: "Camille", montant: 23100 };
    const artisan = notificationContent(
      "solde_paye",
      { ...data, destinataire: "artisan" },
      { ...ctx, firstName: "Jean" },
    );
    expect(artisan.subject).toBe(`Solde reçu pour ${quoted("Prises")}`);
    expect(artisan.paragraphs[1]).toContain("directement sur votre compte Stripe");
    expect(artisan.cta.url).toBe(`https://menao.example/pro/chantiers/${ids.chantier_id}`);
    const client = notificationContent("solde_paye", { ...data, destinataire: "client" }, ctx);
    expect(client.subject).toBe("Votre chantier est terminé");
    expect(client.paragraphs[1]).toContain("a bien été payé à Jean");
    expect(client.paragraphs[3]).toContain("Votre avis est précieux");
    expect(client.cta).toEqual({
      label: "Noter Jean",
      url: `https://menao.example/mon-espace/chantiers/${ids.chantier_id}/avis`,
    });
  });

  it("litiges (F-42) : signalement à l'autre partie, décision, réponse du support", () => {
    const opened = notificationContent(
      "litige_ouvert",
      { ...ids, titre: "Prises", destinataire: "artisan", categorie: "malfacon" },
      ctx,
    );
    expect(opened.paragraphs[1]).toBe(
      `Votre client a signalé un problème (malfaçon) sur le chantier ${quoted("Prises")}.`,
    );
    expect(opened.cta.url).toBe(`https://menao.example/pro/chantiers/${ids.chantier_id}`);
    const ticket = "8f14e45f-ceea-4e7a-9b1a-3a5d1c2b7e90";
    const closed = notificationContent(
      "litige_clos",
      {
        ...ids,
        titre: "Prises",
        destinataire: "client",
        decision: "annulation",
        ticket_id: ticket,
      },
      ctx,
    );
    expect(closed.paragraphs[1]).toContain("le chantier est annulé");
    expect(closed.cta.url).toBe(`https://menao.example/signalements/${ticket}`);
    const reply = notificationContent(
      "reponse_support",
      { titre: "Litige : Prises", ticket_id: ticket },
      ctx,
    );
    expect(reply.cta).toEqual({
      label: "Lire la réponse",
      url: `https://menao.example/signalements/${ticket}`,
    });
  });

  it("réponse de l'équipe à un autre échange (contact, dossier) : lien vers « Mes échanges »", () => {
    const ticket = "8f14e45f-ceea-4e7a-9b1a-3a5d1c2b7e90";
    const reply = notificationContent(
      "reponse_support",
      { titre: "Question sur un devis", ticket_id: ticket, type: "contact" },
      ctx,
    );
    expect(reply.subject).toBe("Réponse de l'équipe MENAO à votre message");
    expect(reply.paragraphs.slice(1)).toEqual([
      `L'équipe MENAO a répondu à votre message ${quoted("Question sur un devis")}.`,
      "Vous pouvez lui répondre depuis « Mes échanges avec MENAO ».",
    ]);
    expect(reply.cta).toEqual({
      label: "Lire la réponse",
      url: `https://menao.example/echanges/${ticket}`,
    });
  });

  it("messagerie (F-40) : messages groupés, lien vers la conversation, sans leur contenu", () => {
    const one = notificationContent(
      "nouveaux_messages",
      { ...ids, titre: "Prises", auteur: "Camille", destinataire: "artisan", messages: 1 },
      { ...ctx, firstName: "Jean" },
    );
    expect(one.subject).toBe("Nouveau message de Camille");
    expect(one.cta.url).toBe(`https://menao.example/pro/messages/${ids.chantier_id}`);
    const many = notificationContent(
      "nouveaux_messages",
      { ...ids, titre: "Prises", auteur: "Jean", destinataire: "client", messages: 3 },
      ctx,
    );
    expect(many.subject).toBe("3 nouveaux messages de Jean");
    expect(many.paragraphs[1]).toContain(`3 messages à propos du chantier ${quoted("Prises")}`);
    expect(many.cta.url).toBe(`https://menao.example/mon-espace/messages/${ids.chantier_id}`);
  });

  it("avis (F-28) : avis reçu par l'artisan, relance du client", () => {
    const data = { ...ids, titre: "Prises", artisan: "Jean", client: "Camille", score: 95 };
    const received = notificationContent("avis_recu", data, { ...ctx, firstName: "Jean" });
    expect(received.subject).toBe("Nouvel avis de Camille");
    expect(received.paragraphs[2]).toContain("une seule fois");
    expect(received.cta.url).toBe(`https://menao.example/pro/chantiers/${ids.chantier_id}`);
    const reminder = notificationContent("avis_relance", data, ctx);
    expect(reminder.subject).toBe("MENAO a besoin de vous !");
    expect(reminder.preview).toContain("votre expérience avec Jean");
    expect(reminder.paragraphs[1]).toContain(`Jean a terminé votre chantier ${quoted("Prises")}`);
    expect(reminder.cta).toEqual({
      label: "Noter Jean",
      url: `https://menao.example/mon-espace/chantiers/${ids.chantier_id}/avis`,
    });
    expect(notificationContent("avis_relance", {}, ctx).cta).toEqual({
      label: "Donner mon avis",
      url: "https://menao.example/mon-espace",
    });
  });

  it("relance « Paiement en attente » : acompte à régler, lien vers le chantier", () => {
    const data = { ...ids, titre: "Prises", artisan: "Jean" };
    const reminder = notificationContent("acompte_relance", data, ctx);
    expect(reminder.subject).toBe("Paiement en attente");
    expect(reminder.paragraphs[1]).toContain(`devis de Jean pour ${quoted("Prises")}`);
    expect(reminder.paragraphs[2]).toContain("directement sur le compte de l'artisan");
    expect(reminder.cta).toEqual({
      label: "Payer l'acompte",
      url: `https://menao.example/mon-espace/chantiers/${ids.chantier_id}`,
    });
  });

  it("données manquantes ou invalides : textes génériques, jamais «\u00a0undefined\u00a0»", () => {
    for (const type of NOTIFICATION_TYPES) {
      const c = notificationContent(
        type,
        { request_id: "pas-un-uuid", rendez_vous: "n'importe" },
        {
          siteUrl: "https://menao.example",
          firstName: null,
        },
      );
      const all = [c.subject, c.preview, c.title, ...c.paragraphs, c.cta.url].join(" ");
      expect(all, type).not.toMatch(/undefined|null|NaN|pas-un-uuid/);
      expect(c.paragraphs[0]).toBe("Bonjour,");
    }
    expect(notificationContent("nouvelle_demande", {}, ctx).cta.url).toBe(
      "https://menao.example/pro/demandes",
    );
  });
});

describe("dossier et documents de l'artisan (F-50, F-51)", () => {
  const pro = { ...ctx, firstName: "Noé" };

  it("dossier validé : étapes restantes pour être visible, ou profil visible", () => {
    const pending = notificationContent(
      "dossier_valide",
      { abonnement: false, paiements: false },
      pro,
    );
    expect(pending.subject).toBe("Votre dossier MENAO est validé");
    expect(pending.paragraphs[2]).toBe(
      "Pour apparaître dans les recherches des particuliers, il vous reste à choisir votre formule d'abonnement et à activer vos paiements.",
    );
    expect(pending.cta).toEqual({
      label: "Terminer mon inscription",
      url: "https://menao.example/pro/onboarding",
    });
    const visible = notificationContent(
      "dossier_valide",
      { abonnement: true, paiements: true },
      pro,
    );
    expect(visible.paragraphs[2]).toContain("Votre profil est maintenant visible");
    expect(visible.cta).toEqual({
      label: "Accéder à mon espace pro",
      url: "https://menao.example/pro/tableau-de-bord",
    });
  });

  it("dossier refusé ou complément demandé : message de l'équipe en citation", () => {
    const refused = notificationContent("dossier_refuse", { motif: "Kbis illisible" }, pro);
    expect(refused.subject).toBe("Votre dossier MENAO n'a pas été validé");
    expect(refused.quote).toBe("Kbis illisible");
    expect(refused.cta.url).toBe("https://menao.example/pro/onboarding");
    const more = notificationContent("dossier_complement", { motif: "RC Pro à jour" }, pro);
    expect(more.subject).toBe("Complément demandé pour votre dossier MENAO");
    expect(more.quote).toBe("RC Pro à jour");
    expect(more.cta.label).toBe("Compléter mon dossier");
  });

  it("échéance d'un document : J-30, J-7 (urgent), suspension annoncée pour les assurances", () => {
    const soon = notificationContent(
      "document_a_renouveler",
      { document: "decennale", date_fin: "2026-10-29", jours: 20 },
      pro,
    );
    expect(soon.subject).toBe(
      "Votre attestation d'assurance décennale expire le jeudi 29 octobre (dans 20\u00a0jours)",
    );
    expect(soon.title).toBe("Pensez à renouveler votre document");
    expect(soon.paragraphs[2]).toContain("votre profil sera suspendu automatiquement");
    expect(soon.cta).toEqual({
      label: "Déposer le nouveau document",
      url: "https://menao.example/pro/onboarding/documents",
    });
    const urgent = notificationContent(
      "document_a_renouveler",
      { document: "rc_pro", date_fin: "2026-10-16", jours: 5 },
      pro,
    );
    expect(urgent.subject).toBe(
      "Urgent : votre attestation de responsabilité civile professionnelle expire le vendredi 16 octobre (dans 5\u00a0jours)",
    );
    const tomorrow = notificationContent(
      "document_a_renouveler",
      { document: "identite", date_fin: "2026-10-12", jours: 1 },
      pro,
    );
    expect(tomorrow.subject).toBe("Urgent : votre pièce d'identité du dirigeant expire demain");
    expect(tomorrow.paragraphs[2]).not.toContain("suspendu");
  });

  it("copie à l'équipe : entreprise, document, échéance et lien vers le suivi", () => {
    const team = notificationContent(
      "document_a_renouveler_equipe",
      { document: "decennale", date_fin: "2026-10-29", jours: 20, entreprise: "I.P.M" },
      { ...ctx, firstName: "Alex" },
    );
    expect(team.subject).toBe("Assurance à renouveler : I.P.M");
    expect(team.paragraphs[1]).toBe(
      "I.P.M doit renouveler son attestation d'assurance décennale, qui expire le jeudi 29 octobre (dans 20\u00a0jours).",
    );
    expect(team.cta).toEqual({
      label: "Voir les échéances",
      url: "https://menao.example/admin/surveillance",
    });
  });

  it("suspension, refus d'un renouvellement et levée de la suspension", () => {
    const suspended = notificationContent("compte_suspendu", { documents: ["decennale"] }, pro);
    expect(suspended.subject).toBe("Votre profil MENAO est suspendu");
    expect(suspended.paragraphs[1]).toBe(
      "Votre profil est suspendu car une assurance obligatoire n'est plus à jour : attestation d'assurance décennale.",
    );
    const refused = notificationContent(
      "document_refuse",
      { document: "decennale", motif: "Attestation illisible" },
      pro,
    );
    expect(refused.subject).toBe("Document refusé : attestation d'assurance décennale");
    expect(refused.quote).toBe("Attestation illisible");
    const back = notificationContent("compte_reactive", { visible: true }, pro);
    expect(back.preview).toBe("Vous apparaissez de nouveau dans les recherches.");
    expect(notificationContent("compte_reactive", { visible: false }, pro).paragraphs[2]).toContain(
      "vérifiez votre formule et vos paiements",
    );
  });

  it("alertes de l'équipe (ADR 0050) : nouveau ticket, dossier à vérifier, ticket en retard", () => {
    const ticket = notificationContent(
      "equipe_nouveau_ticket",
      { ticket_id: ids.request_id, type: "litige", objet: "Fuite non réparée" },
      pro,
    );
    expect(ticket.subject).toBe("Nouveau ticket : litige sur un chantier");
    expect(ticket.quote).toBe("Fuite non réparée");
    expect(ticket.cta).toEqual({
      label: "Ouvrir le ticket",
      url: `https://menao.example/admin/tickets/${ids.request_id}`,
    });
    const dossier = notificationContent(
      "equipe_dossier_a_verifier",
      { artisan_id: ids.chantier_id, entreprise: "PEINTURE EXEMPLE" },
      pro,
    );
    expect(dossier.subject).toBe("Dossier artisan à vérifier : PEINTURE EXEMPLE");
    expect(dossier.cta.url).toBe(`https://menao.example/admin/artisans/${ids.chantier_id}`);
    const late = notificationContent(
      "equipe_ticket_en_retard",
      { ticket_id: ids.request_id, type: "contact", objet: null },
      pro,
    );
    expect(late.subject).toBe("Ticket en retard : message de la page Contact");
    expect(late.quote).toBeNull();
    // Sans identifiant : la boîte de réception.
    expect(notificationContent("equipe_ticket_en_retard", {}, pro).cta.url).toBe(
      "https://menao.example/admin/tickets",
    );
  });

  it("accès au compte suspendu puis rétabli par l'équipe (ADR 0048)", () => {
    const blocked = notificationContent("acces_suspendu", { motif: "Fraude au paiement." }, pro);
    expect(blocked.subject).toBe("L'accès à votre compte MENAO est suspendu");
    expect(blocked.quote).toBe("Fraude au paiement.");
    expect(blocked.cta).toEqual({
      label: "Écrire à l'équipe MENAO",
      url: "https://menao.example/contact",
    });
    const back = notificationContent("acces_retabli", {}, pro);
    expect(back.subject).toBe("L'accès à votre compte MENAO est rétabli");
    expect(back.cta).toEqual({ label: "Me connecter", url: "https://menao.example/connexion" });
  });

  it("suspension décidée par l'équipe (ADR 0047) : motif cité, contact ; levée par l'équipe", () => {
    const suspended = notificationContent(
      "compte_suspendu",
      { par: "equipe", motif: "Plaintes répétées de clients." },
      pro,
    );
    expect(suspended.subject).toBe("Votre profil MENAO est suspendu");
    expect(suspended.preview).toBe("L'équipe MENAO a suspendu votre profil.");
    expect(suspended.paragraphs[1]).toBe("L'équipe MENAO a suspendu votre profil, pour ce motif :");
    expect(suspended.quote).toBe("Plaintes répétées de clients.");
    expect(suspended.paragraphs.join(" ")).not.toContain("assurance");
    expect(suspended.cta).toEqual({
      label: "Écrire à l'équipe MENAO",
      url: "https://menao.example/contact",
    });
    const back = notificationContent("compte_reactive", { par: "equipe", visible: true }, pro);
    expect(back.paragraphs[1]).toBe("L'équipe MENAO a levé la suspension de votre profil.");
    expect(back.paragraphs[2]).toContain("Vous apparaissez de nouveau dans les recherches");
  });
});

describe("rendu HTML et texte", () => {
  it("HTML complet, en français, avec le bouton et l'aperçu ; texte avec le lien", () => {
    const email = renderNotification(
      "rdv_fixe",
      { ...ids, titre: "Prises", artisan: "Xavier", rendez_vous: "2026-02-20T15:30:00Z" },
      ctx,
    );
    expect(email.subject).toBe("Rendez-vous fixé le vendredi 20 février à 16h30");
    expect(email.html.startsWith("<!DOCTYPE html")).toBe(true);
    expect(email.html).toContain('lang="fr"');
    expect(email.html).toContain(
      `href="https://menao.example/mon-espace/chantiers/${ids.chantier_id}"`,
    );
    expect(email.html).toContain("Votre rendez-vous est fixé");
    expect(email.text).toContain(
      `Voir mon chantier : https://menao.example/mon-espace/chantiers/${ids.chantier_id}`,
    );
    expect(email.text).toBe(
      plainText(
        notificationContent(
          "rdv_fixe",
          { ...ids, titre: "Prises", artisan: "Xavier", rendez_vous: "2026-02-20T15:30:00Z" },
          ctx,
        ),
      ),
    );
  });

  it("échappe les données saisies par les utilisateurs", () => {
    const email = renderNotification(
      "chantier_annule",
      { titre: "<script>alert(1)</script>", artisan: "Xavier", motif: '"><img src=x>' },
      ctx,
    );
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img src=x>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.text).toContain("«\u00a0<script>alert(1)</script>\u00a0»");
  });
});

describe("cohérence avec la base", () => {
  it("les types de notification correspondent exactement à l'enum public.notification_type", () => {
    expect([...Constants.public.Enums.notification_type].sort()).toEqual(
      [...NOTIFICATION_TYPES].sort(),
    );
  });
});
