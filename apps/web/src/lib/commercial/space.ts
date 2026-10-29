import "server-only";
import { homePathForRole, roleFromAppMetadata } from "@menao/core";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import { avatarUrl } from "@/lib/chantier/storage";
import type { ShellAccount } from "@/lib/client/shell";
import { createClient } from "@/lib/supabase/server";

/**
 * Espace commercial (F-65, ADR 0205) : réservé au rôle « commercial » (les autres rôles retournent
 * à leur accueil). Fiche du commercial (code, statut) et compte affiché dans la coque. Mis en cache
 * pour la durée de la requête.
 */
export const getCommercialSpace = cache(async (next = "/commercial") => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) {
    redirect(`/connexion?next=${encodeURIComponent(next)}` as Route);
  }
  const role = roleFromAppMetadata(auth.claims.app_metadata);
  if (role !== "commercial") redirect(homePathForRole(role) as Route);
  const userId = auth.claims.sub;
  const [{ data: commercial }, { data: profile }] = await Promise.all([
    supabase.from("commercials").select("code, nom, status").eq("user_id", userId).maybeSingle(),
    supabase
      .from("profiles")
      .select("first_name, last_name, phone, avatar_path")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  const account: ShellAccount = {
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    avatarUrl: avatarUrl(supabase, profile?.avatar_path),
    role,
  };
  return {
    supabase,
    email: typeof auth.claims.email === "string" ? auth.claims.email : null,
    phone: profile?.phone ?? null,
    account,
    /** Code utilisable seulement si le commercial est actif. */
    commercial: commercial ?? null,
    active: commercial?.status === "actif",
  };
});
