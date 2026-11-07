import { describe, expect, it } from "vitest";
import { parseClientReminders } from "../src/client-reminders";

describe("rappels aux clients par SMS (ADR 0239)", () => {
  it("droit, SMS du mois et réglages", () => {
    expect(
      parseClientReminders({
        inclus: true,
        sms_inclus: 100,
        sms_utilises: 12,
        rdv: false,
        avis: true,
      }),
    ).toEqual({
      included: true,
      smsIncluded: 100,
      smsUsed: 12,
      enabled: { rdv: false, demarrage: true, acompte: false, avis: true },
    });
  });

  it("réponse absente : rien d'inclus, réglages par défaut", () => {
    expect(parseClientReminders(null)).toEqual({
      included: false,
      smsIncluded: 0,
      smsUsed: 0,
      enabled: { rdv: true, demarrage: true, acompte: false, avis: false },
    });
  });
});
