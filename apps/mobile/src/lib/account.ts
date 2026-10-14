import { supabase } from "./supabase";

/**
 * Demande de suppression du compte en cours (ticket « suppression_compte » non résolu), comme sur
 * le site : sa date, ou null. Lecture avec les droits du compte (RLS).
 */
export async function loadDeletionRequest(): Promise<string | null> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return null;
  const { data } = await supabase
    .from("tickets")
    .select("created_at")
    .eq("user_id", userId)
    .eq("type", "suppression_compte")
    .neq("status", "resolu")
    .maybeSingle();
  return data?.created_at ?? null;
}

/**
 * Demande de suppression du compte (Apple 5.1.1 v, RGPD), comme sur le site : ticket pour
 * l'équipe MENAO, réponse sous un mois (`request_account_deletion`). Date de la demande, ou null
 * en cas d'erreur.
 */
export async function requestAccountDeletion(message: string | undefined): Promise<string | null> {
  const { data, error } = await supabase.rpc("request_account_deletion", {
    ...(message ? { p_message: message } : {}),
  });
  return error || !data ? null : data;
}
