import { describe, expect, it } from "vitest";
import { formatLongDate, fromIsoDate, toIsoDate } from "./dates";

describe("dates du calendrier", () => {
  it("écrit et relit une date sans décalage de fuseau", () => {
    expect(toIsoDate(new Date(2026, 9, 5))).toBe("2026-10-05");
    expect(toIsoDate(fromIsoDate("2026-12-31"))).toBe("2026-12-31");
    expect(fromIsoDate("2026-02-01").getDate()).toBe(1);
  });

  it("affiche la date en toutes lettres", () => {
    expect(formatLongDate("2026-10-25")).toBe("25 octobre 2026");
  });

  it("affiche aussi le jour d'un horodatage, à l'heure de Paris", () => {
    // Une vérification Sirene renvoie un horodatage complet (plantage de « Mon entreprise »).
    expect(formatLongDate("2026-10-17T12:34:56.789+00:00")).toBe("17 octobre 2026");
    expect(formatLongDate("2026-10-17T22:30:00Z")).toBe("18 octobre 2026");
    expect(formatLongDate("pas une date")).toBe("pas une date");
  });
});
