import { describe, expect, it } from "vitest";
import { artisanTodo } from "../src/artisan-todo";
import { requestsAwaitingAnswer } from "../src/requests";
import { upcomingAgenda } from "../src/appointment";
import { clientsAwaitingQuote } from "../src/chantier-state";
import { monthToDateRevenue } from "../src/payment";
import { profileHubStatuses } from "../src/profile-hub";
import { parisToday } from "../src/project";
import { quoteTotals } from "../src/quote";
import {
  EXAMPLE_IDS,
  exampleAgendaItems,
  exampleChantier,
  exampleChantierRows,
  exampleChantiers,
  exampleConversations,
  exampleFollowUp,
  exampleGrade,
  exampleHubFacts,
  exampleInbox,
  exampleInvoices,
  exampleMessages,
  examplePayments,
  examplePhotoKey,
  exampleProfile,
  exampleQuoteDraftLines,
  exampleQuoteRows,
  exampleRequest,
  exampleReviews,
  exampleScore,
  exampleSentQuote,
  isExampleId,
  spaceExamplesShown,
} from "../src/space-examples";

// Heure d'été (UTC+2) et heure d'hiver (UTC+1).
const SUMMER = new Date("2026-07-15T09:30:00Z");
const WINTER = new Date("2026-11-18T09:30:00Z");
const FRIDAY = new Date("2026-10-23T09:30:00Z");
const SUNDAY = new Date("2026-10-25T09:30:00Z");
const DAY = 24 * 3_600_000;

describe("exemples de l'espace artisan (ADR 0184)", () => {
  it("visibles tant que l'artisan n'a rien reçu et ne les a pas masqués", () => {
    expect(spaceExamplesShown({ requests: 0, chantiers: 0, hiddenAt: null })).toBe(true);
    expect(spaceExamplesShown({ requests: 1, chantiers: 0, hiddenAt: null })).toBe(false);
    expect(spaceExamplesShown({ requests: 0, chantiers: 1, hiddenAt: null })).toBe(false);
    expect(
      spaceExamplesShown({ requests: 0, chantiers: 0, hiddenAt: "2026-10-25T08:00:00Z" }),
    ).toBe(false);
  });

  it("identifiants reconnaissables, jamais confondus avec ceux de la base", () => {
    for (const id of Object.values(EXAMPLE_IDS)) expect(isExampleId(id)).toBe(true);
    expect(isExampleId("4f1c2b7e-9d3a-4c8e-b5f0-1a2b3c4d5e6f")).toBe(false);
    expect(new Set(Object.values(EXAMPLE_IDS)).size).toBe(Object.values(EXAMPLE_IDS).length);
  });

  it("deux demandes en attente de réponse, dont une urgente", () => {
    const inbox = exampleInbox(SUMMER);
    expect(inbox).toHaveLength(2);
    expect(requestsAwaitingAnswer(inbox, SUMMER)).toHaveLength(2);
    expect(inbox.filter((r) => r.urgence)).toHaveLength(1);
    expect(exampleRequest(EXAMPLE_IDS.demandeFuite, SUMMER)?.summary).toBe("Fuite sous l'évier");
    expect(exampleRequest(EXAMPLE_IDS.chantierCuisine, SUMMER)).toBeNull();
  });

  it("trois chantiers : rendez-vous le prochain jour ouvré à 10 h (heure de Paris), devis envoyé, travaux en cours", () => {
    for (const now of [SUMMER, WINTER]) {
      const rows = exampleChantierRows(now);
      expect(rows.map((r) => r.status)).toEqual(["rdv_planifie", "devis_envoye", "en_cours"]);
      const rdv = rows[0]?.appointment_at ?? "";
      const tomorrow = parisToday(new Date(now.getTime() + 24 * 3_600_000));
      expect(parisToday(new Date(rdv))).toBe(tomorrow);
      expect(
        new Intl.DateTimeFormat("fr-FR", {
          timeZone: "Europe/Paris",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(rdv)),
      ).toBe("10:00");
    }
  });

  it("le tableau de bord se remplit avec les mêmes calculs que pour un vrai artisan", () => {
    const rows = exampleChantierRows(SUMMER).map((c) => ({
      ...c,
      appointmentAt: c.appointment_at,
      startAt: c.start_at,
      particulierId: c.particulier_id,
    }));
    expect(clientsAwaitingQuote(rows)).toBe(1);
    expect(upcomingAgenda(rows, SUMMER, 8).map((a) => a.kind)).toEqual(["visite"]);
    const todo = artisanTodo(
      {
        requests: exampleInbox(SUMMER).map((r) => ({
          id: r.request_id,
          expiresAt: r.expires_at,
          title: r.summary,
          place: r.ville_nom,
        })),
        appointments: [],
        quotesToSend: [],
        documentsToRenew: [],
        urssafMissing: false,
        paymentsMissing: false,
        reviewsToAnswer: 0,
        welcomeGiftToChoose: false,
      },
      SUMMER,
    );
    expect(todo.map((i) => i.kind)).toEqual(["demande", "demande"]);
    expect(monthToDateRevenue(examplePayments(SUMMER), SUMMER).currentCents).toBe(237_600);
  });

  it("chantier en cours : devis signé, acompte de 30 % payé avant le démarrage, journal", () => {
    const followUp = exampleFollowUp(SUMMER);
    const startAt = exampleChantier(EXAMPLE_IDS.chantierSalleDEau, SUMMER)?.chantier.start_at;
    const [deposit] = followUp.payments;
    expect(deposit?.amount_cents).toBe((followUp.quote.total_ttc_cents * 30) / 100);
    expect(Date.parse(deposit?.paid_at ?? "")).toBeLessThan(Date.parse(startAt ?? ""));
    expect(followUp.updates.map((u) => u.kind)).toEqual(["photo", "message", "message"]);
    expect(examplePhotoKey(followUp.updates[0]?.storage_path ?? "")).toBe("plomberie");
    expect(examplePhotoKey("chantier/abc.jpg")).toBeNull();
  });

  it("devis envoyé encore valable, montants en centimes entiers", () => {
    const quote = exampleSentQuote(SUMMER);
    expect(Number.isInteger(quote.total_ttc_cents)).toBe(true);
    expect(quote.valid_until > parisToday(SUMMER)).toBe(true);
  });

  it("rendez-vous, démarrages et créneaux jamais le week-end (vendredi, dimanche)", () => {
    const weekday = (iso: string) =>
      new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short" }).format(
        new Date(iso),
      );
    for (const now of [FRIDAY, SUNDAY]) {
      const dates = [
        ...exampleChantiers(now).flatMap((c) => [c.appointment?.starts_at, c.chantier.start_at]),
        ...exampleAgendaItems(
          new Date(now.getTime() - 20 * DAY),
          new Date(now.getTime() + 20 * DAY),
          now,
        ).map((i) => i.start),
      ].filter((d): d is string => Boolean(d));
      for (const d of dates) expect(["Sat", "Sun"]).not.toContain(weekday(d));
    }
    // Vendredi : rendez-vous le lundi suivant.
    expect(parisToday(new Date(exampleChantierRows(FRIDAY)[0]?.appointment_at ?? ""))).toBe(
      "2026-10-26",
    );
  });

  it("devis : brouillon (total calculé depuis ses lignes), envoyé, signé", () => {
    const rows = exampleQuoteRows(SUMMER);
    expect(rows.map((q) => q.status)).toEqual(["brouillon", "envoye", "signe"]);
    expect(rows[0]?.total_ttc_cents).toBe(quoteTotals(exampleQuoteDraftLines()).totalTtcCents);
    expect(rows[0]?.total_ttc_cents).toBe(101_200);
    for (const q of rows) expect(Number.isInteger(q.total_ttc_cents)).toBe(true);
  });

  it("messages : une conversation par chantier, non lus cohérents avec le suivi du chantier", () => {
    const conversations = exampleConversations(SUMMER);
    expect(conversations).toHaveLength(3);
    const salleDEau = conversations.find((c) => c.chantier_id === EXAMPLE_IDS.chantierSalleDEau);
    expect(salleDEau?.unread).toBe(exampleFollowUp(SUMMER).conversation.unread);
    expect(exampleMessages(EXAMPLE_IDS.chantierCuisine, SUMMER).map((m) => m.mine)).toEqual([
      true,
      false,
    ]);
    expect(exampleMessages("inconnu", SUMMER)).toEqual([]);
  });

  it("avis, score et facture d'acompte", () => {
    const reviews = exampleReviews(SUMMER);
    expect(reviews.filter((r) => r.reply === null)).toHaveLength(1);
    for (const r of reviews) {
      expect(isExampleId(r.id)).toBe(true);
      expect(r.comment.length).toBeGreaterThanOrEqual(50);
    }
    expect(exampleScore().review_count).toBe(reviews.length);
    expect(exampleInvoices(SUMMER)[0]?.total_ttc_cents).toBe(237_600);
  });

  it("grade : vrai barème, progression fictive de niveau 2, badges déjà vus", () => {
    const grade = {
      xp: 0,
      level: 1,
      levels: [
        { level: 1, xp_min: 0 },
        { level: 2, xp_min: 250 },
        { level: 3, xp_min: 600 },
      ],
      objectives: [0, 1, 2, 3].map(() => ({ target: 4, progress: 0, achieved_at: null })),
      badges: [0, 1, 2].map(() => ({ target: 3, progress: 0, unlocked_at: null, seen: false })),
      claims: [],
    };
    const example = exampleGrade(grade, SUMMER);
    expect(example.level).toBe(2);
    expect(example.objectives.filter((o) => o.achieved_at)).toHaveLength(3);
    expect(example.badges.filter((b) => b.unlocked_at)).toHaveLength(2);
    expect(example.badges.every((b) => b.seen)).toBe(true);
  });

  it("« Mon profil » : dossier complet, un avis à traiter", () => {
    const statuses = profileHubStatuses(exampleHubFacts(SUMMER), SUMMER);
    expect(statuses.company?.tone).toBe("success");
    expect(statuses.reviews).toEqual({ code: "toAnswer", n: 1, tone: "danger" });
    expect(exampleProfile("Alex", SUMMER).display_name).toBe("Alex");
    expect(exampleProfile(null, SUMMER).display_name).toBe("Votre nom");
  });

  it("personnes et coordonnées fictives (numéros en +336000000, adresses « de l'Exemple »)", () => {
    for (const c of exampleChantiers(SUMMER)) {
      expect(c.client.phone).toMatch(/^\+3360000000\d$/);
      expect(c.client.email).toMatch(/@example\.com$/);
      expect(c.adresse).toContain("de l'Exemple");
    }
  });
});
