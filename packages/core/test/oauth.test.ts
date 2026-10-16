import { describe, expect, it } from "vitest";
import { enabledOAuthProviders, isOAuthProvider, signupPending } from "../src/oauth";

describe("connexion avec Google ou Apple (ADR 0108)", () => {
  it("fournisseurs activés par configuration, dans l'ordre d'affichage", () => {
    expect(enabledOAuthProviders(undefined)).toEqual([]);
    expect(enabledOAuthProviders("")).toEqual([]);
    expect(enabledOAuthProviders("apple, Google")).toEqual(["google", "apple"]);
    expect(enabledOAuthProviders("google,facebook,google")).toEqual(["google"]);
  });

  it("fournisseurs connus seulement", () => {
    expect(isOAuthProvider("google")).toBe(true);
    expect(isOAuthProvider("apple")).toBe(true);
    expect(isOAuthProvider("facebook")).toBe(false);
    expect(isOAuthProvider(null)).toBe(false);
  });

  it("inscription à finaliser seulement si la base a posé le marqueur", () => {
    expect(signupPending({ role: "particulier", signup_pending: true })).toBe(true);
    expect(signupPending({ role: "particulier" })).toBe(false);
    expect(signupPending({ signup_pending: "true" })).toBe(false);
    expect(signupPending(undefined)).toBe(false);
  });
});
