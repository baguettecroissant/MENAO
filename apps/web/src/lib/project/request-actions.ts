"use server";

import {
  LEGAL_DOCUMENT_VERSIONS,
  SIGNUP_REQUIRED_DOCUMENTS,
  roleFromAppMetadata,
} from "@menao/core";
import {
  artisanSelectionSchema,
  requestFormSchema,
  signInSchema,
  signUpSchema,
} from "@menao/validation";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { confirmUrlFor } from "@/lib/auth/confirm-url";
import { authErrorMessage } from "@/lib/auth/errors";
import { checkbox, text, type FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";
import { sendPagePath } from "./paths";

const t = fr.search.request;

export type RequestContext = { projectId: string; artisanIds: string[] };

function parseContext(ctx: RequestContext) {
  const projectId = z.uuid().safeParse(ctx.projectId);
  const artisans = artisanSelectionSchema.safeParse(ctx.artisanIds);
  return projectId.success && artisans.success
    ? { projectId: projectId.data, artisanIds: artisans.data }
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
      emailRedirectTo: confirmUrlFor(sendPagePath(context.projectId, context.artisanIds, token)),
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
  redirect(sendPagePath(context.projectId, context.artisanIds) as Route);
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
  const { error } = await supabase.rpc("send_project_requests", {
    p_project_id: context.projectId,
    p_artisan_ids: context.artisanIds,
    p_message: r.message,
    p_phone: r.phone,
    p_callback_mode: r.callbackMode,
    // Les types générés ne marquent pas ces paramètres comme pouvant être nuls.
    p_callback_from: r.callbackFrom as string,
    p_callback_to: r.callbackTo as string,
  });
  if (error) {
    return { error: error.code === "22023" ? error.message : fr.errors.generic, values };
  }
  redirect(`/recherche/${context.projectId}/envoyee` as Route);
}
