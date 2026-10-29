import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { ConnectAccountSnapshot } from "../../../packages/core/src/connect.ts";
import type { ConnectPrefillSource } from "../../../packages/core/src/connect-prefill.ts";

/** Enregistre l'état d'un compte Stripe Connect sur la fiche artisan correspondante. */
export async function saveConnectAccount(
  admin: SupabaseClient,
  account: ConnectAccountSnapshot,
): Promise<boolean> {
  const values = {
    connect_charges_enabled: account.chargesEnabled,
    connect_payouts_enabled: account.payoutsEnabled,
    connect_details_submitted: account.detailsSubmitted,
    // Ce que Stripe attend encore (page « Paiements »).
    connect_requirements_due: account.requirementsDue,
    connect_requirements_pending: account.requirementsPending,
    connect_disabled_reason: account.disabledReason?.slice(0, 100) ?? null,
    connect_requirements_deadline: account.requirementsDeadline,
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

/**
 * Ce que MENAO sait de l'artisan pour pré-remplir son compte Stripe (ADR 0204). Une lecture qui
 * échoue laisse des valeurs vides : l'artisan saisira chez Stripe ce qui manque.
 */
export async function prefillSource(
  admin: SupabaseClient,
  artisanId: string,
  user: User,
): Promise<ConnectPrefillSource> {
  const [artisan, profile, trades] = await Promise.all([
    admin
      .from("artisans")
      .select(
        "forme_juridique_code, raison_sociale, nom_commercial, siren, tva_intracom, adresse_ligne, adresse_code_postal, adresse_commune, is_dirigeant",
      )
      .eq("id", artisanId)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("first_name, last_name, phone")
      .eq("user_id", user.id)
      .maybeSingle(),
    admin.from("artisan_trades").select("trades(label, sort_order)").eq("artisan_id", artisanId),
  ]);
  const a = artisan.data;
  const p = profile.data;
  type Trade = { label: string; sort_order: number };
  const labels = ((trades.data ?? []) as unknown as { trades: Trade | Trade[] | null }[])
    .flatMap((row) => (Array.isArray(row.trades) ? row.trades : row.trades ? [row.trades] : []))
    .sort((x, y) => x.sort_order - y.sort_order)
    .map((t) => t.label);
  return {
    formeJuridiqueCode: a?.forme_juridique_code ?? null,
    raisonSociale: a?.raison_sociale ?? null,
    nomCommercial: a?.nom_commercial ?? null,
    siren: a?.siren ?? null,
    tvaIntracom: a?.tva_intracom ?? null,
    adresseLigne: a?.adresse_ligne ?? null,
    adresseCodePostal: a?.adresse_code_postal ?? null,
    adresseCommune: a?.adresse_commune ?? null,
    isDirigeant: a?.is_dirigeant ?? null,
    firstName: p?.first_name ?? null,
    lastName: p?.last_name ?? null,
    phone: p?.phone ?? null,
    email: user.email ?? null,
    trades: labels,
  };
}
