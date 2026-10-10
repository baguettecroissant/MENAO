import "server-only";
import { roleFromAppMetadata, type Role } from "@menao/core";
import { cache } from "react";
import { avatarUrl } from "@/lib/chantier/storage";
import { createClient } from "@/lib/supabase/server";

export type ShellAccount = {
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  role: Role;
};

/**
 * Compte affiché dans la coque de l'application (ADR 0034) : nom, photo, rôle et messages non
 * lus. null sans compte connecté (les pages redirigent alors vers la connexion). Mis en cache pour
 * la durée de la requête.
 */
export const getShellAccount = cache(
  async (): Promise<{ account: ShellAccount; unreadMessages: number } | null> => {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getClaims();
    if (!auth || auth.claims.is_anonymous) return null;
    const [{ data: profile }, { data: unread }] = await Promise.all([
      supabase
        .from("profiles")
        .select("first_name, last_name, avatar_path")
        .eq("user_id", auth.claims.sub)
        .maybeSingle(),
      supabase.rpc("my_unread_messages"),
    ]);
    return {
      account: {
        firstName: profile?.first_name ?? null,
        lastName: profile?.last_name ?? null,
        avatarUrl: avatarUrl(supabase, profile?.avatar_path),
        role: roleFromAppMetadata(auth.claims.app_metadata),
      },
      unreadMessages: unread ?? 0,
    };
  },
);
