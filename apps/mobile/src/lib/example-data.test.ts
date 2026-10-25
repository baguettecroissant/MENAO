import { EXAMPLE_IDS, dashboardActivity } from "@menao/core";
import { describe, expect, it } from "vitest";
import {
  exampleAgendaWeek,
  exampleArtisanChantier,
  exampleArtisanFollowUp,
  exampleConversation,
  exampleConversationList,
  exampleDashboard,
  exampleInboxItems,
  exampleInvoiceList,
  exampleMyPage,
  exampleMyReviews,
  exampleOpportunity,
  exampleProfileHub,
  exampleQuoteDraft,
  exampleQuoteList,
} from "./example-data";

// Exemples de l'application (ADR 0184) : mêmes données fictives que le site, au format des écrans.
const now = new Date("2026-10-21T08:00:00Z");

describe("données d'exemple de l'application", () => {
  it("tableau de bord : à faire, rendez-vous et activité remplis", () => {
    const dashboard = exampleDashboard("Alex", now);
    expect(dashboard.firstName).toBe("Alex");
    expect(dashboard.todo.length).toBeGreaterThan(0);
    expect(dashboard.examplesShown).toBe(false);
    expect(dashboardActivity(dashboard.activityInput, 2026, now).yearCents).toBeGreaterThan(0);
  });

  it("demandes, chantiers, devis et brouillon : les identifiants d'exemple s'ouvrent", () => {
    expect(exampleInboxItems(now)).toHaveLength(2);
    expect(exampleOpportunity(EXAMPLE_IDS.demandeFuite, now)?.detail.urgence).toBe(true);
    expect(exampleOpportunity("inconnu", now)).toBeNull();
    expect(exampleArtisanChantier(EXAMPLE_IDS.chantierCuisine, now)?.sentQuote?.status).toBe(
      "envoye",
    );
    expect(exampleArtisanChantier(EXAMPLE_IDS.chantierChauffeEau, now)?.hasDraft).toBe(true);
    expect(exampleQuoteDraft(EXAMPLE_IDS.chantierChauffeEau, now)?.lines).toHaveLength(4);
    expect(exampleQuoteDraft(EXAMPLE_IDS.chantierCuisine, now)).toBeNull();
    expect(exampleQuoteList(now).map((q) => q.status)).toEqual(["brouillon", "envoye", "signe"]);
  });

  it("suivi du chantier en cours : acompte payé, journal avec photo du site public", () => {
    const followUp = exampleArtisanFollowUp(now);
    expect(followUp.depositPaid).toBe(true);
    expect(followUp.progress?.remainingCents).toBe(792_000 - 237_600);
    expect(followUp.photoUrls[0]).toMatch(/\/images\/metiers\/plombier-400\.webp$/);
  });

  it("messages, agenda, factures et avis", () => {
    expect(exampleConversationList(now)).toHaveLength(3);
    const conversation = exampleConversation(EXAMPLE_IDS.chantierSalleDEau, now);
    expect(conversation?.chantierPath).toBe(`/pro-chantier/${EXAMPLE_IDS.chantierSalleDEau}`);
    expect(conversation?.messages.at(-1)?.mine).toBe(false);
    expect(exampleAgendaWeek("2026-10-19", now).items.length).toBeGreaterThan(0);
    expect(exampleInvoiceList(now)[0]?.client).toBe("Thomas Girard");
    expect(exampleMyReviews(now).reviews.filter((r) => r.reply === null)).toHaveLength(1);
  });

  it("« Mon profil » et « Ma fiche » au nom de l'artisan", () => {
    const hub = exampleProfileHub(
      { firstName: "Alex", lastName: "Martin", email: "alex@example.com", avatarUrl: null },
      now,
    );
    expect(hub.name).toBe("Alex Martin");
    expect(hub.initials).toBe("AM");
    expect(hub.statuses.reviews?.tone).toBe("danger");
    expect(exampleMyPage("Alex Martin", null, now).profile.company_name).toBe("Votre entreprise");
  });
});
