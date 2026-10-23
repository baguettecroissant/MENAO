import { describe, expect, it } from "vitest";
import { messages } from "../src/messages";
import {
  artisanSelectionSchema,
  clientCancelSchema,
  encodeLotSelection,
  lotSelectionSchema,
  refusalSchema,
  requestFormSchema,
} from "../src/request";

const a = "b0000000-0000-4000-8000-000000000011";
const b = "b0000000-0000-4000-8000-000000000012";

describe("demande de chantier (F-11)", () => {
  it("1 à 3 artisans distincts", () => {
    expect(artisanSelectionSchema.parse([a, b, a])).toEqual([a, b]);
    expect(artisanSelectionSchema.safeParse([]).success).toBe(false);
    expect(
      artisanSelectionSchema.safeParse([
        a,
        b,
        "b0000000-0000-4000-8000-000000000013",
        "b0000000-0000-4000-8000-000000000014",
      ]).success,
    ).toBe(false);
  });

  it("un seul envoi pour plusieurs métiers : artisans regroupés par lot (ADR 0170)", () => {
    const lot1 = "c0000000-0000-4000-8000-000000000001";
    const lot2 = "c0000000-0000-4000-8000-000000000002";
    const lots = lotSelectionSchema.parse([
      `${lot1}.${a}`,
      `${lot2}.${b}`,
      `${lot1}.${b}`,
      `${lot1}.${a}`,
    ]);
    expect(lots).toEqual([
      { projectId: lot1, artisanIds: [a, b] },
      { projectId: lot2, artisanIds: [b] },
    ]);
    expect(lotSelectionSchema.parse(encodeLotSelection(lots))).toEqual(lots);
    expect(lotSelectionSchema.parse([])).toEqual([]);
    expect(lotSelectionSchema.safeParse([a]).success).toBe(false);
    expect(lotSelectionSchema.safeParse([`${lot1}.pas-un-artisan`]).success).toBe(false);
    const four = [1, 2, 3, 4].map((n) => `${lot1}.b0000000-0000-4000-8000-00000000002${n}`);
    expect(lotSelectionSchema.safeParse(four).success).toBe(false);
    const fiveLots = [1, 2, 3, 4, 5].map((n) => `c0000000-0000-4000-8000-00000000000${n}.${a}`);
    expect(lotSelectionSchema.safeParse(fiveLots).success).toBe(false);
  });

  it("préférence de rappel : plage horaire cohérente", () => {
    const base = { message: "", phone: "06 00 00 00 00", callbackMode: "plage" };
    expect(
      requestFormSchema.safeParse({ ...base, callbackFrom: "09:00", callbackTo: "12:00" }).success,
    ).toBe(true);
    expect(
      requestFormSchema.safeParse({ ...base, callbackFrom: "12:00", callbackTo: "09:00" }).success,
    ).toBe(false);
    expect(requestFormSchema.safeParse({ ...base, callbackFrom: "", callbackTo: "" }).success).toBe(
      false,
    );
    const asap = requestFormSchema.parse({
      ...base,
      callbackMode: "des_que_possible",
      callbackFrom: "09:00",
    });
    expect(asap.callbackFrom).toBeNull();
    expect(asap.phone).toBe("+33600000000");
  });

  it("message de 10 000 caractères au plus", () => {
    expect(
      requestFormSchema.safeParse({
        message: "x".repeat(10_001),
        phone: "",
        callbackMode: "des_que_possible",
      }).success,
    ).toBe(false);
  });

  it("refus : motif obligatoire, précision obligatoire pour « autre »", () => {
    expect(refusalSchema.safeParse({ reason: "hors_zone", detail: "" }).success).toBe(true);
    expect(refusalSchema.safeParse({ reason: "autre", detail: "" }).success).toBe(false);
    expect(refusalSchema.safeParse({ reason: "", detail: "x" }).success).toBe(false);
  });
});

describe("annulation par le client (F-11, F-12)", () => {
  it("motif de la liste obligatoire, commentaire facultatif et limité", () => {
    expect(
      clientCancelSchema.parse({ reason: "autre_artisan", comment: "  Trouvé plus près. " }),
    ).toEqual({
      reason: "autre_artisan",
      comment: "Trouvé plus près.",
    });
    expect(clientCancelSchema.parse({ reason: "plus_besoin", comment: " " })).toEqual({
      reason: "plus_besoin",
      comment: undefined,
    });
    const missing = clientCancelSchema.safeParse({ reason: "", comment: "" });
    expect(missing.error?.issues[0]?.message).toBe(messages.cancelReasonRequired);
    expect(
      clientCancelSchema.safeParse({ reason: "autre", comment: "a".repeat(501) }).success,
    ).toBe(false);
  });
});
