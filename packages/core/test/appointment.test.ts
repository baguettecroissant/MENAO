import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_MAX_DAYS_AHEAD,
  appointmentInputError,
  parisLocalToDate,
  upcomingAppointments,
} from "../src/appointment";
import { buildIcs } from "../src/ics";

describe("rendez-vous (F-17, F-18)", () => {
  it("convertit une heure de Paris en instant UTC, en hiver comme en été", () => {
    expect(parisLocalToDate("2026-02-20", "16:30").toISOString()).toBe("2026-02-20T15:30:00.000Z");
    expect(parisLocalToDate("2026-07-14", "09:00").toISOString()).toBe("2026-07-14T07:00:00.000Z");
    // Jours de changement d'heure (29 mars et 25 octobre 2026).
    expect(parisLocalToDate("2026-03-29", "12:00").toISOString()).toBe("2026-03-29T10:00:00.000Z");
    expect(parisLocalToDate("2026-10-25", "12:00").toISOString()).toBe("2026-10-25T11:00:00.000Z");
  });

  it("date et heure à venir, au plus 180 jours à l'avance", () => {
    expect(APPOINTMENT_MAX_DAYS_AHEAD).toBe(180);
    const now = new Date("2026-10-10T08:00:00Z"); // 10 h 00 à Paris
    expect(appointmentInputError("2026-10-10", "09:30", now)).toBe("passe");
    expect(appointmentInputError("2026-10-10", "10:30", now)).toBeNull();
    expect(appointmentInputError("2027-04-08", "09:00", now)).toBeNull();
    expect(appointmentInputError("2027-04-09", "10:00", now)).toBe("trop_loin");
  });

  it("refuse les dates et heures mal formées ou inexistantes", () => {
    const now = new Date("2026-10-10T08:00:00Z");
    expect(appointmentInputError("2026-02-30", "10:00", now)).toBe("invalide");
    expect(appointmentInputError("2026-13-01", "10:00", now)).toBe("invalide");
    expect(appointmentInputError("2026-10-11", "24:00", now)).toBe("invalide");
    expect(appointmentInputError("11/10/2026", "10:00", now)).toBe("invalide");
    expect(appointmentInputError("", "", now)).toBe("invalide");
  });

  it("prochains rendez-vous : à venir, du plus proche au plus lointain", () => {
    const now = new Date("2026-10-10T08:00:00Z");
    const rows = [
      { id: "passe", status: "rdv_planifie", appointmentAt: "2026-10-09T08:00:00Z" },
      { id: "loin", status: "rdv_planifie", appointmentAt: "2026-11-20T08:00:00Z" },
      { id: "proche", status: "rdv_planifie", appointmentAt: "2026-10-12T08:00:00Z" },
      { id: "annule", status: "annule", appointmentAt: "2026-10-11T08:00:00Z" },
      { id: "sans", status: "rdv_planifie", appointmentAt: null },
    ] as const;
    expect(upcomingAppointments(rows, now).map((r) => r.id)).toEqual(["proche", "loin"]);
    expect(upcomingAppointments(rows, now, 1).map((r) => r.id)).toEqual(["proche"]);
  });
});

describe("fichier agenda .ics (F-44)", () => {
  const base = {
    uid: "c0ffee00-0000-4000-8000-000000000001",
    start: new Date("2026-02-20T15:30:00Z"),
    durationMinutes: 60,
    summary: "Rendez-vous MENAO : prises, salle de bain; cuisine",
    location: "1 Rue de l'Exemple\n06000 Nice",
    description: null,
    stamp: new Date("2026-02-01T10:00:00Z"),
  };

  it("événement en UTC, texte échappé, lignes CRLF", () => {
    const ics = buildIcs(base);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics).toContain("UID:c0ffee00-0000-4000-8000-000000000001@menao.fr\r\n");
    expect(ics).toContain("DTSTAMP:20260201T100000Z\r\n");
    expect(ics).toContain("DTSTART:20260220T153000Z\r\n");
    expect(ics).toContain("DTEND:20260220T163000Z\r\n");
    expect(ics).toContain("SUMMARY:Rendez-vous MENAO : prises\\, salle de bain\\; cuisine\r\n");
    expect(ics).toContain("LOCATION:1 Rue de l'Exemple\\n06000 Nice\r\n");
    expect(ics).not.toContain("DESCRIPTION");
    expect(ics.endsWith("END:VEVENT\r\nEND:VCALENDAR\r\n")).toBe(true);
  });

  it("replie les lignes au-delà de 75 octets sans couper un caractère", () => {
    const summary = "Rénovation " + "é".repeat(60);
    const ics = buildIcs({ ...base, summary, location: null });
    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(ics.replace(/\r\n /g, "")).toContain(`SUMMARY:${summary}\r\n`);
    expect(ics).not.toContain("LOCATION");
  });
});
