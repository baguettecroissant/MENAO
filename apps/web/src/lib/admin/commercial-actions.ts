"use server";

import { normalizePartnerCode } from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireAdmin } from "./guard";

const t = fr.admin.commercials;
const PATH = "/admin/commerciaux";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID = t.errors.invalid ?? fr.errors.generic;

/**
 * Invitation d'un commercial (F-65, ADR 0205) : l'Edge Function commercial-invite crée le compte
 * avec le rôle « commercial » (clé serveur), puis la fiche et son code (admin en session aal2,
 * vérifié par la base), et Supabase envoie l'e-mail pour choisir le mot de passe.
 */
export async function inviteCommercial(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(
    ["firstName", "lastName", "email", "code"].map((k) => [k, text(formData, k)?.trim() ?? ""]),
  );
  const code = normalizePartnerCode(values.code);
  const fieldErrors: Record<string, string[]> = {};
  if (!values.firstName || values.firstName.length > 100) fieldErrors.firstName = [INVALID];
  if (!values.lastName || values.lastName.length > 100) fieldErrors.lastName = [INVALID];
  if (!EMAIL.test(values.email ?? "")) fieldErrors.email = [INVALID];
  if (!code) fieldErrors.code = [t.fields.codeHint];
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.functions.invoke<{ status: string }>("commercial-invite", {
    method: "POST",
    body: {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      code,
    },
  });
  let status = data?.status ?? "unavailable";
  if (error instanceof FunctionsHttpError) {
    const parsed = (await error.context.json().catch(() => null)) as { status?: string } | null;
    status = parsed?.status ?? "unavailable";
  }
  if (status !== "ok") {
    const message = t.errors[status] ?? t.errors.unavailable ?? fr.errors.generic;
    if (status === "code_taken") return { fieldErrors: { code: [message] }, values };
    if (status === "email_taken") return { fieldErrors: { email: [message] }, values };
    return { error: message, values };
  }
  revalidatePath(PATH);
  return { success: t.invited(values.email ?? "") };
}

/** Suspendre ou réactiver un commercial : son code n'attribue plus les inscriptions. */
export async function setCommercialStatus(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = text(formData, "id") ?? "";
  const status = text(formData, "status") === "suspendu" ? "suspendu" : "actif";
  if (!UUID.test(id)) return { error: t.statusError };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_set_commercial_status", {
    p_id: id,
    p_status: status,
  });
  if (error) return { error: t.statusError };
  revalidatePath(PATH);
  return {};
}
