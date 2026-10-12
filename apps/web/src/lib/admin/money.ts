import "server-only";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "./follow-up";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Argent (F-54, F-58, ADR 0051) : paiements des chantiers, abonnements des artisans et
 * notifications des services, en lecture seule. Files calculées par la base (admin_payments,
 * admin_subscriptions, admin_webhook_events).
 */
export const PAYMENT_FILTERS = ["tous", "payes", "en_cours", "echoues", "annules"] as const;
export type PaymentFilter = (typeof PAYMENT_FILTERS)[number];

export const SUBSCRIPTION_FILTERS = [
  "tous",
  "actifs",
  "essais",
  "impayes",
  "fin_programmee",
  "resilies",
] as const;
export type SubscriptionFilter = (typeof SUBSCRIPTION_FILTERS)[number];

export const WEBHOOK_FILTERS = ["echecs", "retablies", "toutes"] as const;
export type WebhookFilter = (typeof WEBHOOK_FILTERS)[number];

function parseFilter<T extends readonly string[]>(
  filters: T,
  value: unknown,
  fallback: T[number],
): T[number] {
  return typeof value === "string" && (filters as readonly string[]).includes(value)
    ? (value as T[number])
    : fallback;
}

export const parsePaymentFilter = (value: unknown) => parseFilter(PAYMENT_FILTERS, value, "tous");
export const parseSubscriptionFilter = (value: unknown) =>
  parseFilter(SUBSCRIPTION_FILTERS, value, "tous");
export const parseWebhookFilter = (value: unknown) => parseFilter(WEBHOOK_FILTERS, value, "echecs");

const n = z.number().int().nonnegative();
const counts = z.record(z.string(), n);
const parseCounts = (data: unknown) => {
  const parsed = counts.safeParse(data);
  return parsed.success ? parsed.data : {};
};

// ---------------------------------------------------------------------------
// Paiements des chantiers
// ---------------------------------------------------------------------------

export async function listPayments(
  supabase: Client,
  { filter, query, page }: { filter: PaymentFilter; query: string | null; page: number },
) {
  const { data } = await supabase.rpc("admin_payments", {
    p_filter: filter,
    p_query: query ?? undefined,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  const rows = data ?? [];
  return { rows, total: rows[0]?.total ?? 0 };
}

export async function paymentCounts(supabase: Client, query: string | null) {
  const { data } = await supabase.rpc("admin_payment_counts", { p_query: query ?? undefined });
  return parseCounts(data);
}

const paymentSummarySchema = z.object({
  payes_30j: n,
  payes_30j_cents: n,
  payes_cents: n,
  en_cours: n,
  en_cours_cents: n,
  echoues_7j: n,
});
export type PaymentSummary = z.infer<typeof paymentSummarySchema>;

export async function getPaymentSummary(supabase: Client): Promise<PaymentSummary | null> {
  const { data } = await supabase.rpc("admin_payment_summary");
  const parsed = paymentSummarySchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

// ---------------------------------------------------------------------------
// Abonnements des artisans
// ---------------------------------------------------------------------------

export async function listSubscriptions(
  supabase: Client,
  { filter, query, page }: { filter: SubscriptionFilter; query: string | null; page: number },
) {
  const { data } = await supabase.rpc("admin_subscriptions", {
    p_filter: filter,
    p_query: query ?? undefined,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  const rows = data ?? [];
  return { rows, total: rows[0]?.total ?? 0 };
}

export async function subscriptionCounts(supabase: Client, query: string | null) {
  const { data } = await supabase.rpc("admin_subscription_counts", {
    p_query: query ?? undefined,
  });
  return parseCounts(data);
}

const subscriptionSummarySchema = z.object({
  payants: n,
  mrr_cents: n,
  essais: n,
  essais_cents: n,
  impayes: n,
  impayes_cents: n,
  resilies_30j: n,
  perdus_30j: n,
  en_cours_30j: n,
  fin_programmee: n,
  sans_formule: n,
  formules: z.array(
    z.object({
      code: z.string(),
      nom: z.string(),
      prix_cents: n,
      payants: n,
      essais: n,
      mrr_cents: n,
    }),
  ),
});
export type SubscriptionSummary = z.infer<typeof subscriptionSummarySchema>;

export async function getSubscriptionSummary(
  supabase: Client,
): Promise<SubscriptionSummary | null> {
  const { data } = await supabase.rpc("admin_subscription_summary");
  const parsed = subscriptionSummarySchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

// ---------------------------------------------------------------------------
// Notifications des services (Stripe, DocuSeal)
// ---------------------------------------------------------------------------

export async function listWebhookEvents(
  supabase: Client,
  { filter, page }: { filter: WebhookFilter; page: number },
) {
  const { data } = await supabase.rpc("admin_webhook_events", {
    p_filter: filter,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  const rows = data ?? [];
  return { rows, total: rows[0]?.total ?? 0 };
}

export async function webhookCounts(supabase: Client) {
  const { data } = await supabase.rpc("admin_webhook_counts");
  return parseCounts(data);
}
