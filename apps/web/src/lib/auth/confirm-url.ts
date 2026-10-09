import { env } from "@/env";

/**
 * Lien de confirmation d'inscription : le modèle d'e-mail MENAO ajoute le jeton à cette adresse
 * (`{{ .RedirectTo }}&token_hash=…`), qui doit donc toujours contenir `?next=`.
 */
export function confirmUrlFor(next: string): string {
  return `${env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=${encodeURIComponent(next)}`;
}
