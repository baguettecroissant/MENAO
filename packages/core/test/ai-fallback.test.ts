import { describe, expect, it } from "vitest";
import { openRouterModelName, shouldUseBackup } from "../src/ai-fallback";

describe("repli de l'IA sur OpenRouter (ADR 0304)", () => {
  it("rejoue quand Anthropic refuse sans que la requête soit en cause", () => {
    expect(
      shouldUseBackup({
        status: 400,
        message: "Your credit balance is too low to access the Anthropic API.",
      }),
    ).toBe(true);
    for (const status of [401, 402, 403, 429, 500, 503, 529]) {
      expect(shouldUseBackup({ status })).toBe(true);
    }
    expect(shouldUseBackup({ connection: true })).toBe(true);
  });

  it("ne rejoue pas une requête invalide ni un délai dépassé", () => {
    expect(shouldUseBackup({ status: 400, message: "messages: field required" })).toBe(false);
    for (const status of [404, 413, 422]) expect(shouldUseBackup({ status })).toBe(false);
    expect(shouldUseBackup({ timeout: true, connection: true })).toBe(false);
    expect(shouldUseBackup({})).toBe(false);
  });

  it("nom du modèle chez OpenRouter", () => {
    expect(openRouterModelName("claude-haiku-5-5")).toBe("anthropic/claude-haiku-5.5");
    expect(openRouterModelName("claude-sonnet-5-5")).toBe("anthropic/claude-sonnet-5.5");
    expect(openRouterModelName("claude-opus-5")).toBe("anthropic/claude-opus-5");
    expect(openRouterModelName("anthropic/claude-sonnet-5.5")).toBe("anthropic/claude-sonnet-5.5");
  });
});
