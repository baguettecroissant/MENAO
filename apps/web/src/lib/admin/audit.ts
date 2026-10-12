import "server-only";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "./follow-up";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Catégories du journal d'audit (spec §13, ADR 0052), calculées par la base (admin_audit_log). */
export const AUDIT_FILTERS = [
  "tous",
  "artisans",
  "comptes",
  "moderation",
  "litiges",
  "listes",
  "automatique",
] as const;
export type AuditFilter = (typeof AUDIT_FILTERS)[number];

export function parseAuditFilter(value: unknown): AuditFilter {
  return typeof value === "string" && (AUDIT_FILTERS as readonly string[]).includes(value)
    ? (value as AuditFilter)
    : "tous";
}

const counts = z.record(z.string(), z.number().int().nonnegative());

export async function listAudit(
  supabase: Client,
  { filter, query, page }: { filter: AuditFilter; query: string | null; page: number },
) {
  const { data } = await supabase.rpc("admin_audit_log", {
    p_filter: filter,
    p_query: query ?? undefined,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  const rows = data ?? [];
  return { rows, total: rows[0]?.total ?? 0 };
}

export async function auditCounts(supabase: Client, query: string | null) {
  const { data } = await supabase.rpc("admin_audit_counts", { p_query: query ?? undefined });
  const parsed = counts.safeParse(data);
  return parsed.success ? parsed.data : {};
}
