import { describe, expect, it } from "vitest";
import { SUGGESTED_HOURS, type AgendaItem } from "../src/agenda";
import {
  agendaItemsAfter,
  defaultAgendaDay,
  freeRangesOn,
  placeAgendaItem,
} from "../src/agenda-day";

const item = (over: Partial<AgendaItem> & Pick<AgendaItem, "start">): AgendaItem => ({
  id: over.start,
  kind: "visite",
  durationMinutes: 60,
  title: null,
  place: null,
  chantierId: null,
  ...over,
});

describe("journée de l'agenda (F-44, lot 4)", () => {
  it("place un élément à l'heure de Paris, sans déborder sur le lendemain", () => {
    // Novembre : Paris = UTC + 1.
    expect(placeAgendaItem(item({ start: "2026-11-10T09:30:00Z" }))).toMatchObject({
      date: "2026-11-10",
      startMinutes: 10 * 60 + 30,
      endMinutes: 11 * 60 + 30,
    });
    expect(
      placeAgendaItem(item({ start: "2026-11-10T22:30:00Z", durationMinutes: 120 })),
    ).toMatchObject({ date: "2026-11-10", startMinutes: 23 * 60 + 30, endMinutes: 24 * 60 });
  });

  it("choisit aujourd'hui dans la semaine en cours, sinon le lundi", () => {
    expect(defaultAgendaDay("2026-11-09", "2026-11-10")).toBe("2026-11-10");
    expect(defaultAgendaDay("2026-11-09", "2026-11-15")).toBe("2026-11-15");
    expect(defaultAgendaDay("2026-11-16", "2026-11-10")).toBe("2026-11-16");
    expect(defaultAgendaDay("2026-11-02", "2026-11-10")).toBe("2026-11-02");
  });

  it("liste les éléments des jours suivants de la semaine, dans l'ordre", () => {
    const items = [
      { id: "a", date: "2026-11-12", startMinutes: 600 },
      { id: "b", date: "2026-11-10", startMinutes: 480 },
      { id: "c", date: "2026-11-11", startMinutes: 900 },
      { id: "d", date: "2026-11-11", startMinutes: 480 },
      { id: "e", date: "2026-11-16", startMinutes: 480 },
    ];
    expect(agendaItemsAfter(items, "2026-11-10", "2026-11-15").map((i) => i.id)).toEqual([
      "d",
      "c",
      "a",
    ]);
    expect(agendaItemsAfter(items, "2026-11-15", "2026-11-15")).toEqual([]);
  });

  describe("plages libres", () => {
    const date = "2026-11-10"; // mardi
    const placed = (start: string, durationMinutes = 60, kind: AgendaItem["kind"] = "visite") =>
      placeAgendaItem(item({ start, durationMinutes, kind }));

    it("journée vide : les horaires de travail", () => {
      expect(freeRangesOn({ date, hours: SUGGESTED_HOURS, items: [] })).toEqual([
        { start: "08:00", end: "12:00" },
        { start: "13:30", end: "17:30" },
      ]);
    });

    it("retire les rendez-vous et les créneaux bloqués, garde les plages d'une heure au moins", () => {
      const items = [
        // 8 h – 9 h : visite ; 10 h 30 – 11 h 30 : visite ; 14 h – 15 h 30 : créneau bloqué.
        placed("2026-11-10T07:00:00Z"),
        placed("2026-11-10T09:30:00Z"),
        placed("2026-11-10T13:00:00Z", 90, "creneau"),
        // Autre jour : sans effet.
        placed("2026-11-11T09:00:00Z"),
      ];
      expect(freeRangesOn({ date, hours: SUGGESTED_HOURS, items })).toEqual([
        { start: "09:00", end: "10:30" },
        { start: "15:30", end: "17:30" },
      ]);
      // 11 h 30 – 12 h (30 min) et 13 h 30 – 14 h (30 min) sont trop courts.
      expect(freeRangesOn({ date, hours: SUGGESTED_HOURS, items, minMinutes: 30 })).toEqual([
        { start: "09:00", end: "10:30" },
        { start: "11:30", end: "12:00" },
        { start: "13:30", end: "14:00" },
        { start: "15:30", end: "17:30" },
      ]);
    });

    it("un démarrage occupe la journée à partir de son heure", () => {
      expect(
        freeRangesOn({
          date,
          hours: SUGGESTED_HOURS,
          items: [placed("2026-11-10T09:00:00Z", 60, "demarrage")],
        }),
      ).toEqual([{ start: "08:00", end: "10:00" }]);
    });

    it("rien un jour d'absence, un jour fermé, sans horaires ou un jour passé", () => {
      const absences = [{ startsOn: "2026-11-09", endsOn: "2026-11-10" }];
      expect(freeRangesOn({ date, hours: SUGGESTED_HOURS, absences, items: [] })).toEqual([]);
      expect(freeRangesOn({ date: "2026-11-14", hours: SUGGESTED_HOURS, items: [] })).toEqual([]);
      expect(freeRangesOn({ date, hours: [], items: [] })).toEqual([]);
      expect(
        freeRangesOn({
          date,
          hours: SUGGESTED_HOURS,
          items: [],
          now: new Date("2026-11-11T08:00:00Z"),
        }),
      ).toEqual([]);
    });

    it("aujourd'hui : seulement ce qui reste, à partir de la demi-heure suivante", () => {
      // 14 h 10 à Paris → à partir de 14 h 30.
      expect(
        freeRangesOn({
          date,
          hours: SUGGESTED_HOURS,
          items: [],
          now: new Date("2026-11-10T13:10:00Z"),
        }),
      ).toEqual([{ start: "14:30", end: "17:30" }]);
      // Demain : journée entière.
      expect(
        freeRangesOn({
          date: "2026-11-11",
          hours: SUGGESTED_HOURS,
          items: [],
          now: new Date("2026-11-10T13:10:00Z"),
        }),
      ).toHaveLength(2);
    });
  });
});
