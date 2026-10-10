import { describe, expect, it } from "vitest";
import { CHANTIER_TRANSITIONS } from "../src/chantier-state";
import {
  RESERVES_ESCALATION_DAYS,
  RESERVES_LIMITS,
  RESERVES_REMINDER_DAYS,
  canLiftReserves,
  canStartReception,
  receptionNumber,
} from "../src/reception";

describe("réception des travaux (F-25, F-26)", () => {
  it("réception ouverte une fois la fin des travaux déclarée", () => {
    expect(canStartReception("travaux_termines")).toBe(true);
    expect(canStartReception("en_cours")).toBe(false);
    expect(canStartReception("reserves_a_lever")).toBe(false);
  });

  it("PV sans réserves : réceptionné ; avec réserves : réserves à lever (spec §9)", () => {
    expect(CHANTIER_TRANSITIONS).toContainEqual([
      "travaux_termines",
      "pv_sans_reserves",
      "receptionne",
    ]);
    expect(CHANTIER_TRANSITIONS).toContainEqual([
      "travaux_termines",
      "pv_avec_reserves",
      "reserves_a_lever",
    ]);
  });

  it("numéro PV-AAAA-R01, par artisan et par année", () => {
    expect(receptionNumber(2026, 1)).toBe("PV-2026-R01");
    expect(receptionNumber(2026, 12)).toBe("PV-2026-R12");
    expect(receptionNumber(2027, 104)).toBe("PV-2027-R104");
  });

  it("réserves : 10 à 2 000 caractères", () => {
    expect(RESERVES_LIMITS).toEqual({ min: 10, max: 2000 });
  });

  it("levée des réserves : pendant les réserves à lever, relance à J+7, ticket à J+30", () => {
    expect(canLiftReserves("reserves_a_lever")).toBe(true);
    expect(canLiftReserves("receptionne")).toBe(false);
    expect([RESERVES_REMINDER_DAYS, RESERVES_ESCALATION_DAYS]).toEqual([7, 30]);
    expect(CHANTIER_TRANSITIONS).toContainEqual([
      "reserves_a_lever",
      "reserves_levees",
      "receptionne",
    ]);
  });
});
