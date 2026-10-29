import { commercialBonusesCsv } from "@menao/core";
import { requireAdmin } from "@/lib/admin/guard";

/**
 * Export des primes des commerciaux à payer (F-65, lot 3, ADR 0207) : CSV pour tableur français,
 * une ligne par prime vérifiée et pas encore payée. Réservé aux admins.
 */
export async function GET() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("admin_commercial_bonuses_to_pay");
  const csv = commercialBonusesCsv(
    (data ?? []).map((r) => ({
      commercial: r.commercial,
      code: r.code,
      // Nom absent si la fiche de l'artisan a été supprimée.
      artisan: r.artisan ?? "",
      kind: r.kind,
      amountCents: r.amount_cents,
      validatedAt: r.validated_at,
    })),
  );
  const day = new Date().toISOString().slice(0, 10);
  // BOM : accents corrects à l'ouverture dans un tableur (commercialBonusesCsv n'en met pas).
  return new Response(`﻿${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="menao-primes-commerciaux-${day}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
