import { describe, expect, it } from "vitest";
import { authErrorKind } from "../src/auth-errors";

describe("authErrorKind", () => {
  it("classe les erreurs de Supabase Auth sans révéler si un compte existe", () => {
    expect(authErrorKind("invalid_credentials")).toBe("invalidCredentials");
    expect(authErrorKind("email_not_confirmed")).toBe("emailNotConfirmed");
    expect(authErrorKind("weak_password")).toBe("weakPassword");
    expect(authErrorKind("over_request_rate_limit")).toBe("rateLimited");
    expect(authErrorKind("over_email_send_rate_limit")).toBe("rateLimited");
  });

  it("toute autre erreur reste générique", () => {
    expect(authErrorKind("user_already_exists")).toBe("generic");
    expect(authErrorKind(undefined)).toBe("generic");
  });
});
