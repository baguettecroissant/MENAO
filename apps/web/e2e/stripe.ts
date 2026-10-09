import { createHmac } from "node:crypto";

/** Corps et en-tête « Stripe-Signature » d'un webhook signé comme le fait Stripe. */
export function signedStripeEvent(event: object, secret: string) {
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return { payload, header: `t=${timestamp},v1=${signature}` };
}
