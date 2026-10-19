import { commissionsCsv } from "@menao/core";
import { requireAdmin } from "@/lib/admin/guard";
import { commissionsForExport } from "@/lib/admin/partners";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const STATUSES = ["en_attente", "validee", "payee", "annulee"] as const;

/**
 * Export des commissions pour les virements (F-59, ADR 0136) : CSV pour tableur français, à
 * payer par défaut (?statut=…), d'un partenaire ou de tous (?partenaire=…). Réservé aux admins.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const statusParam = url.searchParams.get("statut") ?? "validee";
  const status = STATUSES.find((s) => s === statusParam) ?? null;
  const partnerParam = url.searchParams.get("partenaire");
  const partnerId = partnerParam && UUID.test(partnerParam) ? partnerParam : null;
  const { supabase } = await requireAdmin();
  const rows = await commissionsForExport(supabase, { status, partnerId });
  const csv = commissionsCsv(
    rows.map((r) => ({
      partner: r.partners?.nom ?? "",
      siret: r.partners?.siret ?? "",
      kind: r.kind,
      status: r.status,
      amountCents: r.amount_cents,
      createdAt: r.created_at,
      validatedAt: r.validated_at,
      reference: r.payout_reference,
    })),
  );
  const day = new Date().toISOString().slice(0, 10);
  // BOM : accents corrects à l'ouverture dans un tableur.
  return new Response(`﻿${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="menao-commissions-${status ?? "toutes"}-${day}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
