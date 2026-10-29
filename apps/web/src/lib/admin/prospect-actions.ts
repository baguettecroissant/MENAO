"use server";

import type { ProspectImportRow } from "@menao/core";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "./guard";

const t = fr.admin.prospects;
/** Taille maximale d'un lot, comme admin_import_prospects. */
const MAX_BATCH = 1000;

export type ImportBatchResult = { count: number } | { error: string };

/**
 * Enregistre un lot de prospects lu par le navigateur dans l'API « Recherche d'entreprises »
 * (F-65, lot 2, ADR 0206). La base exige un admin en session aal2, vérifie chaque ligne et ignore
 * les invalides comme les SIRET à ne plus contacter ; elle renvoie le nombre de lignes écrites.
 */
export async function importProspectsBatch(rows: ProspectImportRow[]): Promise<ImportBatchResult> {
  if (
    !Array.isArray(rows) ||
    rows.length > MAX_BATCH ||
    rows.some((row) => typeof row !== "object" || row === null || Array.isArray(row))
  ) {
    return { error: t.errors.save };
  }
  if (rows.length === 0) return { count: 0 };

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_import_prospects", { p_rows: rows });
  if (error || typeof data !== "number") return { error: t.errors.save };
  return { count: data };
}
