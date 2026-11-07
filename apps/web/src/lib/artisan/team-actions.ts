"use server";

import { isTeamRole } from "@menao/core";
import { teamInviteSchema } from "@menao/validation";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";

const t = fr.pro.team;
const PATH = "/pro/equipe";

/** Statut renvoyé par l'Edge Function team-members (corps de la réponse, même en erreur). */
async function invokeTeam(body: Record<string, unknown>): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke<{ status: string }>("team-members", {
    method: "POST",
    body,
  });
  if (error instanceof FunctionsHttpError) {
    const parsed = (await error.context.json().catch(() => null)) as { status?: string } | null;
    return parsed?.status ?? "unavailable";
  }
  return data?.status ?? "unavailable";
}

/**
 * Invitation d'un membre par le patron (F-89, ADR 0240) : l'Edge Function team-members crée le
 * compte (rôle artisan, clé serveur), l'enregistre au nom du patron (place libre, entreprise
 * validée) et Supabase envoie l'e-mail pour choisir le mot de passe.
 */
export async function inviteTeamMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(
    ["firstName", "lastName", "email", "role"].map((k) => [k, text(formData, k)?.trim() ?? ""]),
  );
  const parsed = teamInviteSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= [issue.message];
    }
    return { fieldErrors, values };
  }
  const status = await invokeTeam({ action: "invite", ...parsed.data });
  if (status !== "ok") {
    const message = t.errors[status] ?? t.errors.unavailable ?? fr.errors.generic;
    if (status === "email_taken") return { fieldErrors: { email: [message] }, values };
    return { error: message, values };
  }
  revalidatePath(PATH);
  return { success: t.invite.sent(parsed.data.email) };
}

/** Rôle, suspension, réactivation ou retrait d'un membre, par le patron. */
export async function updateTeamMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = text(formData, "userId") ?? "";
  const intent = text(formData, "intent");
  const name = text(formData, "name") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { error: t.errors.invalid };

  if (intent === "remove") {
    const status = await invokeTeam({ action: "remove", userId });
    if (status !== "ok") return { error: t.errors[status] ?? t.errors.unavailable };
    revalidatePath(PATH);
    return { success: t.actions.removed(name) };
  }

  const supabase = await createClient();
  const role = text(formData, "role");
  const { error } =
    intent === "role" && isTeamRole(role)
      ? await supabase.rpc("set_team_member_role", { p_user_id: userId, p_role: role })
      : intent === "suspend" || intent === "reactivate"
        ? await supabase.rpc("set_team_member_active", {
            p_user_id: userId,
            p_active: intent === "reactivate",
          })
        : { error: { code: "22023", message: t.errors.invalid } };
  if (error) {
    // Messages de la base, en français, pour les refus attendus (place, membre, patron).
    return {
      error: error.code === "22023" || error.code === "42501" ? error.message : fr.errors.generic,
    };
  }
  revalidatePath(PATH);
  return {};
}
