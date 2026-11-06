import { describe, expect, it } from "vitest";
import {
  nextArtisanSlots,
  secretaryHoursText,
  signVoiceSession,
  verifyVoiceSession,
} from "../src/voice-assistant";

describe("secrétaire dédiée de l'artisan (ADR 0232)", () => {
  const artisan = "11111111-1111-4111-8111-111111111111";
  const now = new Date("2026-11-06T09:00:00Z");

  it("jeton d'appel : signé, lié à l'artisan, limité dans le temps", async () => {
    const token = await signVoiceSession("secret-test", artisan, now.getTime() + 3_600_000);
    expect(await verifyVoiceSession("secret-test", token, now)).toBe(artisan);
    expect(await verifyVoiceSession("autre-secret", token, now)).toBeNull();
    expect(
      await verifyVoiceSession("secret-test", token, new Date(now.getTime() + 7_200_000)),
    ).toBeNull();
    const [, exp, sig] = token.split(".");
    const forged = `22222222-2222-4222-8222-222222222222.${exp}.${sig}`;
    expect(await verifyVoiceSession("secret-test", forged, now)).toBeNull();
    expect(await verifyVoiceSession("secret-test", "n'importe quoi", now)).toBeNull();
    expect(await verifyVoiceSession("secret-test", undefined, now)).toBeNull();
  });

  it("horaires lus par la secrétaire, par jour", () => {
    expect(
      secretaryHoursText([
        { jour: 2, debut: "08:00", fin: "12:00" },
        { jour: 1, debut: "13:30", fin: "17:30" },
        { jour: 1, debut: "08:00", fin: "12:00" },
      ]),
    ).toBe("lundi de 08:00 à 12:00 et de 13:30 à 17:30 ; mardi de 08:00 à 12:00");
    expect(secretaryHoursText([])).toBe("");
    expect(secretaryHoursText("pas un tableau")).toBe("");
  });

  it("créneaux libres : horaires de l'artisan, hors absences et moments occupés, deux heures d'avance", () => {
    // Vendredi 6 novembre, 10 h à Paris.
    const slots = nextArtisanSlots({
      hours: [
        { weekday: 5, start: "08:00", end: "12:00" },
        { weekday: 5, start: "14:00", end: "18:00" },
        { weekday: 1, start: "09:00", end: "12:00" },
      ],
      absences: [],
      busy: [{ start: new Date("2026-11-06T13:00:00Z"), end: new Date("2026-11-06T14:30:00Z") }],
      now,
      durationMinutes: 60,
    });
    expect(slots.map((s) => s.toISOString())).toEqual([
      "2026-11-06T14:30:00.000Z", // vendredi 15 h 30, après le moment occupé
      "2026-11-09T08:00:00.000Z", // lundi 9 h
      "2026-11-13T07:00:00.000Z", // vendredi suivant, 8 h
    ]);
  });

  it("absence : aucun créneau ces jours-là ; sans horaires : rien", () => {
    const slots = nextArtisanSlots({
      hours: [{ weekday: 1, start: "09:00", end: "12:00" }],
      absences: [{ startsOn: "2026-11-09", endsOn: "2026-11-09" }],
      busy: [],
      now,
      durationMinutes: 60,
      count: 1,
    });
    expect(slots.map((s) => s.toISOString())).toEqual(["2026-11-16T08:00:00.000Z"]);
    expect(
      nextArtisanSlots({ hours: [], absences: [], busy: [], now, durationMinutes: 60 }),
    ).toEqual([]);
  });
});
