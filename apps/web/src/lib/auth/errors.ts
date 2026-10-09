import type { AuthError } from "@supabase/supabase-js";
import { fr } from "@/i18n/fr";

/** Traduit une erreur Supabase Auth en message affichable, sans révéler si un compte existe. */
export function authErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return fr.errors.invalidCredentials;
    case "email_not_confirmed":
      return fr.errors.emailNotConfirmed;
    case "weak_password":
      return fr.errors.weakPassword;
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return fr.errors.rateLimited;
    default:
      return fr.errors.generic;
  }
}
