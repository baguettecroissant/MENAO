import { describe, expect, it } from "vitest";
import { artisanSelectionSchema, refusalSchema, requestFormSchema } from "../src/request";

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
