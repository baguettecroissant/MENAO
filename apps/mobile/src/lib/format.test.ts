import { describe, expect, it } from "vitest";
import {
  formatAgo,
  formatCents,
  formatDateNumeric,
  formatDay,
  formatDayAndTime,
  formatDayLabel,
  formatDuration,
  formatMonthName,
  formatTime,
  parisDateTime,
} from "./format";

describe("mise en forme", () => {
  it("affiche les montants en euros à partir des centimes", () => {
    expect(formatCents(9185).replace(/\s/g, " ")).toBe("91,85 €");
    expect(formatCents(0).replace(/\s/g, " ")).toBe("0,00 €");
  });

  it("affiche les dates à l'heure de Paris", () => {
    expect(formatDateNumeric("2026-10-25T06:30:00Z")).toBe("25/10/2026");
    // Minuit et demi à Paris : encore le 24 octobre en temps universel.
    expect(formatDay("2026-10-24T22:30:00Z")).toBe("25 octobre 2026");
    expect(formatDayAndTime("2026-10-25T06:30:00Z")).toEqual({
      day: "dimanche 25 octobre",
      time: "07h30",
    });
  });

  it("dit depuis combien de temps", () => {
    const now = new Date("2026-10-13T12:00:00Z");
    expect(formatAgo("2026-10-13T11:59:40Z", now)).toBe("à l'instant");
    expect(formatAgo("2026-10-13T11:55:00Z", now)).toBe("il y a 5 min");
    expect(formatAgo("2026-10-13T09:00:00Z", now)).toBe("il y a 3 h");
    expect(formatAgo("2026-10-12T09:00:00Z", now)).toBe("hier");
    expect(formatAgo("2026-10-09T09:00:00Z", now)).toBe("il y a 4 jours");
  });

  it("sépare les jours d'une conversation, à l'heure de Paris", () => {
    const now = new Date("2026-10-13T12:00:00Z");
    expect(formatTime("2026-10-13T06:30:00Z")).toBe("08h30");
    expect(formatDayLabel("2026-10-13T06:30:00Z", now)).toBe("Aujourd'hui");
    // 23h30 à Paris le 12 octobre.
    expect(formatDayLabel("2026-10-12T21:30:00Z", now)).toBe("Hier");
    expect(formatDayLabel("2026-10-05T10:00:00Z", now)).toBe("lundi 5 octobre 2026");
  });

  it("durées et mois du tableau de bord, comme sur le site", () => {
    const plain = (text: string) => text.replace(/\u00a0/g, " ");
    expect(plain(formatDuration(35))).toBe("35 min");
    expect(plain(formatDuration(135))).toBe("2 h 15");
    expect(plain(formatDuration(120))).toBe("2 h");
    expect(plain(formatDuration(27 * 60))).toBe("1 j 3 h");
    expect(formatMonthName("2026-09")).toBe("septembre");
  });

  it("pré-remplit la date et l'heure de Paris d'un instant", () => {
    // 07h30 UTC en octobre (heure d'été) : 09h30 à Paris.
    expect(parisDateTime("2026-10-20T07:30:00Z")).toEqual({ date: "2026-10-20", time: "09:30" });
    // 23h30 UTC le 31 décembre : déjà le 1er janvier à Paris.
    expect(parisDateTime("2026-12-31T23:30:00Z")).toEqual({ date: "2027-01-01", time: "00:30" });
  });
});
