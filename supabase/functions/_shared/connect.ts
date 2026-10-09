import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConnectAccountSnapshot } from "../../../packages/core/src/connect.ts";

/** Enregistre l'état d'un compte Stripe Connect sur la fiche artisan correspondante. */
export async function saveConnectAccount(
  admin: SupabaseClient,
  account: ConnectAccountSnapshot,
): Promise<boolean> {
  const values = {
    connect_charges_enabled: account.chargesEnabled,
    connect_payouts_enabled: account.payoutsEnabled,
    connect_details_submitted: account.detailsSubmitted,
    connect_updated_at: new Date().toISOString(),
  };
  const { data: updated, error } = await admin
    .from("artisans")
    .update(values)
    .eq("stripe_account_id", account.stripeAccountId)
    .select("id");
  if (error) throw error;
  if (updated?.length) return true;

  // Compte pas encore rattaché (réponse de création perdue) : métadonnée posée à la création.
  if (!account.artisanId) return false;
  const { data: linked, error: linkError } = await admin
    .from("artisans")
    .update({ ...values, stripe_account_id: account.stripeAccountId })
    .eq("id", account.artisanId)
    .is("stripe_account_id", null)
    .select("id");
  if (linkError) throw linkError;
  return Boolean(linked?.length);
}
