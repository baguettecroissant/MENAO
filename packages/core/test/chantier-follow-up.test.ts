import { Constants } from "@menao/db";
import { describe, expect, it } from "vitest";
import {
  CHANTIER_JOURNAL_STATUSES,
  CHANTIER_START_MAX_DAYS_AHEAD,
  START_DATE_STATUSES,
  canDeclareFinished,
  canEditStartDate,
  chantierStartInputError,
  isJournalOpen,
  journalSummary,
  journalTimeline,
  type ChantierUpdate,
} from "../src/chantier-follow-up";
import { CHANTIER_TRANSITIONS } from "../src/chantier-state";

describe("suivi du chantier (F-22)", () => {
  it("date de démarrage : après l'acompte, modifiable jusqu'au début des travaux", () => {
    expect(START_DATE_STATUSES).toEqual(["acompte_paye", "planifie"]);
    expect(canEditStartDate("acompte_paye")).toBe(true);
    expect(canEditStartDate("planifie")).toBe(true);
    expect(canEditStartDate("devis_signe")).toBe(false);
    expect(canEditStartDate("en_cours")).toBe(false);
    // La confirmation est la transition date_confirmee de la machine à états.
    expect(CHANTIER_TRANSITIONS).toContainEqual(["acompte_paye", "date_confirmee", "planifie"]);
  });

  it("date et heure à venir, au plus 365 jours à l'avance, à l'heure de Paris", () => {
    expect(CHANTIER_START_MAX_DAYS_AHEAD).toBe(365);
    const now = new Date("2026-10-10T08:00:00Z"); // 10 h 00 à Paris
    expect(chantierStartInputError("2026-10-10", "09:30", now)).toBe("passe");
    expect(chantierStartInputError("2026-10-10", "10:30", now)).toBeNull();
    expect(chantierStartInputError("2027-10-10", "09:00", now)).toBeNull();
    expect(chantierStartInputError("2027-10-10", "11:00", now)).toBe("trop_loin");
    expect(chantierStartInputError("2026-02-30", "08:00", now)).toBe("invalide");
    expect(chantierStartInputError("2026-10-12", "8h", now)).toBe("invalide");
  });

  it("journal ouvert des travaux à la réception ; fin déclarée pendant les travaux", () => {
    expect(CHANTIER_JOURNAL_STATUSES).toEqual(["en_cours", "travaux_termines", "reserves_a_lever"]);
    expect(isJournalOpen("acompte_paye")).toBe(false);
    expect(isJournalOpen("planifie")).toBe(false);
    expect(isJournalOpen("en_cours")).toBe(true);
    expect(isJournalOpen("receptionne")).toBe(false);
    expect(canDeclareFinished("en_cours")).toBe(true);
    expect(canDeclareFinished("planifie")).toBe(false);
    expect(canDeclareFinished("travaux_termines")).toBe(false);
  });

  it("types d'entrée du journal identiques à l'énumération de la base", () => {
    expect([...Constants.public.Enums.chantier_update_kind]).toEqual(["message", "photo"]);
  });

  it("journal : photos et messages du plus récent au plus ancien, dernière mise à jour", () => {
    const photo = (id: string, createdAt: string): ChantierUpdate => ({
      id,
      kind: "photo",
      message: null,
      storagePath: `c/${id}.jpg`,
      createdAt,
    });
    const message = (id: string, createdAt: string, text: string): ChantierUpdate => ({
      id,
      kind: "message",
      message: text,
      storagePath: null,
      createdAt,
    });
    expect(
      journalSummary([
        photo("p1", "2026-10-12T09:00:00Z"),
        message("m1", "2026-10-12T08:00:00Z", "Matériel livré."),
        photo("p2", "2026-10-12T09:05:00Z"),
        message("m2", "2026-10-12T10:00:00Z", "Saignées rebouchées."),
      ]),
    ).toEqual({
      photos: ["c/p2.jpg", "c/p1.jpg"],
      messages: [
        { id: "m2", message: "Saignées rebouchées.", createdAt: "2026-10-12T10:00:00Z" },
        { id: "m1", message: "Matériel livré.", createdAt: "2026-10-12T08:00:00Z" },
      ],
      lastUpdateAt: "2026-10-12T10:00:00Z",
    });
    expect(journalSummary([])).toEqual({ photos: [], messages: [], lastUpdateAt: null });
  });
});

describe("journalTimeline", () => {
  const entry = (
    id: string,
    kind: "photo" | "message",
    createdAt: string,
    value: string | null,
  ): ChantierUpdate => ({
    id,
    kind,
    message: kind === "message" ? value : null,
    storagePath: kind === "photo" ? value : null,
    createdAt,
  });

  it("regroupe par jour de Paris, le plus récent d'abord", () => {
    expect(
      journalTimeline([
        entry("m1", "message", "2026-11-05T08:00:00Z", "Cloison déposée."),
        entry("p1", "photo", "2026-11-05T09:00:00Z", "c/p1.jpg"),
        // 23 h 30 à Paris le 6 novembre : encore le 6.
        entry("m2", "message", "2026-11-06T22:30:00Z", "Évacuations posées."),
        entry("p2", "photo", "2026-11-06T10:00:00Z", "c/p2.jpg"),
        entry("p3", "photo", "2026-11-06T10:05:00Z", null),
        entry("m3", "message", "2026-11-06T11:00:00Z", ""),
      ]),
    ).toEqual([
      {
        day: "2026-11-06",
        lastAt: "2026-11-06T22:30:00Z",
        messages: [{ id: "m2", message: "Évacuations posées.", createdAt: "2026-11-06T22:30:00Z" }],
        photos: ["c/p2.jpg"],
      },
      {
        day: "2026-11-05",
        lastAt: "2026-11-05T09:00:00Z",
        messages: [{ id: "m1", message: "Cloison déposée.", createdAt: "2026-11-05T08:00:00Z" }],
        photos: ["c/p1.jpg"],
      },
    ]);
  });

  it("vide sans entrée", () => {
    expect(journalTimeline([])).toEqual([]);
  });
});
