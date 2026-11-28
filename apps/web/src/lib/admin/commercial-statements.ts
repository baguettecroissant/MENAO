import "server-only";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

const n = z.number().int().nonnegative();

/** Relevés d'un mois pour le back-office (`admin_commercial_statements`, ADR 0397). */
const rowSchema = z.object({
  id: z.string(),
  commercial_id: z.string(),
  commercial: z.string(),
  period_end: z.string(),
  total_cents: n,
  invoice_id: z.string().nullable(),
  invoice_mode: z.enum(["preparee", "deposee"]).nullable(),
  invoice_number: z.string().nullable(),
  invoice_issued_at: z.string().nullable(),
  total_ttc_cents: n.nullable(),
  paid_at: z.string().nullable(),
  payout_reference: z.string().nullable(),
  billing_name: z.string().nullable(),
  iban: z.string().nullable(),
});
export type AdminStatement = z.infer<typeof rowSchema>;

/** AAAA-MM d'un paramètre, sinon le mois en cours à Paris. */
export function monthParam(value: unknown): string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
    ? value
    : new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date()).slice(0, 7);
}

export async function getAdminStatements(
  supabase: Client,
  month: string,
): Promise<AdminStatement[] | null> {
  const { data, error } = await supabase.rpc("admin_commercial_statements", {
    p_month: `${month}-01`,
  });
  if (error) return null;
  const parsed = z.array(rowSchema).safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Réponse CSV pour tableur français (BOM : accents corrects à l'ouverture). */
export function csvResponse(csv: string, filename: string): Response {
  return new Response(`﻿${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
