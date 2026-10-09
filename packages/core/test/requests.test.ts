import { describe, expect, it } from "vitest";
import {
  MAX_ARTISANS_PER_REQUEST,
  REFUSAL_REASONS,
  REQUEST_RESPONSE_HOURS,
  remainingSlots,
  requestDeadline,
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
