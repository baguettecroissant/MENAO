import { describe, expect, it } from "vitest";
import { NOTIFICATION_TYPES, notificationContent, plainText } from "../src/content.ts";
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
      "Dominique vous a choisi pour son projet « Réparer une fuite » à Nice.",
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
      "Xavier a fixé un rendez-vous pour votre projet « Prises » : le vendredi 20 février à 16h30.",
    );
    expect(fixe.cta.url).toBe("https://menao.example/mon-espace");
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
      "Xavier vient demain, vendredi 20 février à 16h30 pour votre projet « Prises ».",
    );
    const artisan = notificationContent("rdv_rappel", { ...data, destinataire: "artisan" }, ctx);
    expect(artisan.paragraphs.slice(1)).toEqual([
      "Vous avez rendez-vous demain, vendredi 20 février à 16h30 chez Camille Exemple pour « Prises ».",
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

  it("données manquantes ou invalides : textes génériques, jamais « undefined »", () => {
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
    expect(email.html).toContain('href="https://menao.example/mon-espace"');
    expect(email.html).toContain("Votre rendez-vous est fixé");
    expect(email.text).toContain("Voir mon espace : https://menao.example/mon-espace");
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
    expect(email.text).toContain("« <script>alert(1)</script> »");
  });
});
