import { describe, expect, it } from "vitest";
import {
  artisanTodo,
  laterAppointments,
  URGENT_REQUEST_HOURS,
  type TodoInput,
} from "../src/artisan-todo";

// 18 octobre 2026, 10 h à Paris.
const now = new Date("2026-10-18T08:00:00Z");
const inHours = (h: number) => new Date(now.getTime() + h * 3_600_000).toISOString();

const empty: TodoInput = {
  requests: [],
  appointments: [],
  quotesToSend: [],
  documentsToRenew: [],
  urssafMissing: false,
  paymentsMissing: false,
  reviewsToAnswer: 0,
};

describe("accueil « À faire maintenant » (ADR 0130)", () => {
  it("rien à faire : liste vide", () => {
    expect(artisanTodo(empty, now)).toEqual([]);
  });

  it("ordre d'urgence : demande qui expire, rendez-vous du jour, demandes, devis, documents, paiements, avis", () => {
    const items = artisanTodo(
      {
        requests: [
          { id: "d-30h", expiresAt: inHours(30.5), title: "Salle de bain", place: "Blagnac" },
          { id: "d-5h", expiresAt: inHours(5.2), title: "Fuite", place: "Toulouse" },
          { id: "d-20h", expiresAt: inHours(20), title: "Cuisine", place: "Muret" },
        ],
        appointments: [
          {
            kind: "visite",
            at: inHours(4),
            chantierId: "c1",
            title: "Cuisine",
            place: "Colomiers",
          },
          // Demain : pas dans « À faire ».
          {
            kind: "demarrage",
            at: inHours(26),
            chantierId: "c2",
            title: "Terrasse",
            place: "Muret",
          },
        ],
        quotesToSend: [{ chantierId: "c3", title: "Terrasse", place: "Muret" }],
        documentsToRenew: ["urssaf"],
        urssafMissing: false,
        paymentsMissing: true,
        reviewsToAnswer: 2,
      },
      now,
    );
    expect(items.map((i) => (i.kind === "demande" ? `demande:${i.id}` : i.kind))).toEqual([
      "demande:d-5h",
      "rdv",
      "demande:d-20h",
      "demande:d-30h",
      "devis",
      "documents",
      "paiements",
      "avis",
    ]);
    expect(items[0]).toEqual({
      kind: "demande",
      id: "d-5h",
      title: "Fuite",
      place: "Toulouse",
      hoursLeft: 5,
      urgent: true,
    });
    expect(items[2]).toMatchObject({ hoursLeft: 20, urgent: false });
    expect(items.at(-1)).toEqual({ kind: "avis", count: 2 });
  });

  it("une demande devient urgente sous 12 h restantes ; expirée, elle disparaît", () => {
    expect(URGENT_REQUEST_HOURS).toBe(12);
    const at = (h: number) =>
      artisanTodo(
        { ...empty, requests: [{ id: "d", expiresAt: inHours(h), title: "", place: "" }] },
        now,
      );
    expect(at(12)[0]).toMatchObject({ urgent: false, hoursLeft: 12 });
    expect(at(11.9)[0]).toMatchObject({ urgent: true, hoursLeft: 11 });
    expect(at(-1)).toEqual([]);
  });

  it("rendez-vous du jour déjà passé : plus à faire", () => {
    const items = artisanTodo(
      {
        ...empty,
        appointments: [
          {
            kind: "visite",
            at: inHours(-1),
            chantierId: "c1",
            title: "Cuisine",
            place: "Colomiers",
          },
        ],
      },
      now,
    );
    expect(items).toEqual([]);
  });

  it("attestation URSSAF manquante, au rang des documents", () => {
    expect(artisanTodo({ ...empty, urssafMissing: true, reviewsToAnswer: 1 }, now)).toEqual([
      { kind: "urssaf" },
      { kind: "avis", count: 1 },
    ]);
  });

  it("cadeau de bienvenue à choisir : en dernier (ADR 0154)", () => {
    expect(artisanTodo({ ...empty, reviewsToAnswer: 1, welcomeGiftToChoose: true }, now)).toEqual([
      { kind: "avis", count: 1 },
      { kind: "cadeau" },
    ]);
  });

  it("rendez-vous suivants : ceux d'après aujourd'hui seulement", () => {
    const list = [
      { at: inHours(4), id: "aujourdhui" },
      { at: inHours(26), id: "demain" },
    ];
    expect(laterAppointments(list, now).map((a) => a.id)).toEqual(["demain"]);
  });
});
