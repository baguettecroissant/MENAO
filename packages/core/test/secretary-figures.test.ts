import { describe, expect, it } from "vitest";
import { secretaryFigures } from "../src";

describe("secretaryFigures", () => {
  const now = new Date("2026-11-08T10:00:00Z");
  it("à traiter, urgents, appels et rendez-vous du mois à Paris", () => {
    expect(
      secretaryFigures(
        [{ urgent: true }, { urgent: false }, { urgent: false }],
        [
          { kind: "rendez_vous", created_at: "2026-11-08T06:48:00Z" },
          { kind: "message", created_at: "2026-11-07T17:20:00Z" },
          // 31 octobre à 23 h 30 UTC = 1er novembre à Paris.
          { kind: "rendez_vous", created_at: "2026-10-31T23:30:00Z" },
          // Octobre : hors du mois.
          { kind: "rendez_vous", created_at: "2026-10-30T09:00:00Z" },
        ],
        now,
      ),
    ).toEqual({ toHandle: 3, urgent: 1, monthCalls: 3, monthAppointments: 2 });
  });
});
