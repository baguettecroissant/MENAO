import { describe, expect, it } from "vitest";
import { sessionFromCallbackUrl } from "./oauth-url";

describe("retour de Google ou Apple dans l'application (ADR 0108)", () => {
  it("jetons dans le fragment", () => {
    expect(
      sessionFromCallbackUrl(
        "menao://auth/callback#access_token=a.b.c&refresh_token=r1&expires_in=3600",
      ),
    ).toEqual({ ok: true, tokens: { access_token: "a.b.c", refresh_token: "r1" } });
  });

  it("adresse d'Expo Go et paramètres dans la requête", () => {
    expect(
      sessionFromCallbackUrl(
        "exp://192.168.1.2:8081/--/auth/callback?access_token=t&refresh_token=r",
      ),
    ).toEqual({ ok: true, tokens: { access_token: "t", refresh_token: "r" } });
  });

  it("refus de l'utilisateur ou erreur", () => {
    expect(sessionFromCallbackUrl("menao://auth/callback?error=access_denied")).toEqual({
      ok: false,
      cancelled: true,
    });
    expect(sessionFromCallbackUrl("menao://auth/callback#error=server_error")).toEqual({
      ok: false,
      cancelled: false,
    });
    expect(sessionFromCallbackUrl("menao://auth/callback")).toEqual({
      ok: false,
      cancelled: false,
    });
  });
});
