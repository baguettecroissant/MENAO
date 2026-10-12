import "server-only";
import { homePathForRole, roleFromAppMetadata } from "@menao/core";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Accès au back-office pour l'équipe : admin, ou support pour les pages qui lui sont ouvertes
 * (tickets, modération, litiges ; ADR 0049). Double authentification exigée pour les deux : sans
 * session aal2, renvoi vers l'activation ou la vérification du TOTP.
 * La base applique ses propres règles (app.is_admin, app.is_staff) : ces gardes ne sont qu'un
 * confort d'interface.
 */
export async function requireStaff({ requireMfa = true } = {}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data) redirect("/connexion?next=/admin");

  const role = roleFromAppMetadata(data.claims.app_metadata);
  if (role !== "admin" && role !== "support") redirect(homePathForRole(role) as Route);

  const aal = (data.claims as { aal?: string }).aal;
  if (requireMfa && aal !== "aal2") {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verified = factors?.totp.some((f) => f.status === "verified");
    redirect(verified ? "/admin/mfa/verifier" : "/admin/mfa/activer");
  }
  return { supabase, userId: data.claims.sub, aal, role };
}

/** Pages réservées aux admins : le support retrouve sa boîte de réception. */
export async function requireAdmin({ requireMfa = true } = {}) {
  const staff = await requireStaff({ requireMfa });
  if (staff.role !== "admin") redirect(homePathForRole(staff.role) as Route);
  return staff;
}
