import { useEffect, useState } from "react";
import { publicUrl } from "./project";
import { useSession } from "./session";
import { supabase } from "./supabase";

export type ProfileSummary = {
  /** Initiales du prénom et du nom (« NS » des maquettes), quand il n'y a pas de photo. */
  initials: string | null;
  avatarUrl: string | null;
};

const initialsOf = (...names: (string | null | undefined)[]) =>
  names.map((name) => name?.trim().charAt(0).toUpperCase() ?? "").join("") || null;

/** Initiales et photo du compte connecté, lues une fois puis gardées pour tous les en-têtes. */
let cache: { userId: string; summary: ProfileSummary } | null = null;

async function loadSummary(userId: string): Promise<ProfileSummary> {
  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_name, avatar_path")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    initials: initialsOf(data?.first_name, data?.last_name),
    avatarUrl: data?.avatar_path ? publicUrl("avatars", data.avatar_path) : null,
  };
}

/**
 * Initiales et photo de l'en-tête des onglets (avatar, maquettes) ; null sans compte connecté ou
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

/** À appeler après un changement du prénom ou du nom : les en-têtes les relisent. */
export function forgetProfileSummary(): void {
  cache = null;
}
