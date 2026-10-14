import { describe, expect, it } from "vitest";
import type { ChantierStatus } from "../src/chantier-state";
import { CLIENT_TODO_KINDS, clientHomeSummary, clientTodos } from "../src/client-home";

const chantier = (id: string, status: ChantierStatus, more: Record<string, unknown> = {}) => ({
  id,
  status,
  quoteId: "q-" + id,
  quoteStatus: "signe",
  depositCents: 30000,
  depositStatus: null,
  balanceCents: 70000,
  balanceStatus: null,
  liftSignaled: false,
  reviewed: false,
  ...more,
});

describe("accueil du client connecté : ce qui l'attend (ADR 0082)", () => {
  it("reprend l'action attendue de « Mes chantiers » : devis à signer, acompte, solde", () => {
    const todos = clientTodos([
      chantier("a", "devis_envoye", { quoteStatus: "envoye" }),
      chantier("b", "devis_signe"),
      chantier("c", "receptionne"),
    ]);
    expect(todos.map((t) => [t.kind, t.row.id])).toEqual([
      ["signer_devis", "a"],
      ["payer_acompte", "b"],
      ["payer_solde", "c"],
    ]);
    expect(todos[1]).toMatchObject({ quoteId: "q-b", amountCents: 30000 });
    expect(todos[2]).toMatchObject({ quoteId: "q-c", amountCents: 70000 });
  });

  it("ajoute la fin de chantier : réception à valider, levée des réserves signalée, avis", () => {
    const todos = clientTodos([
      chantier("d", "travaux_termines"),
      chantier("e", "reserves_a_lever", { liftSignaled: true }),
      chantier("f", "cloture"),
    ]);
    expect(todos.map((t) => [t.kind, t.row.id])).toEqual([
      ["valider_reception", "d"],
      ["confirmer_levee", "e"],
      ["donner_avis", "f"],
    ]);
  });

  it("n'invente rien : réserves non reprises, avis laissé, paiement en cours, attente de l'artisan", () => {
    expect(
      clientTodos([
        chantier("g", "reserves_a_lever"),
        chantier("h", "cloture", { reviewed: true }),
        chantier("i", "devis_signe", { depositStatus: "en_cours" }),
        chantier("j", "receptionne", { balanceStatus: "paye" }),
        chantier("k", "devis_en_revision", { quoteStatus: "envoye" }),
        chantier("l", "rdv_planifie", { quoteId: null, quoteStatus: null }),
        chantier("m", "en_cours"),
        chantier("n", "en_litige"),
        chantier("o", "annule"),
      ]),
    ).toEqual([]);
  });

  it("dans l'ordre du parcours, l'avis en dernier ; l'ordre des chantiers est gardé pour un même type", () => {
    expect(CLIENT_TODO_KINDS).toEqual([
      "signer_devis",
      "payer_acompte",
      "valider_reception",
      "confirmer_levee",
      "payer_solde",
      "donner_avis",
    ]);
    const todos = clientTodos([
      chantier("p", "cloture"),
      chantier("q", "receptionne"),
      chantier("r", "devis_envoye", { quoteStatus: "envoye" }),
      chantier("s", "cloture"),
      chantier("t", "devis_envoye", { quoteStatus: "envoye" }),
    ]);
    expect(todos.map((t) => t.row.id)).toEqual(["r", "t", "q", "p", "s"]);
  });
});

describe("message d'accueil du client connecté", () => {
  it("actions en attente d'abord, puis chantiers en cours, puis demandes envoyées", () => {
    expect(clientHomeSummary({ todos: 2, activeChantiers: 3, awaitingRequests: 1 })).toEqual({
      kind: "actions",
      count: 2,
    });
    expect(clientHomeSummary({ todos: 0, activeChantiers: 1, awaitingRequests: 2 })).toEqual({
      kind: "a_jour",
    });
    expect(clientHomeSummary({ todos: 0, activeChantiers: 0, awaitingRequests: 2 })).toEqual({
      kind: "demandes",
      count: 2,
    });
    expect(clientHomeSummary({ todos: 0, activeChantiers: 0, awaitingRequests: 0 })).toEqual({
      kind: "accueil",
    });
  });
});
