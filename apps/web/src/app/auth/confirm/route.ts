import type { EmailOtpType } from "@supabase/supabase-js";
import {
  homePathForRole,
  isArtisanFinalizePath,
  roleFromAppMetadata,
  signupPending,
} from "@menao/core";
import { safeRedirectPath } from "@menao/validation";
import type { Route } from "next";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: readonly EmailOtpType[] = [
  "email",
  "signup",
  "magiclink",
  "recovery",
  "email_change",
  // Invitation d'un commercial par un admin (ADR 0205) : il choisit ensuite son mot de passe.
  "invite",
];

/**
 * Lien reçu par e-mail (confirmation d'inscription, lien magique, réinitialisation du mot de passe,
 * changement d'adresse e-mail depuis « Mon compte ») : vérifie le jeton et ouvre la session.
 * - `token_hash` : modèles d'e-mails MENAO (supabase/templates), fonctionne sur tout appareil ;
 * - `code` : modèles par défaut de Supabase (flux PKCE), même navigateur uniquement. Utilisé tant
 *   que les modèles ne peuvent pas être personnalisés (offre gratuite sans SMTP dédié).
 * C'est aussi le retour de la connexion avec Google ou Apple (`code`, ADR 0108) : un nouveau
 * compte passe d'abord par « Finaliser mon compte ». Sans `next`, accueil du rôle.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  const next =
    type === "recovery" || type === "invite"
      ? "/nouveau-mot-de-passe"
      : safeRedirectPath(nextParam);

  const code = searchParams.get("code");

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(next as Route);
  } else if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const target = nextParam
        ? next
        : homePathForRole(roleFromAppMetadata(data.user.app_metadata));
      // Compte à finaliser : « Finaliser mon compte », sauf depuis l'inscription artisan
      // (ADR 0110), qui a sa propre finalisation.
      if (signupPending(data.user.app_metadata) && !isArtisanFinalizePath(target)) {
        redirect(`/finaliser-compte?next=${encodeURIComponent(target)}` as Route);
      }
      redirect(target as Route);
    }
  } else if (searchParams.has("error")) {
    // Connexion avec Google ou Apple refusée ou annulée : retour à la connexion.
    redirect("/connexion?erreur=oauth");
  }

  redirect("/connexion?erreur=lien-invalide");
}
