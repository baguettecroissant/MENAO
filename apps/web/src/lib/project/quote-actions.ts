"use server";

import { LEGAL_DOCUMENT_VERSIONS, SIGNATURE_CONSENTS } from "@menao/core";
import { quoteRevisionSchema, refuseQuoteSchema, signatureConsentsSchema } from "@menao/validation";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { checkbox, text, type FormState } from "@/lib/auth/form";
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

/**
 * F-13 « Signer le devis » : cases cochées (horodatées en base avec les versions des conditions),
 * puis ouverture de la signature chez le prestataire, où le client est redirigé.
 */
export async function startSignature(
  quoteId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(quoteId).success) return { error: fr.errors.generic };
  const checked = Object.fromEntries(SIGNATURE_CONSENTS.map((c) => [c, checkbox(formData, c)]));
  const values = Object.fromEntries(SIGNATURE_CONSENTS.map((c) => [c, checked[c] ? "on" : ""]));
  const parsed = signatureConsentsSchema.safeParse(checked);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke<{ status: string; url?: string }>(
    "signature-create",
    {
      body: {
        quoteId,
        consents: {
          ...parsed.data,
          versions: {
            cgu: LEGAL_DOCUMENT_VERSIONS.cgu,
            confidentialite: LEGAL_DOCUMENT_VERSIONS.confidentialite,
          },
        },
      },
    },
  );
  if (error || !data?.url) {
    // Règle métier (devis échu, plus signable) : message de la base, sinon indisponibilité.
    const body =
      error instanceof FunctionsHttpError && error.context.status === 409
        ? ((await error.context.json().catch(() => null)) as { message?: string } | null)
        : null;
    return { error: body?.message ?? t.signature.unavailable, values };
  }
  redirect(data.url as Route);
}
