import { supabase } from "./supabase";
import { documentRows, type DocumentRow } from "./document-rows";

export type MyDocuments = { status: string; rows: DocumentRow[] };

/** Documents de l'artisan connecté (ADR 0123), lus avec les droits du compte (RLS). */
export async function loadMyDocuments(): Promise<MyDocuments | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: artisan } = await supabase
    .from("artisans")
    .select(
      "status, decennale_non_soumis, artisan_documents(type, status, date_fin, refusal_reason, created_at)",
    )
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!artisan) return null;
  return {
    status: artisan.status,
    rows: documentRows(
      { status: artisan.status, decennaleExempt: artisan.decennale_non_soumis },
      artisan.artisan_documents,
    ),
  };
}
