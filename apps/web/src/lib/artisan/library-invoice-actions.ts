"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import type { FormState } from "@/lib/auth/form";
import { refreshWorkPrices } from "./library";
import { requireTeamPermission } from "./space";

const t = fr.pro.library.invoices;
const BASE = "/pro/bibliotheque";

const ids = z.array(z.string().uuid()).max(500);
const pairs = z
  .array(z.string().regex(/^[0-9a-f-]{36}:[0-9a-f-]{36}$/))
  .max(500)
  .transform((list) =>
    list.map((p) => {
      const [supplyId, lineId] = p.split(":");
      return { supplyId: supplyId!, lineId: lineId! };
    }),
  );

/**
 * Prix d'achat repris des factures (F-149, ADR 0311) : prix cochés mis à jour, articles cochés
 * ajoutés, toutes les lignes affichées passées en revue ; les prix sont relus par la base sur la
 * facture. Puis retour aux fournitures avec le bilan.
 */
export async function applyInvoicePrices(_prev: FormState, formData: FormData): Promise<FormState> {
  const updates = pairs.safeParse(formData.getAll("update"));
  const add = ids.safeParse(formData.getAll("add"));
  const seen = ids.safeParse(formData.getAll("seen"));
  if (!updates.success || !add.success || !seen.success) return { error: t.invalid };
  const { supabase } = await requireTeamPermission("money");
  const { data, error } = await supabase.rpc("artisan_apply_invoice_prices", {
    p_updates: updates.data,
    p_add: add.data,
    p_seen: seen.data,
  });
  if (error || !data) return { error: t.invalid };
  const result = data as { updated: number; added: number };
  await refreshWorkPrices(supabase);
  revalidatePath(BASE);
  const query = new URLSearchParams({
    vue: "fournitures",
    factures: String(result.updated),
    ajouts: String(result.added),
  });
  redirect(`${BASE}?${query}` as Route);
}
