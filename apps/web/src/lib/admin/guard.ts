import "server-only";
import { homePathForRole, roleFromAppMetadata } from "@menao/core";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Accès au back-office : rôle admin (app_metadata). Avec `requireMfa`, exige en plus une
 * session de niveau aal2 ; sinon renvoie vers l'activation ou la vérification du TOTP.
 * La base applique la même règle (app.is_admin) : cette garde n'est qu'un confort d'interface.
 */
export async function requireAdmin({ requireMfa = true } = {}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data) redirect("/connexion?next=/admin");

  const role = roleFromAppMetadata(data.claims.app_metadata);
  if (role !== "admin") redirect(homePathForRole(role) as Route);

  const aal = (data.claims as { aal?: string }).aal;
  if (requireMfa && aal !== "aal2") {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verified = factors?.totp.some((f) => f.status === "verified");
    redirect(verified ? "/admin/mfa/verifier" : "/admin/mfa/activer");
  }
  return { supabase, userId: data.claims.sub, aal };
}
