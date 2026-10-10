"use server";

import { LEGAL_DOCUMENT_VERSIONS, SIGNATURE_CONSENTS } from "@menao/core";
import { receptionConsentsSchema, reservesSchema } from "@menao/validation";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { checkbox, text, type FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";

/**
 * F-25, F-26 « Signer le PV de réception » : cases cochées et, s'il y en a, réserves ; la signature
 * s'ouvre ensuite chez le prestataire (même procédure que le devis), où le client est redirigé.
 */
export async function startReception(
  chantierId: string,
  withReserves: boolean,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(chantierId).success) return { error: fr.errors.generic };
  const checked = Object.fromEntries(SIGNATURE_CONSENTS.map((c) => [c, checkbox(formData, c)]));
  const reserves = text(formData, "reserves") ?? "";
  const values = {
    ...Object.fromEntries(SIGNATURE_CONSENTS.map((c) => [c, checked[c] ? "on" : ""])),
    reserves,
  };
  const consents = receptionConsentsSchema.safeParse(checked);
  const reservesInput = withReserves ? reservesSchema.safeParse({ reserves }) : null;
  if (!consents.success || (reservesInput && !reservesInput.success)) {
    return {
      fieldErrors: {
        ...(consents.success ? {} : z.flattenError(consents.error).fieldErrors),
        ...(reservesInput && !reservesInput.success
          ? z.flattenError(reservesInput.error).fieldErrors
          : {}),
      },
      values,
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke<{ status: string; url?: string }>(
    "signature-create",
    {
      body: {
        chantierId,
        reserves: reservesInput?.success ? reservesInput.data.reserves : null,
        consents: {
          ...consents.data,
          versions: {
            cgu: LEGAL_DOCUMENT_VERSIONS.cgu,
            confidentialite: LEGAL_DOCUMENT_VERSIONS.confidentialite,
          },
        },
      },
    },
  );
  if (error || !data?.url) {
    // Règle métier (étape du chantier, PV déjà signé) : message de la base, sinon indisponibilité.
    const body =
      error instanceof FunctionsHttpError && error.context.status === 409
        ? ((await error.context.json().catch(() => null)) as { message?: string } | null)
        : null;
    return { error: body?.message ?? fr.reception.unavailable, values };
  }
  redirect(data.url as Route);
}

/** F-26 « Confirmer la levée des réserves » : chantier réceptionné, le solde est demandé ensuite. */
export async function confirmReservesLifted(chantierId: string): Promise<FormState> {
  if (!z.uuid().safeParse(chantierId).success) return { error: fr.errors.generic };
  const supabase = await createClient();
  const { error } = await supabase.rpc("particulier_confirm_reserves_lifted", {
    p_chantier_id: chantierId,
  });
  if (error) return { error: error.code === "22023" ? error.message : fr.errors.generic };
  revalidatePath(`/mon-espace/chantiers/${chantierId}`);
  return { success: fr.chantier.reception.lifted };
}

/**
 * F-32 « Payer le solde » : paiement Stripe Checkout ouvert directement sur le compte de l'artisan
 * (aucune commission MENAO), où le client est redirigé.
 */
export async function payBalance(chantierId: string): Promise<FormState> {
  if (!z.uuid().safeParse(chantierId).success) return { error: fr.errors.generic };
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke<{ status: string; url?: string }>(
    "deposit-checkout",
    { body: { chantierId, origin: env.NEXT_PUBLIC_SITE_URL } },
  );
  if (error || !data?.url) {
    const body =
      error instanceof FunctionsHttpError && error.context.status === 409
        ? ((await error.context.json().catch(() => null)) as { message?: string } | null)
        : null;
    return { error: body?.message ?? fr.balance.unavailable };
  }
  redirect(data.url as Route);
}
