import { describe, expect, it } from "vitest";
import {
  CHANTIER_STEPS,
  chantierStepIndex,
  clientChantierAction,
  isChantierFinished,
  paymentProgress,
} from "../src/chantier-progress";
import { CHANTIER_STATUSES } from "../src/chantier-state";
import { googleCalendarUrl, outlookCalendarUrl } from "../src/ics";

describe("avancement du chantier (F-12)", () => {
  it("stepper en 5 étapes déduit de l'état (spec §9)", () => {
    expect(CHANTIER_STEPS).toEqual([
      "signature",
      "paiement",
      "planification",
      "travaux",
      "reception",
    ]);
    const steps = Object.fromEntries(CHANTIER_STATUSES.map((s) => [s, chantierStepIndex(s)]));
    expect(steps).toEqual({
      demande_envoyee: 0,
      rdv_planifie: 0,
      devis_envoye: 0,
      devis_en_revision: 0,
      devis_refuse: null,
      devis_signe: 1,
      acompte_paye: 2,
      planifie: 2,
      en_cours: 3,
      travaux_termines: 4,
      reserves_a_lever: 4,
      receptionne: 4,
      cloture: 5,
      en_litige: null,
      annule: null,
    });
  });

  it("chantiers terminés : clôturés, annulés ou devis refusé", () => {
    expect(CHANTIER_STATUSES.filter(isChantierFinished)).toEqual([
      "devis_refuse",
      "cloture",
      "annule",
    ]);
  });

  it("action attendue du client : signer le devis, puis payer l'acompte", () => {
    const base = { quoteId: "q1", depositCents: 9900, depositStatus: null };
    expect(
      clientChantierAction({ ...base, status: "devis_envoye", quoteStatus: "envoye" }),
    ).toEqual({
      kind: "signer_devis",
      quoteId: "q1",
    });
    expect(clientChantierAction({ ...base, status: "devis_signe", quoteStatus: "signe" })).toEqual({
      kind: "payer_acompte",
      quoteId: "q1",
      amountCents: 9900,
    });
    // Paiement abandonné : à refaire ; paiement différé en cours de confirmation : rien à faire.
    expect(
      clientChantierAction({
        ...base,
        status: "devis_signe",
        quoteStatus: "signe",
        depositStatus: "annule",
      }),
    ).toMatchObject({ kind: "payer_acompte" });
    expect(
      clientChantierAction({
        ...base,
        status: "devis_signe",
        quoteStatus: "signe",
        depositStatus: "en_cours",
      }),
    ).toBeNull();
    expect(
      clientChantierAction({ ...base, status: "acompte_paye", quoteStatus: "signe" }),
    ).toBeNull();
    expect(
      clientChantierAction({
        ...base,
        status: "devis_en_revision",
        quoteStatus: "revision_demandee",
      }),
    ).toBeNull();
    expect(
      clientChantierAction({ ...base, quoteId: null, status: "devis_envoye", quoteStatus: null }),
    ).toBeNull();
  });

  it("chantier réceptionné : payer le solde, sauf s'il est payé ou en cours de confirmation", () => {
    const base = {
      quoteId: "q1",
      quoteStatus: "signe",
      depositCents: 9900,
      depositStatus: "paye" as const,
      balanceCents: 23100,
    };
    expect(clientChantierAction({ ...base, status: "receptionne", balanceStatus: null })).toEqual({
      kind: "payer_solde",
      quoteId: "q1",
      amountCents: 23100,
    });
    expect(
      clientChantierAction({ ...base, status: "receptionne", balanceStatus: "en_cours" }),
    ).toBeNull();
    expect(
      clientChantierAction({ ...base, status: "receptionne", balanceStatus: "paye" }),
    ).toBeNull();
    expect(
      clientChantierAction({ ...base, status: "reserves_a_lever", balanceStatus: null }),
    ).toBeNull();
    expect(
      clientChantierAction({
        ...base,
        status: "receptionne",
        balanceCents: 0,
        balanceStatus: null,
      }),
    ).toBeNull();
  });

  it("échéancier : déjà payé et restant à payer, toujours calculés", () => {
    expect(paymentProgress(33000, [{ status: "paye", amountCents: 9900 }])).toEqual({
      paidCents: 9900,
      remainingCents: 23100,
    });
    expect(
      paymentProgress(33000, [
        { status: "annule", amountCents: 9900 },
        { status: "en_cours", amountCents: 9900 },
      ]),
    ).toEqual({ paidCents: 0, remainingCents: 33000 });
    expect(
      paymentProgress(33000, [
        { status: "paye", amountCents: 9900 },
        { status: "paye", amountCents: 23100 },
      ]),
    ).toEqual({ paidCents: 33000, remainingCents: 0 });
  });
});

describe("liens d'agenda (F-12)", () => {
  const event = {
    start: new Date("2026-10-22T06:30:00Z"),
    durationMinutes: 60,
    summary: "Démarrage des travaux : Prises",
    location: "1 Rue de l'Exemple 06000 Nice",
    description: "Artisan : Jean",
  };

  it("Google Agenda : dates UTC, titre, lieu et description", () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      action: "TEMPLATE",
      text: "Démarrage des travaux : Prises",
      dates: "20261022T063000Z/20261022T073000Z",
      details: "Artisan : Jean",
      location: "1 Rue de l'Exemple 06000 Nice",
    });
  });

  it("Outlook : début et fin ISO, sans lieu s'il est absent", () => {
    const url = new URL(outlookCalendarUrl({ ...event, location: null }));
    expect(url.origin + url.pathname).toBe("https://outlook.live.com/calendar/0/deeplink/compose");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      path: "/calendar/action/compose",
      rru: "addevent",
      subject: "Démarrage des travaux : Prises",
      startdt: "2026-10-22T06:30:00.000Z",
      enddt: "2026-10-22T07:30:00.000Z",
      body: "Artisan : Jean",
    });
  });
});

describe("actions attendues du client (compteur du menu)", () => {
  it("compte les chantiers avec un devis à signer, un acompte ou un solde à payer", async () => {
    const { clientPendingActions } = await import("../src/chantier-progress");
    const base = {
      quoteId: "q",
      depositCents: 30000,
      depositStatus: null,
      balanceCents: 70000,
      balanceStatus: null,
    };
    expect(
      clientPendingActions([
        { ...base, status: "devis_envoye", quoteStatus: "envoye" },
        { ...base, status: "devis_signe", quoteStatus: "signe" },
        { ...base, status: "receptionne", quoteStatus: "signe" },
        { ...base, status: "en_cours", quoteStatus: "signe" },
        { ...base, status: "devis_signe", quoteStatus: "signe", depositStatus: "paye" },
      ]),
    ).toBe(3);
    expect(clientPendingActions([])).toBe(0);
  });
});
