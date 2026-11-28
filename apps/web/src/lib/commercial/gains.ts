import "server-only";
import { parisToday } from "@menao/core";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

const n = z.number().int().nonnegative();

/** Gains du conseiller (`commercial_gains`, F-197, ADR 0397). */
export const gainsSchema = z.object({
  mois_centimes: n,
  validations_mois: n,
  abonnements_mois: n,
  payes_annee_centimes: n,
  mois: z.array(z.object({ mois: z.string(), centimes: n })),
  a_venir: z.array(
    z.object({
      artisan: z.string(),
      etape: z.enum(["verification", "essai", "dossier"]),
      date: z.string().nullable(),
      plan: z.string().nullable(),
      centimes: n.nullable(),
    }),
  ),
});
export type Gains = z.infer<typeof gainsSchema>;

const invoiceSchema = z.object({
  id: z.string(),
  mode: z.enum(["preparee", "deposee"]),
  number: z.string().nullable(),
  issued_at: z.string(),
  total_ht_cents: n,
  vat_cents: n.nullable(),
  total_ttc_cents: n.nullable(),
  vat_mode: z.enum(["franchise", "assujetti"]).nullable(),
  seller: z
    .object({
      legal_name: z.string(),
      siret: z.string(),
      address: z.string(),
      vat_number: z.string().nullable(),
      rsac: z.string().nullable(),
      iban_end: z.string(),
    })
    .nullable(),
  has_file: z.boolean(),
  paid_at: z.string().nullable(),
  payout_reference: z.string().nullable(),
});

/** Un relevé, ses lignes, sa facture et l'identité de facturation actuelle. */
export const statementSchema = z.object({
  id: z.string(),
  commercial_id: z.string(),
  agent: z.string(),
  rsac: z.string().nullable(),
  rsac_greffe: z.string().nullable(),
  period_start: z.string(),
  period_end: z.string(),
  issued_at: z.string(),
  total_cents: n,
  lines: z.array(
    z.object({
      artisan: z.string(),
      kind: z.string(),
      plan: z.string().nullable(),
      validated_at: z.string().nullable(),
      amount_cents: n.nullable(),
    }),
  ),
  invoice: invoiceSchema.nullable(),
  billing: z
    .object({
      legal_name: z.string(),
      siret: z.string(),
      address: z.string(),
      vat_mode: z.enum(["franchise", "assujetti"]),
      vat_number: z.string().nullable(),
      iban_end: z.string(),
      invoice_prefix: z.string(),
      next_number: z.number().int().positive(),
    })
    .nullable(),
});
export type Statement = z.infer<typeof statementSchema>;

export async function getGains(supabase: Client): Promise<Gains | null> {
  const { data, error } = await supabase.rpc("commercial_gains");
  if (error) return null;
  const parsed = gainsSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Relevé du conseiller (ou, pour un admin, de n'importe quel conseiller) ; null s'il n'existe pas. */
export async function getStatement(
  supabase: Client,
  id: string,
  admin = false,
): Promise<Statement | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const { data, error } = admin
    ? await supabase.rpc("admin_commercial_statement", { p_id: id })
    : await supabase.rpc("commercial_statement", { p_id: id });
  if (error || !data) return null;
  const parsed = statementSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** AAAA-MM-JJ d'un instant, à Paris. */
export const parisDay = (iso: string) =>
  new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date(iso));

/** Le mois en cours (AAAA-MM) à Paris. */
export const currentMonth = () => parisToday().slice(0, 7);
