/**
 * Erreurs de Supabase Auth regroupées en quelques cas affichables (site et application). Aucune
 * ne révèle si un compte existe pour une adresse donnée.
 */
export type AuthErrorKind =
  "invalidCredentials" | "emailNotConfirmed" | "weakPassword" | "rateLimited" | "generic";

export function authErrorKind(code: string | undefined): AuthErrorKind {
  switch (code) {
    case "invalid_credentials":
      return "invalidCredentials";
    case "email_not_confirmed":
      return "emailNotConfirmed";
    case "weak_password":
      return "weakPassword";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "rateLimited";
    default:
      return "generic";
  }
}
