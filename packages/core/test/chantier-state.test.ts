import { Constants } from "@menao/db";
import { describe, expect, it } from "vitest";
import {
  ACTIVE_CHANTIER_STATUSES,
  ARTISAN_CANCELLABLE_STATUSES,
  CHANTIER_EVENTS,
  CLIENT_CANCELLABLE_STATUSES,
  CHANTIER_STATUSES,
  CHANTIER_TRANSITIONS,
  type ChantierEvent,
  type ChantierStatus,
  canTransition,
  clientsAwaitingQuote,
  nextChantierStatus,
} from "../src/chantier-state";

describe("machine à états du chantier (spec §9)", () => {
  it("parcours complet jusqu'à la clôture, avec révision du devis et réserves", () => {
    const path: [ChantierEvent, ChantierStatus][] = [
      ["rdv_fixe", "rdv_planifie"],
      ["devis_envoye", "devis_envoye"],
      ["revision_demandee", "devis_en_revision"],
      ["devis_envoye", "devis_envoye"],
      ["devis_signe", "devis_signe"],
      ["acompte_paye", "acompte_paye"],
      ["date_confirmee", "planifie"],
      ["demarrage", "en_cours"],
      ["fin_declaree", "travaux_termines"],
      ["pv_avec_reserves", "reserves_a_lever"],
      ["reserves_levees", "receptionne"],
      ["solde_paye", "cloture"],
    ];
    let status: ChantierStatus = "demande_envoyee";
    for (const [event, expected] of path) {
      const next = nextChantierStatus(status, event);
      expect(next, `${event} depuis ${status}`).toBe(expected);
      status = expected;
    }
  });

  it("réception sans réserves, refus du devis", () => {
    expect(nextChantierStatus("travaux_termines", "pv_sans_reserves")).toBe("receptionne");
    expect(nextChantierStatus("devis_envoye", "devis_refuse")).toBe("devis_refuse");
  });

  it("refuse les transitions invalides", () => {
    expect(nextChantierStatus("demande_envoyee", "devis_envoye")).toBeNull();
    expect(nextChantierStatus("rdv_planifie", "devis_signe")).toBeNull();
    expect(nextChantierStatus("rdv_planifie", "rdv_fixe")).toBeNull();
    expect(nextChantierStatus("cloture", "litige_ouvert")).toBeNull();
    expect(nextChantierStatus("annule", "rdv_fixe")).toBeNull();
    expect(canTransition("devis_refuse", "annulation")).toBe(false);
    expect(canTransition("rdv_planifie", "annulation")).toBe(true);
  });

  it("annulation seulement avant le paiement de l'acompte", () => {
    const before: ChantierStatus[] = [
      "demande_envoyee",
      "rdv_planifie",
      "devis_envoye",
      "devis_en_revision",
      "devis_signe",
    ];
    for (const s of before) expect(nextChantierStatus(s, "annulation"), s).toBe("annule");
    const after: ChantierStatus[] = [
      "acompte_paye",
      "planifie",
      "en_cours",
      "travaux_termines",
      "reserves_a_lever",
      "receptionne",
    ];
    for (const s of after) expect(nextChantierStatus(s, "annulation"), s).toBeNull();
  });

  it("litige depuis tout état actif, résolu vers l'état précédent ou annulé", () => {
    for (const s of ACTIVE_CHANTIER_STATUSES) {
      expect(nextChantierStatus(s, "litige_ouvert"), s).toBe("en_litige");
    }
    expect(nextChantierStatus("demande_envoyee", "litige_ouvert")).toBeNull();
    expect(nextChantierStatus("en_litige", "litige_ouvert")).toBeNull();
    expect(nextChantierStatus("en_litige", "litige_resolu", "en_cours")).toBe("en_cours");
    expect(nextChantierStatus("en_litige", "litige_resolu", null)).toBeNull();
    expect(nextChantierStatus("en_litige", "litige_resolu", "cloture")).toBeNull();
    expect(nextChantierStatus("en_cours", "litige_resolu", "en_cours")).toBeNull();
    expect(nextChantierStatus("en_litige", "litige_annule")).toBe("annule");
  });

  it("une seule cible par couple (état, événement)", () => {
    const keys = CHANTIER_TRANSITIONS.map(([from, event]) => `${from}:${event}`);
    expect(new Set(keys).size).toBe(keys.length);
    // 14 transitions du parcours, 5 annulations, 10 ouvertures de litige, 1 clôture de litige.
    expect(CHANTIER_TRANSITIONS).toHaveLength(30);
  });

  it("l'artisan annule un chantier tant qu'aucun devis n'est signé", () => {
    expect(ARTISAN_CANCELLABLE_STATUSES).toEqual([
      "rdv_planifie",
      "devis_envoye",
      "devis_en_revision",
    ]);
    for (const s of ARTISAN_CANCELLABLE_STATUSES) expect(canTransition(s, "annulation")).toBe(true);
  });

  it("le client annule aussi, tant que l'acompte n'est pas payé et aucun devis signé (F-12)", () => {
    expect(CLIENT_CANCELLABLE_STATUSES).toEqual([
      "rdv_planifie",
      "devis_envoye",
      "devis_en_revision",
    ]);
    for (const s of CLIENT_CANCELLABLE_STATUSES) expect(canTransition(s, "annulation")).toBe(true);
    for (const s of ["devis_signe", "acompte_paye", "travaux_en_cours"] as const) {
      expect(CLIENT_CANCELLABLE_STATUSES).not.toContain(s);
    }
  });

  it("cohérence avec les enums de la base", () => {
    expect([...Constants.public.Enums.chantier_status].sort()).toEqual(
      [...CHANTIER_STATUSES].sort(),
    );
    expect([...Constants.public.Enums.chantier_event].sort()).toEqual([...CHANTIER_EVENTS].sort());
  });
});

describe("tableau de bord (F-16)", () => {
  it("« En attente de devis » compte les clients distincts", () => {
    expect(
      clientsAwaitingQuote([
        { status: "rdv_planifie", particulierId: "a" },
        { status: "devis_en_revision", particulierId: "a" },
        { status: "rdv_planifie", particulierId: "b" },
        { status: "devis_envoye", particulierId: "c" },
        { status: "annule", particulierId: "d" },
      ]),
    ).toBe(2);
    expect(clientsAwaitingQuote([])).toBe(0);
  });
});
