import { useEffect, useState } from "react";
import { publicUrl } from "./project";
import { useSession } from "./session";
import { supabase } from "./supabase";

export type ProfileSummary = { firstName: string | null; avatarUrl: string | null };

/** Prénom et photo du compte connecté, lus une fois puis gardés pour tous les en-têtes. */
let cache: { userId: string; summary: ProfileSummary } | null = null;

async function loadSummary(userId: string): Promise<ProfileSummary> {
  const { data } = await supabase
    .from("profiles")
    .select("first_name, avatar_path")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    firstName: data?.first_name ?? null,
    avatarUrl: data?.avatar_path ? publicUrl("avatars", data.avatar_path) : null,
  };
}

/**
 * Prénom et photo de l'en-tête des onglets (avatar, maquettes) ; null sans compte connecté ou
 * pendant le premier chargement. Lecture avec les droits du compte (RLS).
 */
export function useProfileSummary(): ProfileSummary | null {
  const { session, signedIn } = useSession();
  const userId = signedIn ? (session?.user.id ?? null) : null;
  const [loaded, setLoaded] = useState(cache);
  useEffect(() => {
    if (!userId || cache?.userId === userId) return;
    let active = true;
    loadSummary(userId).then((summary) => {
      cache = { userId, summary };
      if (active) setLoaded(cache);
    });
    return () => {
      active = false;
    };
  }, [userId]);
  const current = loaded?.userId === userId ? loaded : cache?.userId === userId ? cache : null;
  return current?.summary ?? null;
}

/** À appeler après un changement du prénom : les en-têtes le relisent. */
export function forgetProfileSummary(): void {
  cache = null;
}
