import type { createClient } from "@/lib/supabase/server";

/**
 * URL signée du logo de l'entreprise en tête d'un document (ADR 0038). Le bucket artisan-logos
 * décide de l'accès : l'artisan, les particuliers dont un document envoyé porte ce logo, l'équipe.
 */
export async function documentLogoUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("artisan-logos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
