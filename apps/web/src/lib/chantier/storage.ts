import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** URL signées (1 h) des fichiers d'un bucket privé, par chemin ; les droits de lecture s'appliquent. */
export async function signedUrlMap(
  supabase: Client,
  bucket: string,
  paths: readonly (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (unique.length === 0) return new Map();
  const { data } = await supabase.storage.from(bucket).createSignedUrls(unique, 3600);
  return new Map(
    (data ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])),
  );
}

/** Photo de profil (bucket public avatars). */
export function avatarUrl(supabase: Client, path: string | null | undefined): string | null {
  return path ? supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl : null;
}
