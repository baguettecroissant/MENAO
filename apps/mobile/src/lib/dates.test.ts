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
});
