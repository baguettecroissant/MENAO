import { describe, expect, it } from "vitest";
import { messages } from "../src/messages";
import { receptionClosuresSchema } from "../src/reception";

describe("fermetures de l'accueil (ADR 0230)", () => {
  it("dates françaises ou ISO, une par ligne ou séparées par des virgules, triées sans doublon", () => {
    const parsed = receptionClosuresSchema.safeParse({
      fermetures: "24/12/2026\n2026-12-31, 2/1/2027\n24/12/2026",
      feries: true,
    });
    expect(parsed.success && parsed.data).toEqual({
      closedDates: ["2026-12-24", "2026-12-31", "2027-01-02"],
      holidaysClosed: true,
    });
  });

  it("aucune date : liste vide", () => {
    const parsed = receptionClosuresSchema.safeParse({ fermetures: "  \n ", feries: false });
    expect(parsed.success && parsed.data).toEqual({ closedDates: [], holidaysClosed: false });
  });

  it("date impossible, mal écrite ou hors de 2020 à 2040 : refusée avec la valeur en cause", () => {
    for (const value of ["31/02/2026", "demain", "01/01/2019"]) {
      const parsed = receptionClosuresSchema.safeParse({ fermetures: value, feries: true });
      expect(parsed.success).toBe(false);
      expect(parsed.error?.issues[0]?.message).toBe(messages.receptionDateInvalid(value));
    }
  });

  it("plus de cent dates : refusé", () => {
    const many = Array.from({ length: 101 }, (_, i) =>
      new Date(Date.UTC(2027, 0, 1 + i)).toISOString().slice(0, 10),
    ).join("\n");
    const parsed = receptionClosuresSchema.safeParse({ fermetures: many, feries: true });
    expect(parsed.error?.issues[0]?.message).toBe(messages.receptionTooManyDates);
  });
});
