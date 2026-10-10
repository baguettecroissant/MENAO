import { describe, expect, it } from "vitest";
import {
  appointmentNotesSchema,
  appointmentSchema,
  cancelChantierSchema,
  chantierMessageSchema,
  chantierStartSchema,
  expertiseSchema,
  receptionConsentsSchema,
  reservesSchema,
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

describe("suivi du chantier (F-22)", () => {
  it("date et heure de démarrage : AAAA-MM-JJ et HH:MM", () => {
    expect(chantierStartSchema.safeParse({ date: "2026-10-22", time: "08:00" }).success).toBe(true);
    const bad = chantierStartSchema.safeParse({ date: "22/10/2026", time: "8h" });
    expect(bad.error?.issues.map((i) => i.message)).toEqual([
      messages.chantierStartDate,
      messages.chantierStartTime,
    ]);
  });

  it("message du journal : obligatoire, 2 000 caractères au plus, espaces retirés", () => {
    expect(chantierMessageSchema.parse({ message: "  Matériel livré.  " })).toEqual({
      message: "Matériel livré.",
    });
    expect(chantierMessageSchema.safeParse({ message: "   " }).error?.issues[0]?.message).toBe(
      messages.chantierMessageRequired,
    );
    expect(chantierMessageSchema.safeParse({ message: "x".repeat(2000) }).success).toBe(true);
    expect(
      chantierMessageSchema.safeParse({ message: "x".repeat(2001) }).error?.issues[0]?.message,
    ).toBe(messages.chantierMessageTooLong);
  });
});

describe("réception avec réserves (F-26)", () => {
  it("réserves : 10 à 2 000 caractères, espaces retirés", () => {
    expect(reservesSchema.parse({ reserves: "  Plinthe à repeindre.  " })).toEqual({
      reserves: "Plinthe à repeindre.",
    });
    expect(reservesSchema.safeParse({ reserves: "Court" }).error?.issues[0]?.message).toBe(
      messages.reservesTooShort,
    );
    expect(reservesSchema.safeParse({ reserves: "x".repeat(2001) }).error?.issues[0]?.message).toBe(
      messages.reservesTooLong,
    );
  });

  it("cases du PV : toutes obligatoires, message propre au PV", () => {
    const all = { document: true, cgu_prestataire: true, cgu_menao: true, echeancier: true };
    expect(receptionConsentsSchema.safeParse(all).success).toBe(true);
    const missing = receptionConsentsSchema.safeParse({ ...all, echeancier: false });
    expect(missing.error?.issues[0]?.message).toBe(messages.receptionConsentRequired);
  });
});
