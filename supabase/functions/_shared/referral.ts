// Parrainage (F-60, ADR 0137) : pose des mois offerts sur les abonnements Stripe après une facture
// payée. Un crédit à la fois par abonnement (coupon à 100 % sur une facture) ; un crédit suivant
// attend la facture d'après. Le crédit en cours est noté dans les métadonnées de l'abonnement :
// un nouvel essai du webhook reconnaît sa propre remise et ne la pose pas deux fois.
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { REFERRAL_COUPON_ID, freeMonthAction } from "../../../packages/core/src/billing.ts";

export async function applyFreeMonths(
  admin: SupabaseClient,
  stripe: Stripe,
  stripeSubscriptionId: string,
): Promise<void> {
  const { data: grants, error } = await admin.rpc("free_month_candidates", {
    p_stripe_subscription_id: stripeSubscriptionId,
  });
  if (error) throw error;
  for (const grant of (grants ?? []) as { grant_id: string; stripe_subscription_id: string }[]) {
    const subscription = await stripe.subscriptions.retrieve(grant.stripe_subscription_id, {
      expand: ["discounts"],
    });
    const decision = freeMonthAction(subscription, grant.grant_id);
    if (decision.action === "wait") continue;
    if (decision.action === "apply") {
      await stripe.subscriptions.update(
        grant.stripe_subscription_id,
        {
          discounts: [
            ...decision.keep.map((discount) => ({ discount })),
            { coupon: REFERRAL_COUPON_ID },
          ],
          metadata: { menao_free_month_grant: grant.grant_id },
        },
        { idempotencyKey: `menao-free-month-${grant.grant_id}` },
      );
    }
    const { error: markError } = await admin.rpc("mark_free_month_applied", {
      p_grant_id: grant.grant_id,
      p_stripe_subscription_id: grant.stripe_subscription_id,
    });
    if (markError) throw markError;
  }
}
