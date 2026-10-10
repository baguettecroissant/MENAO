"use server";

import { quoteRevisionSchema, refuseQuoteSchema } from "@menao/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";

const t = fr.clientQuote;

/** Erreur de la base affichable telle quelle (règle métier), sinon message générique. */
const rpcError = (error: { code?: string; message: string }): FormState => ({
  error: error.code === "22023" ? error.message : fr.errors.generic,
});

/** F-21 : le client refuse le devis (motif de la liste, commentaire facultatif pour l'artisan). */
export async function refuseQuote(
  quoteId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(quoteId).success) return { error: fr.errors.generic };
  const values = {
    reason: text(formData, "reason") ?? "",
    comment: text(formData, "comment") ?? "",
  };
  const parsed = refuseQuoteSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("particulier_refuse_quote", {
    p_quote_id: quoteId,
    p_reason: parsed.data.reason,
    p_comment: parsed.data.comment,
  });
  if (error) return { ...rpcError(error), values };
  revalidatePath("/mon-espace", "layout");
  return { success: t.refusal.done };
}

/** F-21 : le client demande une modification ; l'artisan reçoit une nouvelle version à compléter. */
export async function requestQuoteRevision(
  quoteId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(quoteId).success) return { error: fr.errors.generic };
  const values = { message: text(formData, "message") ?? "" };
  const parsed = quoteRevisionSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("particulier_request_quote_revision", {
    p_quote_id: quoteId,
    p_message: parsed.data.message,
  });
  if (error) return { ...rpcError(error), values };
  revalidatePath("/mon-espace", "layout");
  return { success: t.revision.done };
}
