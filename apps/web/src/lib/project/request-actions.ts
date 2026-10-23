"use server";

import {
  LEGAL_DOCUMENT_VERSIONS,
  SIGNUP_REQUIRED_DOCUMENTS,
  isOAuthProvider,
  roleFromAppMetadata,
  signupPending,
} from "@menao/core";
import {
  artisanSelectionSchema,
  encodeLotSelection,
  lotSelectionSchema,
  requestFormSchema,
  signInSchema,
  signUpSchema,
  type LotSelection,
} from "@menao/validation";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { confirmUrlFor } from "@/lib/auth/confirm-url";
import { authErrorMessage } from "@/lib/auth/errors";
import { checkbox, text, type FormState } from "@/lib/auth/form";
import { redirectToProvider } from "@/lib/auth/oauth";
import { createClient } from "@/lib/supabase/server";
import { sendPagePath } from "./paths";

const t = fr.search.request;

/** Artisans choisis ; un chantier à plusieurs métiers ajoute ceux de ses lots (ADR 0170). */
export type RequestContext = { projectId: string; artisanIds: string[]; lots?: LotSelection };

function parseContext(ctx: RequestContext) {
  const projectId = z.uuid().safeParse(ctx.projectId);
  const lots = lotSelectionSchema.safeParse(encodeLotSelection(ctx.lots ?? []));
  if (!projectId.success || !lots.success) return null;
  if (lots.data.some((lot) => lot.projectId === projectId.data)) return null;
  // Seuls des artisans des autres métiers peuvent être choisis (aucun pour le métier principal).
  if (ctx.artisanIds.length === 0 && lots.data.length > 0) {
    return { projectId: projectId.data, artisanIds: [], lots: lots.data };
  }
  const artisans = artisanSelectionSchema.safeParse(ctx.artisanIds);
  return artisans.success
    ? { projectId: projectId.data, artisanIds: artisans.data, lots: lots.data }
    : null;
}

/**
 * F-08 : création du compte au moment de la demande. Le projet appartient à la session anonyme :
 * un jeton de transfert, joint au lien de confirmation, le rattachera au nouveau compte.
 */
export async function signUpForRequest(
  ctx: RequestContext,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = parseContext(ctx);
  if (!context) return { error: fr.errors.generic };
  const values = {
    firstName: text(formData, "firstName") ?? "",
    lastName: text(formData, "lastName") ?? "",
    phone: text(formData, "phone") ?? "",
    email: text(formData, "email") ?? "",
  };
  const parsed = signUpSchema.safeParse({
    ...values,
    password: text(formData, "password") ?? "",
    acceptTerms: checkbox(formData, "acceptTerms"),
    marketingOptIn: checkbox(formData, "marketingOptIn"),
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const supabase = await createClient();
  const { data: token, error: transferError } = await supabase.rpc("create_project_transfer", {
    p_project_id: context.projectId,
  });
  if (transferError || !token) return { error: t.transferError, values };

  const input = parsed.data;
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: confirmUrlFor(
        sendPagePath(context.projectId, context.artisanIds, token, context.lots),
      ),
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone ?? null,
        marketing_opt_in: input.marketingOptIn,
        legal: Object.fromEntries(
          SIGNUP_REQUIRED_DOCUMENTS.map((doc) => [doc, LEGAL_DOCUMENT_VERSIONS[doc]]),
        ),
      },
    },
  });
  if (error) return { error: authErrorMessage(error), values };
  return { success: t.checkEmail };
}

/**
 * « Continuer avec Google / Apple » au moment de la demande (ADR 0108) : comme pour l'inscription
 * par e-mail, un jeton de transfert rattachera le projet de la session anonyme au compte, à
 * l'arrivée sur la page d'envoi (après « Finaliser mon compte » pour un nouveau compte).
 */
export async function continueWithProviderForRequest(
  ctx: RequestContext,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = parseContext(ctx);
  const provider = text(formData, "provider");
  if (!context || !isOAuthProvider(provider)) return { error: fr.errors.generic };
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("create_project_transfer", {
    p_project_id: context.projectId,
  });
  if (error || !token) return { error: t.transferError };
  return redirectToProvider(
    provider,
    sendPagePath(context.projectId, context.artisanIds, token, context.lots),
  );
}

/** Connexion à un compte existant : le projet de la session anonyme lui est rattaché. */
export async function signInForRequest(
  ctx: RequestContext,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = parseContext(ctx);
  if (!context) return { error: fr.errors.generic };
  const values = { email: text(formData, "email") ?? "" };
  const parsed = signInSchema.safeParse({ ...values, password: text(formData, "password") ?? "" });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const supabase = await createClient();
  const { data: token } = await supabase.rpc("create_project_transfer", {
    p_project_id: context.projectId,
  });
  if (!token) return { error: t.transferError, values };

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authErrorMessage(error), values };
  if (roleFromAppMetadata(data.user.app_metadata) !== "particulier") {
    return { error: t.notParticulier, values };
  }
  const { error: claimError } = await supabase.rpc("claim_project", { p_token: token });
  if (claimError) return { error: t.transferError, values };
  const target = sendPagePath(context.projectId, context.artisanIds, undefined, context.lots);
  // Compte Google ou Apple à finaliser (ADR 0108) : CGU d'abord, puis la page d'envoi.
  if (signupPending(data.user.app_metadata)) {
    redirect(`/finaliser-compte?next=${encodeURIComponent(target)}` as Route);
  }
  redirect(target as Route);
}

/** F-11 : envoi aux artisans choisis (règles et éligibilité vérifiées en base). */
export async function sendRequest(
  ctx: RequestContext,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = parseContext(ctx);
  if (!context) return { error: fr.errors.generic };
  const values = {
    message: text(formData, "message") ?? "",
    phone: text(formData, "phone") ?? "",
    callbackMode: text(formData, "callbackMode") ?? "des_que_possible",
    callbackFrom: text(formData, "callbackFrom") ?? "",
    callbackTo: text(formData, "callbackTo") ?? "",
  };
  const parsed = requestFormSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const r = parsed.data;

  const supabase = await createClient();
  const contact = {
    p_message: r.message,
    p_phone: r.phone,
    p_callback_mode: r.callbackMode,
    // Les types générés ne marquent pas ces paramètres comme pouvant être nuls.
    p_callback_from: r.callbackFrom as string,
    p_callback_to: r.callbackTo as string,
  };
  // Plusieurs métiers (ADR 0170) : un seul envoi, tout ou rien.
  const { error } =
    context.lots.length === 0
      ? await supabase.rpc("send_project_requests", {
          p_project_id: context.projectId,
          p_artisan_ids: context.artisanIds,
          ...contact,
        })
      : await supabase.rpc("send_chantier_requests", {
          p_project_id: context.projectId,
          p_selections: [
            ...(context.artisanIds.length
              ? [{ project_id: context.projectId, artisan_ids: context.artisanIds }]
              : []),
            ...context.lots.map((lot) => ({
              project_id: lot.projectId,
              artisan_ids: lot.artisanIds,
            })),
          ],
          ...contact,
        });
  if (error) {
    return { error: error.code === "22023" ? error.message : fr.errors.generic, values };
  }
  const sent = new URLSearchParams(context.lots.map((lot) => ["lot", lot.projectId]));
  redirect(
    `/recherche/${context.projectId}/envoyee${context.lots.length ? `?${sent}` : ""}` as Route,
  );
}
