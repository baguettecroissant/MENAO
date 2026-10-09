"use server";

import { refusalSchema } from "@menao/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireArtisan } from "./requests";

const t = fr.pro.onboarding.requests;

function refresh(requestId: string) {
  revalidatePath("/pro/demandes");
  revalidatePath(`/pro/demandes/${requestId}`);
}

/** F-17 : acceptation (le rendez-vous viendra en phase 3). Règles : artisan_respond_request. */
export async function acceptRequest(requestId: string, _prev: FormState): Promise<FormState> {
  if (!z.uuid().safeParse(requestId).success) return { error: fr.errors.generic };
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("artisan_respond_request", {
    p_request_id: requestId,
    p_accept: true,
  });
  if (error) return { error: error.code === "22023" ? error.message : fr.errors.generic };
  refresh(requestId);
  return { success: t.accepted };
}

export async function refuseRequest(
  requestId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(requestId).success) return { error: fr.errors.generic };
  const parsed = refusalSchema.safeParse({
    reason: text(formData, "reason") ?? "",
    detail: text(formData, "detail") ?? "",
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("artisan_respond_request", {
    p_request_id: requestId,
    p_accept: false,
    p_reason: parsed.data.reason,
    p_detail: parsed.data.detail,
  });
  if (error) return { error: error.code === "22023" ? error.message : fr.errors.generic };
  refresh(requestId);
  return { success: t.refused };
}
