import type { ClientRatingInput } from "@menao/validation";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";

/**
 * F-23 : note de l'artisan sur son client, après la clôture, comme sur le site (ADR 0106).
 * Droits (chantier de l'artisan, clôturé, une note par chantier) : artisan_rate_client.
 */
export async function rateClient(
  chantierId: string,
  input: ClientRatingInput,
): Promise<string | null> {
  const { error } = await supabase.rpc("artisan_rate_client", {
    p_chantier_id: chantierId,
    p_welcome: input.welcome,
    p_clarity: input.clarity,
    p_payment: input.payment,
    p_comment: input.comment,
  });
  if (!error) return null;
  return error.code === "22023" || error.code === "42501" ? error.message : fr.errors.generic;
}

export type ClientReputation = {
  ratings: number;
  welcome: number;
  clarity: number;
  payment: number;
};

/**
 * Moyenne des notes du client d'une demande reçue, si l'équipe a rendu les notes visibles ;
 * null sinon (client_reputation ne renvoie alors aucune ligne). Jamais les commentaires.
 */
export async function loadClientReputation(requestId: string): Promise<ClientReputation | null> {
  const { data } = await supabase.rpc("client_reputation", { p_request_id: requestId });
  return data?.[0] ?? null;
}
