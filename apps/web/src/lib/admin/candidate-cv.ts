import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Lien temporaire (10 minutes) vers le CV d'un candidat, pour un administrateur (ADR 0382). */
export async function candidateCvUrl(
  supabase: Client,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("candidate-cvs").createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

/**
 * Vide la file des CV à effacer (candidatures supprimées : purge des 2 ans, ADR 0382) : la base ne
 * supprime pas les fichiers elle-même ; le back-office le fait à chaque ouverture de la liste des
 * candidats, 50 au plus, puis les retire de la file. Sans effet si la file est vide.
 */
export async function purgeDeletedCandidateCvs(supabase: Client): Promise<void> {
  const { data } = await supabase.from("candidate_cv_deletions").select("cv_path").limit(50);
  const paths = (data ?? []).map((row) => row.cv_path);
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from("candidate-cvs").remove(paths);
  if (error) return;
  await supabase.rpc("admin_cv_deletions_done", { p_paths: paths });
}
