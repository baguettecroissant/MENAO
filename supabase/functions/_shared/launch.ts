// Ouverture progressive (F-188, ADR 0387) : paiements Stripe fermés jusqu'au lancement. Les tests
// de bout en bout les rouvrent avec MENAO_FULL_ACCESS=true (CI uniquement).
import { PAYMENTS_OPEN } from "../../../packages/core/src/launch.ts";
import { env } from "./env.ts";

export const paymentsOpen = PAYMENTS_OPEN || env("MENAO_FULL_ACCESS") === "true";

/** Réponse des fonctions de paiement tant qu'ils sont fermés. */
export function paymentsClosed(): Response {
  return new Response(JSON.stringify({ status: "payments_closed" }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}
