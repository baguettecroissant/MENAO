import { describe, expect, it } from "vitest";
import {
  EXPIRY_URGENT_DAYS,
  EXPIRY_WARNING_DAYS,
  MONITORED_DOCUMENT_TYPES,
  daysUntil,
  expiryStatus,
  expiryWatchLimit,
} from "../src/expiry";

const today = new Date("2026-10-09T12:00:00Z");

describe("suivi des échéances (F-51)", () => {
  it("surveille la décennale, la RC Pro et la pièce d'identité (pas le Kbis)", () => {
    expect(MONITORED_DOCUMENT_TYPES).toEqual(["decennale", "rc_pro", "identite"]);
  });

  it("alertes à J-30 et J-7", () => {
    expect(EXPIRY_WARNING_DAYS).toBe(30);
    expect(EXPIRY_URGENT_DAYS).toBe(7);
  });

  it("jours restants jusqu'à la date de fin (incluse)", () => {
    expect(daysUntil("2026-10-09", today)).toBe(0);
    expect(daysUntil("2026-10-10", today)).toBe(1);
    expect(daysUntil("2026-10-08", today)).toBe(-1);
  });

  it.each([
    [null, "ok"],
    ["2026-12-31", "ok"],
    ["2026-11-08", "bientot"],
    ["2026-10-16", "urgent"],
    ["2026-10-09", "urgent"],
    ["2026-10-08", "expire"],
  ] as const)("date de fin %s → %s", (dateFin, status) => {
    expect(expiryStatus(dateFin, today)).toBe(status);
  });

  it("date limite de surveillance : aujourd'hui + 30 jours", () => {
    expect(expiryWatchLimit(today)).toBe("2026-11-08");
  });
});
