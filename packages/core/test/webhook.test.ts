import { describe, expect, it } from "vitest";
import { webhookErrorCode } from "../src/webhook";

describe("webhookErrorCode (ADR 0051)", () => {
  it("garde le code SQL d'une erreur PostgREST, pas son message", () => {
    expect(
      webhookErrorCode({
        message: "duplicate key value violates unique constraint",
        details: "Key (email)=(camille@example.test) already exists.",
        hint: null,
        code: "23505",
      }),
    ).toBe("23505");
  });

  it("garde le type et le code d'une erreur Stripe", () => {
    const error = Object.assign(new Error("No such customer: cus_123"), {
      name: "StripeInvalidRequestError",
      type: "StripeInvalidRequestError",
      code: "resource_missing",
    });
    expect(webhookErrorCode(error)).toBe("StripeInvalidRequestError resource_missing");
  });

  it("garde le nom d'une erreur JavaScript", () => {
    expect(webhookErrorCode(new TypeError("x is undefined"))).toBe("TypeError");
    expect(webhookErrorCode({ code: 500 })).toBe("500");
  });

  it("écarte tout ce qui ne ressemble pas à un code", () => {
    expect(webhookErrorCode({ name: "Error", code: "camille@example.test" })).toBe("Error");
    expect(webhookErrorCode({ code: "deux mots" })).toBe("Erreur");
    expect(webhookErrorCode("échec")).toBe("Erreur");
    expect(webhookErrorCode(null)).toBe("Erreur");
  });
});
