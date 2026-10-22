import { describe, expect, it } from "vitest";
import {
  FIRST_CHANTIER_COHORT_DAYS,
  FIRST_CHANTIER_DAYS,
  STARTER_MONTH_PAID_MONTHS,
  SUPPORT_ALERT_COOLDOWN_DAYS,
  SUPPORT_ALERT_DAYS,
  SUPPORT_ALERT_REQUESTS,
  firstChantierRate,
} from "../src/new-artisans";

describe("nouveaux artisans (ADR 0160)", () => {
  it("règles du document « Mettre en avant les nouveaux artisans »", () => {
    expect(SUPPORT_ALERT_REQUESTS).toBe(6);
    expect(SUPPORT_ALERT_DAYS).toBe(30);
    expect(SUPPORT_ALERT_COOLDOWN_DAYS).toBe(30);
    expect(STARTER_MONTH_PAID_MONTHS).toBe(2);
    expect(FIRST_CHANTIER_DAYS).toBe(60);
    expect(FIRST_CHANTIER_COHORT_DAYS).toBe(90);
  });

  it("premier chantier sous 60 jours : part arrondie de la cohorte, rien sans cohorte", () => {
    expect(firstChantierRate({ cohort: 0, withChantier: 0 })).toBeNull();
    expect(firstChantierRate({ cohort: 3, withChantier: 1 })).toBe(33);
    expect(firstChantierRate({ cohort: 8, withChantier: 6 })).toBe(75);
    expect(firstChantierRate({ cohort: 4, withChantier: 4 })).toBe(100);
  });
});
