import { describe, expect, it } from "vitest";
import { formatAgo, formatCents, formatDateNumeric, formatDayAndTime } from "./format";

describe("mise en forme", () => {
  it("affiche les montants en euros à partir des centimes", () => {
    expect(formatCents(9185).replace(/\s/g, " ")).toBe("91,85 €");
    expect(formatCents(0).replace(/\s/g, " ")).toBe("0,00 €");
  });

  it("affiche les dates à l'heure de Paris", () => {
    expect(formatDateNumeric("2026-10-25T06:30:00Z")).toBe("25/10/2026");
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
});
