import "server-only";
import { homePathForRole, roleFromAppMetadata } from "@menao/core";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Les trois accès du back-office (ADR 0286). */
export type TeamRole = "admin" | "support" | "verification";
export const TEAM_ROLES: readonly TeamRole[] = ["admin", "support", "verification"];

const isTeamRole = (role: string): role is TeamRole =>
  (TEAM_ROLES as readonly string[]).includes(role);

/**
 * Accès au back-office selon le rôle (ADR 0049, 0286) : chaque page dit quels accès l'ouvrent ; les
 * autres retrouvent leur rubrique d'accueil. Double authentification exigée pour tous : sans
 * session aal2, renvoi vers l'activation ou la vérification du TOTP.
 * La base applique ses propres règles (app.is_admin, app.is_staff, app.is_verifier) : ces gardes ne
 * sont qu'un confort d'interface.
 */
export async function requireTeam({
  roles = TEAM_ROLES,
  requireMfa = true,
}: { roles?: readonly TeamRole[]; requireMfa?: boolean } = {}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data) redirect("/connexion?next=/admin");

  const role = roleFromAppMetadata(data.claims.app_metadata);
  if (!isTeamRole(role)) redirect(homePathForRole(role) as Route);

  const aal = (data.claims as { aal?: string }).aal;
  if (requireMfa && aal !== "aal2") {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verified = factors?.totp.some((f) => f.status === "verified");
    redirect(verified ? "/admin/mfa/verifier" : "/admin/mfa/activer");
  }
  if (!roles.includes(role)) redirect(homePathForRole(role) as Route);
  return { supabase, userId: data.claims.sub, aal, role };
}

/** Admin et support : boîte de réception, et consultation des demandes, chantiers et comptes. */
export function requireStaff({ requireMfa = true } = {}) {
  return requireTeam({ roles: ["admin", "support"], requireMfa });
}

/** Admin et vérification : dossiers artisans et conformité (ADR 0286). */
export function requireVerifier({ requireMfa = true } = {}) {
  return requireTeam({ roles: ["admin", "verification"], requireMfa });
}

/** Pages réservées aux admins : les autres accès retrouvent leur rubrique. */
export function requireAdmin({ requireMfa = true } = {}) {
  return requireTeam({ roles: ["admin"], requireMfa });
}
