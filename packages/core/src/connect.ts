/**
 * Stripe Connect (F-14 étape 6) et visibilité de l'artisan.
 * Paiements des chantiers en « direct charges » sur le compte de l'artisan (ADR 0011) : MENAO
 * ne détient aucun fonds. Fichier autonome (aucun import) : importé par l'Edge Function stripe-webhook.
 */

export type ConnectAccountSnapshot = {
  stripeAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  artisanId: string | null;
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Lit un objet « account » de Stripe (webhook account.updated ou API). Sinon null. */
export function connectAccountFromStripe(input: unknown): ConnectAccountSnapshot | null {
  if (!isObj(input) || input.object !== "account" || typeof input.id !== "string") return null;
  const metadata = isObj(input.metadata) ? input.metadata : {};
  return {
    stripeAccountId: input.id,
    chargesEnabled: input.charges_enabled === true,
    payoutsEnabled: input.payouts_enabled === true,
    detailsSubmitted: input.details_submitted === true,
    artisanId: typeof metadata.artisan_id === "string" ? metadata.artisan_id : null,
  };
}

export type VisibilityCondition = "validation" | "abonnement" | "paiements";

/**
 * L'artisan est visible des particuliers et reçoit des demandes s'il est validé, abonné et
 * peut encaisser (spec F-14). Miroir SQL : app.artisan_is_visible.
 */
export function artisanVisibility(a: {
  status: "brouillon" | "en_verification" | "valide" | "refuse" | "suspendu";
  subscriptionActive: boolean;
  connectChargesEnabled: boolean;
}): { visible: boolean; missing: VisibilityCondition[] } {
  const missing: VisibilityCondition[] = [];
  if (a.status !== "valide") missing.push("validation");
  if (!a.subscriptionActive) missing.push("abonnement");
  if (!a.connectChargesEnabled) missing.push("paiements");
  return { visible: missing.length === 0, missing };
}
