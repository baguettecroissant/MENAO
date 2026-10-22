"use server";

import { googleReviewsSchema } from "@menao/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireAdmin } from "./guard";

const t = fr.admin.detail.menaoScore;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Avis Google relevés par l'équipe sur la fiche Google de l'entreprise (ADR 0155) : base du
 * critère « Avis des clients » du Score MENAO. Lien vide : avis retirés. La base vérifie le rôle
 * (admin en session aal2) et journalise la saisie.
 */
export async function saveGoogleReviews(_prev: FormState, formData: FormData): Promise<FormState> {
  const artisanId = text(formData, "artisan") ?? "";
  const values = {
    url: text(formData, "url") ?? "",
    rating: text(formData, "rating") ?? "",
    count: text(formData, "count") ?? "",
  };
  if (!UUID.test(artisanId)) return { error: fr.errors.generic };
  const clear = formData.get("intent") === "clear";
  const parsed = googleReviewsSchema.safeParse(clear ? { url: "", rating: "", count: "" } : values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_set_google_reviews", {
    p_artisan_id: artisanId,
    p_url: parsed.data.url ?? "",
    p_rating: parsed.data.rating ?? 0,
    p_count: parsed.data.count ?? 0,
  });
  if (error) {
    return { error: error.code === "22023" ? error.message : fr.errors.generic, values };
  }
  revalidatePath(`/admin/artisans/${artisanId}`);
  return { success: parsed.data.url ? t.saved : t.cleared };
}
