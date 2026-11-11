"use server";

import type { Database } from "@menao/db";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireAdmin } from "./guard";

const t = fr.admin.leads;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const target = z.coerce.number().int().min(0).max(100);

type SetArgs = Database["public"]["Functions"]["admin_set_lead_target"]["Args"];
// Les types générés ne marquent pas les paramètres SQL qui acceptent null.
type NullableArgs<T> = { [K in keyof T]: T[K] | null };

/** Message d'erreur de la base : 22023 = règle métier, montré tel quel. */
const dbError = (error: { code: string; message: string }) =>
  error.code === "22023" ? error.message : t.errors.generic;

/** Objectif par défaut de tous les artisans (F-131, ADR 0282). */
export async function saveDefaultLeadTarget(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = text(formData, "objectif") ?? "";
  const parsed = target.min(1).safeParse(raw);
  if (!raw || !parsed.success) {
    return {
      error: t.errors.invalid,
      fieldErrors: { objectif: [t.errors.invalid] },
      values: { objectif: raw },
    };
  }
  const { supabase } = await requireAdmin();
  const args: NullableArgs<SetArgs> = { p_artisan_id: null, p_objectif: parsed.data };
  const { error } = await supabase.rpc("admin_set_lead_target", args as SetArgs);
  if (error) return { error: dbError(error), values: { objectif: raw } };
  revalidatePath("/admin/objectifs");
  revalidatePath("/admin");
  // Réglage rangé dans les Réglages (ADR 0284).
  redirect("/admin/reglages?fait=objectif#demandes" as Route);
}

/** Objectif propre à un artisan ; vide : il reprend l'objectif par défaut. */
export async function saveArtisanLeadTarget(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const artisanId = text(formData, "artisan_id") ?? "";
  const raw = text(formData, "objectif") ?? "";
  const parsed = raw ? target.safeParse(raw) : null;
  if (!UUID.test(artisanId) || (parsed && !parsed.success)) {
    return {
      error: t.errors.invalid,
      fieldErrors: { objectif: [t.errors.invalid] },
      values: { objectif: raw },
    };
  }
  const { supabase } = await requireAdmin();
  const args: NullableArgs<SetArgs> = {
    p_artisan_id: artisanId,
    p_objectif: parsed?.success ? parsed.data : null,
  };
  const { error } = await supabase.rpc("admin_set_lead_target", args as SetArgs);
  if (error) return { error: dbError(error), values: { objectif: raw } };
  revalidatePath(`/admin/artisans/${artisanId}`);
  revalidatePath("/admin/objectifs");
  return { success: t.settings.saved };
}
