import { roleFromAppMetadata } from "@menao/core";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Compte connecté pour « Mon compte » (ADR 0039) : particulier ou artisan. Une session anonyme
 * (recherche en cours) n'a pas de compte ; l'équipe MENAO gère le sien depuis le back-office, et
 * l'export de ses données porterait sur toute la base (droits de lecture de l'équipe).
 */
export async function requireAccount(next = "/compte") {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous || !user.email) {
    redirect(`/connexion?next=${encodeURIComponent(next)}` as Route);
  }
  const role = roleFromAppMetadata(user.app_metadata);
  if (role === "admin" || role === "support") redirect("/admin");
  return { supabase, user, email: user.email, role };
}
