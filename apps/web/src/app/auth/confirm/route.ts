import type { EmailOtpType } from "@supabase/supabase-js";
import { safeRedirectPath } from "@menao/validation";
import type { Route } from "next";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: readonly EmailOtpType[] = ["email", "signup", "magiclink", "recovery"];

/**
 * Lien reçu par e-mail (confirmation d'inscription, lien magique, réinitialisation du mot de passe) :
 * vérifie le jeton et ouvre la session.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next =
    type === "recovery" ? "/nouveau-mot-de-passe" : safeRedirectPath(searchParams.get("next"));

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(next as Route);
  }

  redirect("/connexion?erreur=lien-invalide");
}
