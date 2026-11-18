import { roleFromAppMetadata } from "@menao/core";
import { safeRedirectPath } from "@menao/validation";
import type { Route } from "next";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Renouvelle la session puis reprend la page demandée (ADR 0371) : après la validation du dossier,
 * le jeton garde « artisan_en_attente » jusqu'à une heure. Un gestionnaire de route peut écrire les
 * cookies de la nouvelle session, une page non. Si le rôle n'a pas changé, retour au dossier, sans
 * boucle.
 */
export async function GET(request: NextRequest) {
  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"), "/pro/tableau-de-bord");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.user) redirect("/connexion?next=/pro/tableau-de-bord");
  if (roleFromAppMetadata(data.user.app_metadata) === "artisan_en_attente") {
    redirect("/pro/onboarding");
  }
  redirect(next as Route);
}
