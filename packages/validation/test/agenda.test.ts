import { describe, expect, it } from "vitest";
import { absenceSchema, availableFromSchema, blockedSlotSchema, hoursSchema } from "../src/agenda";
import { messages } from "../src/messages";

describe("agenda et disponibilités (F-44)", () => {
  it("horaires : jour de 1 à 7, heures HH:MM, 21 plages au plus", () => {
    expect(hoursSchema.safeParse([{ weekday: 1, start: "08:00", end: "12:00" }]).success).toBe(
      true,
    );
    expect(hoursSchema.safeParse([]).success).toBe(true);
    expect(hoursSchema.safeParse([{ weekday: 0, start: "08:00", end: "12:00" }]).success).toBe(
      false,
    );
    expect(hoursSchema.safeParse([{ weekday: 1, start: "8h", end: "12:00" }]).success).toBe(false);
    const tooMany = Array.from({ length: 22 }, () => ({
      weekday: 1,
      start: "08:00",
      end: "09:00",
    }));
    expect(hoursSchema.safeParse(tooMany).success).toBe(false);
  });

  it("absence : dates AAAA-MM-JJ, motif nettoyé et limité à 80 caractères", () => {
    expect(
      absenceSchema.parse({ startsOn: "2026-10-20", endsOn: "2026-10-24", label: "  Congés " }),
    ).toEqual({ startsOn: "2026-10-20", endsOn: "2026-10-24", label: "Congés" });
    const bad = absenceSchema.safeParse({
      startsOn: "",
      endsOn: "24/10/2026",
      label: "x".repeat(81),
    });
    expect(bad.error?.issues.map((i) => i.message)).toEqual([
      messages.absenceStartRequired,
      messages.absenceEndRequired,
      messages.agendaLabelTooLong,
    ]);
  });

  it("créneau bloqué : date et heures valides", () => {
    expect(
      blockedSlotSchema.safeParse({ date: "2026-10-13", start: "14:00", end: "16:00", label: "" })
        .success,
    ).toBe(true);
    expect(
      blockedSlotSchema.safeParse({ date: "2026-10-13", start: "14:00", end: "24:00", label: "" })
        .success,
    ).toBe(false);
  });

  it("date de disponibilité : vide (dès maintenant) ou AAAA-MM-JJ", () => {
    expect(availableFromSchema.safeParse("").success).toBe(true);
    expect(availableFromSchema.safeParse("2026-11-02").success).toBe(true);
    expect(availableFromSchema.safeParse("02/11/2026").success).toBe(false);
  });
});
