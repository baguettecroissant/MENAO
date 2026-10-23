"use server";

import { refusalSchema } from "@menao/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireArtisan } from "./requests";

const t = fr.pro.onboarding.requests;

function refresh() {
  revalidatePath("/pro", "layout");
}

/**
 * « Recommander un partenaire » (ADR 0174) : un partenaire du réseau de parrainage, pour cette
 * demande ou un autre métier du chantier ; règles vérifiées en base, le client est prévenu.
 */
export async function recommendPartner(
  requestId: string,
  projectId: string,
  partnerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ids = z.array(z.uuid()).length(3).safeParse([requestId, projectId, partnerId]);
  if (!ids.success) return { ok: false, error: fr.errors.generic };
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("recommend_partner", {
    p_request_id: requestId,
    p_project_id: projectId,
    p_partner_id: partnerId,
  });
  if (error)
    return { ok: false, error: error.code === "22023" ? error.message : fr.errors.generic };
  revalidatePath(`/pro/demandes/${requestId}`);
  return { ok: true };
}

/** F-17 : refus avec motif. L'acceptation passe par le rendez-vous (chantier-actions.ts). */
export async function refuseRequest(
  requestId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(requestId).success) return { error: fr.errors.generic };
  const values = { reason: text(formData, "reason") ?? "", detail: text(formData, "detail") ?? "" };
  const parsed = refusalSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("artisan_respond_request", {
    p_request_id: requestId,
    p_accept: false,
    p_reason: parsed.data.reason,
    p_detail: parsed.data.detail,
  });
  if (error) {
    return { error: error.code === "22023" ? error.message : fr.errors.generic, values };
  }
  refresh();
  return { success: t.refused };
}
