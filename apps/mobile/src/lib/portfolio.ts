import { publicUrl } from "./project";
import { supabase } from "./supabase";

/** Photo de réalisation de la fiche publique (ADR 0124), comme sur le site. */
export type PortfolioPhoto = { id: string; path: string; url: string };

export async function loadPortfolio(): Promise<PortfolioPhoto[] | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: artisan } = await supabase
    .from("artisans")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!artisan) return null;
  const { data, error } = await supabase
    .from("artisan_photos")
    .select("id, storage_path")
    .eq("artisan_id", artisan.id)
    .order("sort_order")
    .order("created_at");
  if (error) return null;
  return (data ?? []).map((p) => ({
    id: p.id,
    path: p.storage_path,
    url: publicUrl("portfolio", p.storage_path),
  }));
}

/** Retire une photo : fichier puis ligne, avec les droits du compte (comme le site). */
export async function deletePortfolioPhoto(photo: PortfolioPhoto): Promise<boolean> {
  await supabase.storage.from("portfolio").remove([photo.path]);
  const { error } = await supabase.from("artisan_photos").delete().eq("id", photo.id);
  return !error;
}
