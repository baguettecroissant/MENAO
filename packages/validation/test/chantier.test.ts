import { describe, expect, it } from "vitest";
import {
  appointmentNotesSchema,
  appointmentSchema,
  cancelChantierSchema,
  expertiseSchema,
} from "../src/chantier";
import { messages } from "../src/messages";

describe("rendez-vous (F-17, F-18)", () => {
  it("date AAAA-MM-JJ et heure HH:MM", () => {
    expect(appointmentSchema.safeParse({ date: "2026-02-20", time: "16:30" }).success).toBe(true);
    const bad = appointmentSchema.safeParse({ date: "20/02/2026", time: "16h30" });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues.map((i) => i.message)).toEqual([
      messages.appointmentDate,
      messages.appointmentTime,
    ]);
    expect(appointmentSchema.safeParse({ date: "", time: "" }).success).toBe(false);
    expect(appointmentSchema.safeParse({ date: "2026-02-20", time: "24:00" }).success).toBe(false);
  });
});

describe("annulation, notes, expertise (F-17, F-18)", () => {
  it("motif d'annulation facultatif, 500 caractères au plus", () => {
    expect(cancelChantierSchema.parse({ reason: "  Client injoignable  " })).toEqual({
      reason: "Client injoignable",
    });
    expect(cancelChantierSchema.parse({ reason: "" })).toEqual({ reason: "" });
    expect(cancelChantierSchema.safeParse({ reason: "x".repeat(501) }).success).toBe(false);
  });

  it("notes privées : 5 000 caractères au plus", () => {
    expect(appointmentNotesSchema.safeParse({ notes: "" }).success).toBe(true);
    expect(appointmentNotesSchema.safeParse({ notes: "x".repeat(5001) }).success).toBe(false);
  });

  it("expertise : corps de métier obligatoire, message facultatif", () => {
    expect(expertiseSchema.parse({ trade: "plombier", message: " Évacuation " })).toEqual({
      trade: "plombier",
      message: "Évacuation",
    });
    const bad = expertiseSchema.safeParse({ trade: "", message: "" });
    expect(bad.error?.issues[0]?.message).toBe(messages.expertiseTradeRequired);
  });
});
