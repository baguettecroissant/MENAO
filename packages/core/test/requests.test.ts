import { Constants } from "@menao/db";
import { describe, expect, it } from "vitest";
import {
  ARTISAN_CANCEL_REASONS,
  cancelReport,
  inboxGroups,
  CLIENT_CANCEL_REASONS,
  joinNames,
  MAX_ARTISANS_PER_REQUEST,
  REFUSAL_REASONS,
  REQUEST_RESPONSE_HOURS,
  RESPONSE_TIME_MIN_RESPONSES,
  RESPONSE_TIME_WINDOW_DAYS,
  remainingSlots,
  requestDeadline,
  responseTimeBucket,
  timeLeft,
} from "../src/requests";

describe("demandes de chantier (F-11, F-17)", () => {
  it("paramètres validés : 3 artisans, 48 h", () => {
    expect(MAX_ARTISANS_PER_REQUEST).toBe(3);
    expect(REQUEST_RESPONSE_HOURS).toBe(48);
    expect(REFUSAL_REASONS).toEqual(["planning_complet", "hors_expertise", "hors_zone", "autre"]);
  });

  it("places restantes : les demandes refusées ou expirées libèrent une place", () => {
    expect(remainingSlots(["envoyee", "acceptee"])).toBe(1);
    expect(remainingSlots(["refusee", "expiree", "annulee"])).toBe(3);
    expect(remainingSlots(["envoyee", "envoyee", "acceptee", "envoyee"])).toBe(0);
  });

  it("échéance de réponse et temps restant", () => {
    const sent = new Date("2026-10-09T10:00:00Z");
    const deadline = requestDeadline(sent);
    expect(deadline.toISOString()).toBe("2026-10-11T10:00:00.000Z");
    expect(timeLeft(deadline, new Date("2026-10-10T09:30:00Z"))).toEqual({
      hours: 24,
      minutes: 30,
    });
    expect(timeLeft(deadline, new Date("2026-10-12T00:00:00Z"))).toBeNull();
  });
});

describe("demandes à traiter par l'artisan (compteur du menu)", () => {
  it("compte les demandes envoyées et encore ouvertes", async () => {
    const { requestsAwaitingAnswer } = await import("../src/requests");
    const now = new Date("2026-10-11T12:00:00Z");
    const rows = [
      { status: "envoyee", expires_at: "2026-10-12T12:00:00Z" },
      { status: "envoyee", expires_at: "2026-10-11T11:59:00Z" },
      { status: "acceptee", expires_at: "2026-10-12T12:00:00Z" },
      { status: "refusee", expires_at: "2026-10-12T12:00:00Z" },
    ];
    expect(requestsAwaitingAnswer(rows, now)).toEqual([rows[0]]);
    expect(requestsAwaitingAnswer([], now)).toEqual([]);
  });
});

describe("temps de réponse moyen (F-10)", () => {
  it("publié à partir de 3 réponses sur 180 jours (même règle en base)", () => {
    expect(RESPONSE_TIME_MIN_RESPONSES).toBe(3);
    expect(RESPONSE_TIME_WINDOW_DAYS).toBe(180);
  });

  it("tranches : moins d'1 h, moins de 3 h, dans la journée, sous 48 h ; au-delà, rien", () => {
    expect(responseTimeBucket(0)).toBe("1h");
    expect(responseTimeBucket(59)).toBe("1h");
    expect(responseTimeBucket(60)).toBe("3h");
    expect(responseTimeBucket(179)).toBe("3h");
    expect(responseTimeBucket(180)).toBe("24h");
    expect(responseTimeBucket(24 * 60 - 1)).toBe("24h");
    expect(responseTimeBucket(24 * 60)).toBe("48h");
    expect(responseTimeBucket(48 * 60 - 1)).toBe("48h");
    expect(responseTimeBucket(48 * 60)).toBeNull();
  });
});

describe("annulation par le client (F-11, F-12)", () => {
  it("motifs proposés, alignés sur la base", () => {
    expect(CLIENT_CANCEL_REASONS).toEqual([
      "plus_besoin",
      "autre_artisan",
      "delai",
      "budget",
      "autre",
    ]);
    expect([...Constants.public.Enums.client_cancel_reason]).toEqual([...CLIENT_CANCEL_REASONS]);
  });
});

describe("joinNames", () => {
  it("assemble les prénoms à la française", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["Noé"])).toBe("Noé");
    expect(joinNames(["Noé", "Inès"])).toBe("Noé et Inès");
    expect(joinNames(["Noé", "Inès", "Lou"])).toBe("Noé, Inès et Lou");
  });
});

describe("onglet « Demandes » (ADR 0130)", () => {
  it("à traiter d'abord, l'échéance la plus proche en tête ; puis les autres dans leur ordre", () => {
    const now = new Date("2026-10-18T08:00:00Z");
    const rows = [
      { id: "acceptee", status: "acceptee", expires_at: "2026-10-17T08:00:00Z" },
      { id: "loin", status: "envoyee", expires_at: "2026-10-19T20:00:00Z" },
      { id: "expiree", status: "envoyee", expires_at: "2026-10-18T07:00:00Z" },
      { id: "proche", status: "envoyee", expires_at: "2026-10-18T12:00:00Z" },
      { id: "refusee", status: "refusee", expires_at: "2026-10-19T08:00:00Z" },
    ];
    const { open, done } = inboxGroups(rows, now);
    expect(open.map((r) => r.id)).toEqual(["proche", "loin"]);
    expect(done.map((r) => r.id)).toEqual(["acceptee", "expiree", "refusee"]);
  });
});

describe("annulation par l'artisan : signalement (ADR 0145)", () => {
  it("motifs proposés, « autre » en dernier", () => {
    expect(ARTISAN_CANCEL_REASONS).toEqual([
      "client_injoignable",
      "client_absent",
      "fausse_demande",
      "autre",
    ]);
  });

  it("seuls les trois premiers sont des signalements, comme en base", () => {
    expect(cancelReport("autre")).toBeNull();
    expect(cancelReport("client_absent")).toBe("client_absent");
    expect(ARTISAN_CANCEL_REASONS.filter((r) => cancelReport(r) !== null)).toEqual(
      Constants.public.Enums.artisan_report_kind,
    );
  });
});
