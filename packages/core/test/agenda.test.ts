import { describe, expect, it } from "vitest";
import {
  SUGGESTED_HOURS,
  absenceError,
  absenceOn,
  addDays,
  availabilityStatus,
  availableFromChoices,
  blockedSlotError,
  gridSpan,
  hoursErrors,
  layoutDay,
  mondayOf,
  parisDateTime,
  slotConflicts,
  slotWarnings,
  suggestSlots,
  weekDates,
  weekStartFrom,
  weekdayOf,
  withinHours,
} from "../src/agenda";
import { buildCalendar } from "../src/ics";

describe("calendrier de la semaine (F-44)", () => {
  it("jour de la semaine, lundi et dates de la semaine", () => {
    expect(weekdayOf("2026-10-12")).toBe(1);
    expect(weekdayOf("2026-10-18")).toBe(7);
    expect(mondayOf("2026-10-14")).toBe("2026-10-12");
    expect(mondayOf("2026-10-12")).toBe("2026-10-12");
    expect(mondayOf("2026-10-18")).toBe("2026-10-12");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(weekDates("2026-10-26")).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });

  it("semaine affichée : celle de la date demandée, sinon celle du jour", () => {
    expect(weekStartFrom("2026-10-29", "2026-10-11")).toBe("2026-10-26");
    expect(weekStartFrom(undefined, "2026-10-11")).toBe("2026-10-05");
    expect(weekStartFrom("2026-02-30", "2026-10-11")).toBe("2026-10-05");
    expect(weekStartFrom("2031-01-01", "2026-10-11")).toBe("2026-10-05");
  });

  it("date et heure de Paris d'un instant, en été comme en hiver", () => {
    expect(parisDateTime(new Date("2026-10-13T13:20:00Z"))).toEqual({
      date: "2026-10-13",
      minutes: 15 * 60 + 20,
    });
    expect(parisDateTime(new Date("2026-12-01T23:30:00Z"))).toEqual({
      date: "2026-12-02",
      minutes: 30,
    });
  });
});

describe("horaires de travail (F-44)", () => {
  it("plages valides : format, ordre, trois plages par jour au plus, sans chevauchement", () => {
    expect(hoursErrors(SUGGESTED_HOURS)).toBeNull();
    expect(hoursErrors([])).toBeNull();
    expect(hoursErrors([{ weekday: 1, start: "8h", end: "12:00" }])).toBe("format");
    expect(hoursErrors([{ weekday: 1, start: "12:00", end: "08:00" }])).toBe("ordre");
    expect(
      hoursErrors([
        { weekday: 2, start: "08:00", end: "12:00" },
        { weekday: 2, start: "11:30", end: "17:00" },
      ]),
    ).toBe("chevauchement");
    expect(
      hoursErrors(
        [
          ["06:00", "08:00"],
          ["09:00", "11:00"],
          ["12:00", "14:00"],
          ["15:00", "17:00"],
        ].map(([start = "", end = ""]) => ({ weekday: 3 as const, start, end })),
      ),
    ).toBe("trop_de_plages");
  });

  it("créneau dans les horaires du jour, plages bout à bout acceptées", () => {
    expect(withinHours(SUGGESTED_HOURS, "2026-10-13", 8 * 60, 9 * 60)).toBe(true);
    expect(withinHours(SUGGESTED_HOURS, "2026-10-13", 11 * 60 + 30, 12 * 60 + 30)).toBe(false);
    expect(withinHours(SUGGESTED_HOURS, "2026-10-17", 9 * 60, 10 * 60)).toBe(false);
    expect(
      hoursErrors([
        { weekday: 6, start: "08:00", end: "12:00" },
        { weekday: 6, start: "12:00", end: "14:00" },
      ]),
    ).toBeNull();
  });
});

describe("absences et statut de disponibilité (F-44)", () => {
  const absences = [
    { startsOn: "2026-10-20", endsOn: "2026-10-24", label: "Congés" },
    { startsOn: "2026-10-25", endsOn: "2026-10-26", label: null },
  ];

  it("saisie d'une absence : dates valides, dans l'ordre, pas finie, un an au plus", () => {
    const today = "2026-10-11";
    expect(absenceError("2026-10-20", "2026-10-24", today)).toBeNull();
    // Commencée hier, elle se termine demain : acceptée.
    expect(absenceError("2026-10-10", "2026-10-12", today)).toBeNull();
    expect(absenceError("2026-10-32", "2026-10-24", today)).toBe("invalide");
    expect(absenceError("2026-10-24", "2026-10-20", today)).toBe("ordre");
    expect(absenceError("2026-10-01", "2026-10-10", today)).toBe("passee");
    expect(absenceError("2026-11-01", "2027-11-01", today)).toBe("trop_longue");
    expect(absenceError("2027-10-13", "2027-10-14", today)).toBe("trop_loin");
  });

  it("absence couvrant une date, bornes incluses", () => {
    expect(absenceOn(absences, "2026-10-20")?.label).toBe("Congés");
    expect(absenceOn(absences, "2026-10-24")?.label).toBe("Congés");
    expect(absenceOn(absences, "2026-10-19")).toBeNull();
  });

  it("pause, puis congés (absences consécutives réunies), puis date de reprise", () => {
    expect(
      availabilityStatus({ paused: true, availableFrom: null, absences, today: "2026-10-21" }),
    ).toEqual({ kind: "pause" });
    expect(
      availabilityStatus({ paused: false, availableFrom: null, absences, today: "2026-10-21" }),
    ).toEqual({ kind: "conges", until: "2026-10-26", label: "Congés" });
    expect(
      availabilityStatus({
        paused: false,
        availableFrom: "2026-11-02",
        absences,
        today: "2026-10-15",
      }),
    ).toEqual({ kind: "a_partir_du", date: "2026-11-02" });
    expect(
      availabilityStatus({
        paused: false,
        availableFrom: "2026-10-01",
        absences,
        today: "2026-10-15",
      }),
    ).toEqual({ kind: "disponible" });
  });

  it("raccourcis de la date « nouveaux chantiers à partir du »", () => {
    expect(availableFromChoices("2026-10-11")).toEqual([
      { key: "maintenant", date: null },
      { key: "semaine", date: "2026-10-18" },
      { key: "deux_semaines", date: "2026-10-25" },
      { key: "mois", date: "2026-11-11" },
    ]);
  });
});

describe("créneaux de rendez-vous (F-18, F-44)", () => {
  const hours = SUGGESTED_HOURS;

  it("avertissements : hors horaires, absence, autre rendez-vous", () => {
    const busy = [{ start: "2026-10-13T13:20:00Z", durationMinutes: 60 }];
    // Mardi 13 octobre 15 h 30 à Paris : pendant la visite de 15 h 20.
    expect(
      slotWarnings({
        start: new Date("2026-10-13T13:30:00Z"),
        durationMinutes: 60,
        hours,
        absences: [],
        busy,
      }),
    ).toEqual(["conflit"]);
    // Samedi : hors horaires.
    expect(
      slotWarnings({
        start: new Date("2026-10-17T08:00:00Z"),
        durationMinutes: 60,
        hours,
        absences: [],
        busy: [],
      }),
    ).toEqual(["hors_horaires"]);
    // Pendant une absence.
    expect(
      slotWarnings({
        start: new Date("2026-10-21T08:00:00Z"),
        durationMinutes: 60,
        hours,
        absences: [{ startsOn: "2026-10-20", endsOn: "2026-10-24" }],
        busy: [],
      }),
    ).toEqual(["absence"]);
    // Sans horaires renseignés : pas d'avertissement d'horaires.
    expect(
      slotWarnings({
        start: new Date("2026-10-17T08:00:00Z"),
        durationMinutes: 60,
        hours: [],
        absences: [],
        busy: [],
      }),
    ).toEqual([]);
  });

  it("créneau bloqué : heures valides, début avant la fin, pas déjà terminé", () => {
    const now = new Date("2026-10-13T08:00:00Z"); // mardi 10 h à Paris
    expect(blockedSlotError("2026-10-13", "14:00", "16:00", now)).toBeNull();
    // Commencé, pas fini : accepté.
    expect(blockedSlotError("2026-10-13", "09:00", "11:00", now)).toBeNull();
    expect(blockedSlotError("2026-10-13", "9h", "11:00", now)).toBe("invalide");
    expect(blockedSlotError("2026-10-13", "16:00", "14:00", now)).toBe("ordre");
    expect(blockedSlotError("2026-10-13", "08:00", "09:30", now)).toBe("passe");
    expect(blockedSlotError("2027-10-20", "08:00", "09:00", now)).toBe("trop_loin");
  });

  it("éléments en conflit, pour les nommer", () => {
    const busy = [
      { id: "visite", start: "2026-10-13T13:20:00Z", durationMinutes: 60 },
      { id: "creneau", start: "2026-10-13T15:00:00Z", durationMinutes: 30 },
    ];
    expect(slotConflicts(new Date("2026-10-13T14:00:00Z"), 90, busy).map((b) => b.id)).toEqual([
      "visite",
      "creneau",
    ]);
    // Entre la fin de l'un et le début de l'autre : pas de conflit.
    expect(slotConflicts(new Date("2026-10-13T14:20:00Z"), 40, busy)).toEqual([]);
  });

  it("suggestions : jours travaillés, hors absences et rendez-vous, un le matin, un l'après-midi", () => {
    // Vendredi 9 octobre, 18 h à Paris.
    const now = new Date("2026-10-09T16:00:00Z");
    const slots = suggestSlots({
      hours,
      absences: [{ startsOn: "2026-10-12", endsOn: "2026-10-12" }],
      busy: [{ start: "2026-10-13T06:00:00Z", durationMinutes: 60 }],
      now,
      count: 4,
    });
    expect(slots.map((d) => parisDateTime(d))).toEqual([
      // Lundi 12 : absent. Mardi 13 : 8 h occupé, 8 h 30 chevauche aussi la visite de 8 h à 9 h.
      { date: "2026-10-13", minutes: 9 * 60 },
      { date: "2026-10-13", minutes: 13 * 60 + 30 },
      { date: "2026-10-14", minutes: 8 * 60 },
      { date: "2026-10-14", minutes: 13 * 60 + 30 },
    ]);
  });
});

describe("vue semaine (F-44)", () => {
  it("heures affichées : 8 h – 18 h au moins, élargies aux horaires et aux événements", () => {
    expect(gridSpan(SUGGESTED_HOURS, [])).toEqual({ start: 8 * 60, end: 18 * 60 });
    expect(
      gridSpan(
        [{ weekday: 6, start: "07:30", end: "12:00" }],
        [{ startMinutes: 18 * 60 + 30, endMinutes: 19 * 60 + 30 }],
      ),
    ).toEqual({ start: 7 * 60, end: 20 * 60 });
  });

  it("événements qui se chevauchent côte à côte, les autres sur toute la largeur", () => {
    const placed = layoutDay([
      { id: "b", startMinutes: 510, endMinutes: 570 },
      { id: "a", startMinutes: 480, endMinutes: 540 },
      { id: "c", startMinutes: 570, endMinutes: 600 },
      { id: "d", startMinutes: 780, endMinutes: 840 },
    ]);
    expect(placed.map((p) => [p.item.id, p.column, p.columns])).toEqual([
      ["a", 0, 2],
      ["b", 1, 2],
      ["c", 0, 1],
      ["d", 0, 1],
    ]);
  });
});

describe("agenda à synchroniser (.ics, F-44)", () => {
  it("rendez-vous horaires et absences sur la journée, dans un seul calendrier", () => {
    const ics = buildCalendar("MENAO, agenda de Noé", [
      {
        uid: "visite-1",
        start: new Date("2026-10-13T13:20:00Z"),
        durationMinutes: 60,
        summary: "Visite : fuite sous l'évier",
        location: "Nice",
        stamp: new Date("2026-10-11T10:00:00Z"),
      },
      {
        uid: "absence-1",
        startDate: "2026-10-20",
        endDate: "2026-10-24",
        summary: "Congés",
        stamp: new Date("2026-10-11T10:00:00Z"),
      },
    ]);
    expect(ics).toContain("X-WR-CALNAME:MENAO\\, agenda de Noé");
    expect(ics).toContain("DTSTART:20261013T132000Z");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261020");
    // Fin exclusive : le lendemain du dernier jour.
    expect(ics).toContain("DTEND;VALUE=DATE:20261025");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});
