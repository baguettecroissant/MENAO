import { describe, expect, it } from "vitest";
import {
  CHANTIER_STATUSES,
  chantierFigures,
  chantierNext,
  chantierPhase,
  requestFigures,
} from "../src";

describe("requestFigures", () => {
  const now = new Date("2026-11-08T10:00:00Z");
  it("à traiter, plus urgente, reçues et acceptées ce mois-ci", () => {
    expect(
      requestFigures(
        [
          // À traiter : expire dans 14 h 20 puis dans 61 h.
          {
            status: "envoyee",
            expires_at: "2026-11-09T00:20:00Z",
            created_at: "2026-11-06T00:20:00Z",
          },
          {
            status: "envoyee",
            expires_at: "2026-11-10T23:00:00Z",
            created_at: "2026-11-07T23:00:00Z",
          },
          // Envoyée mais expirée : plus à traiter.
          {
            status: "envoyee",
            expires_at: "2026-11-08T09:00:00Z",
            created_at: "2026-11-05T09:00:00Z",
          },
          {
            status: "acceptee",
            expires_at: "2026-11-05T09:00:00Z",
            created_at: "2026-11-02T09:00:00Z",
          },
          // 31 octobre à 23 h 30 UTC = 1er novembre à Paris : compte dans le mois.
          {
            status: "acceptee",
            expires_at: "2026-11-03T23:30:00Z",
            created_at: "2026-10-31T23:30:00Z",
          },
          // Octobre : hors du mois.
          {
            status: "acceptee",
            expires_at: "2026-10-30T09:00:00Z",
            created_at: "2026-10-27T09:00:00Z",
          },
          {
            status: "refusee",
            expires_at: "2026-11-07T09:00:00Z",
            created_at: "2026-11-04T09:00:00Z",
          },
        ],
        now,
      ),
    ).toEqual({
      openCount: 2,
      mostUrgent: { hours: 14, minutes: 20 },
      monthCount: 6,
      monthAccepted: 2,
    });
  });

  it("rien à traiter : pas de plus urgente", () => {
    expect(requestFigures([], now)).toEqual({
      openCount: 0,
      mostUrgent: null,
      monthCount: 0,
      monthAccepted: 0,
    });
  });
});

describe("chantierPhase", () => {
  it("range chaque état dans une phase", () => {
    const phases = Object.fromEntries(CHANTIER_STATUSES.map((s) => [s, chantierPhase(s)]));
    expect(phases).toEqual({
      demande_envoyee: "avant_devis",
      rdv_planifie: "avant_devis",
      devis_envoye: "devis_paiement",
      devis_en_revision: "devis_paiement",
      devis_signe: "devis_paiement",
      acompte_paye: "travaux",
      planifie: "travaux",
      en_cours: "travaux",
      travaux_termines: "travaux",
      reserves_a_lever: "travaux",
      receptionne: "travaux",
      en_litige: "travaux",
      cloture: "termines",
      annule: "termines",
      devis_refuse: "termines",
    });
  });
});

describe("chantierFigures", () => {
  const now = new Date("2026-11-08T10:00:00Z");
  it("rendez-vous à venir, attente du client, travaux et clôturés", () => {
    expect(
      chantierFigures(
        [
          { status: "rdv_planifie", appointment_at: "2026-11-12T08:00:00Z" },
          { status: "rdv_planifie", appointment_at: "2026-11-10T08:00:00Z" },
          // Rendez-vous passé : plus « à venir ».
          { status: "rdv_planifie", appointment_at: "2026-11-07T08:00:00Z" },
          { status: "devis_envoye", appointment_at: "2026-11-01T08:00:00Z" },
          { status: "devis_signe", appointment_at: null },
          { status: "planifie", appointment_at: null },
          { status: "en_cours", appointment_at: null },
          { status: "reserves_a_lever", appointment_at: null },
          { status: "cloture", appointment_at: null },
          { status: "annule", appointment_at: null },
        ],
        now,
      ),
    ).toEqual({
      appointmentCount: 2,
      nextAppointment: "2026-11-10T08:00:00Z",
      quotesToSign: 1,
      depositsDue: 1,
      planned: 1,
      ongoing: 2,
      closed: 1,
    });
  });
});

describe("chantierNext", () => {
  const now = new Date("2026-11-08T10:00:00Z");
  const base = { appointment_at: null, start_at: null };
  it("rendez-vous à venir, puis devis à envoyer une fois la visite passée", () => {
    expect(
      chantierNext(
        { ...base, status: "rdv_planifie", appointment_at: "2026-11-10T08:00:00Z" },
        now,
      ),
    ).toEqual({ kind: "rdv", at: "2026-11-10T08:00:00Z" });
    expect(
      chantierNext(
        { ...base, status: "rdv_planifie", appointment_at: "2026-11-07T08:00:00Z" },
        now,
      ),
    ).toEqual({ kind: "devis_a_envoyer", at: null });
  });
  it("démarrage daté, sinon l'état", () => {
    expect(
      chantierNext({ ...base, status: "planifie", start_at: "2026-11-16T07:00:00Z" }, now),
    ).toEqual({ kind: "demarrage", at: "2026-11-16T07:00:00Z" });
    expect(chantierNext({ ...base, status: "rdv_planifie" }, now)).toEqual({
      kind: "etat",
      at: null,
    });
    expect(chantierNext({ ...base, status: "devis_signe" }, now)).toEqual({
      kind: "etat",
      at: null,
    });
  });
});
