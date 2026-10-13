import { authErrorKind } from "@menao/core";
import type { AuthError } from "@supabase/supabase-js";
import { fr } from "@/i18n/fr";

/** Traduit une erreur Supabase Auth en message affichable, sans révéler si un compte existe. */
export function authErrorMessage(error: AuthError): string {
  return fr.errors[authErrorKind(error.code)];
}
