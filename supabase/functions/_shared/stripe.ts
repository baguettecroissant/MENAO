import Stripe from "stripe";
import { env } from "./env.ts";

/** Client Stripe (fetch). En CI, STRIPE_API_HOST pointe vers stripe-mock. */
export function stripeClient(): Stripe {
  const host = env("STRIPE_API_HOST");
  return new Stripe(env("STRIPE_SECRET_KEY"), {
    httpClient: Stripe.createFetchHttpClient(),
    ...(host
      ? {
          host,
          port: Number(env("STRIPE_API_PORT") || 12111),
          protocol: (env("STRIPE_API_PROTOCOL") || "http") as "http" | "https",
        }
      : {}),
  });
}

/** Origine de retour après Stripe : uniquement parmi SITE_URLS (pas de redirection ouverte). */
export function returnOrigin(requested: unknown): string {
  const allowed = env("SITE_URLS")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const origin = typeof requested === "string" ? requested.replace(/\/$/, "") : "";
  return allowed.includes(origin) ? origin : (allowed[0] ?? "");
}
