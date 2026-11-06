"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { VoiceSession } from "@/components/assistant/voice-call";
import { fr } from "@/i18n/fr";
import { checkbox, text, type FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";

const t = fr.pro.onboarding.plans.secretary;
const PATH = "/pro/onboarding/formule";

/** Appel d'essai de la secrétaire (ADR 0232) : jeton et contexte préparés par voice-session. */
export async function prepareSecretaryCall(): Promise<VoiceSession> {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("voice-session", { method: "POST" });
  if (!error && data?.status === "ok" && data.variables && typeof data.variables === "object") {
    return { variables: data.variables as Record<string, string> };
  }
  let status: string | undefined;
  try {
    const body = (await (error as { context?: Response } | null)?.context?.json?.()) as
      { status?: string } | undefined;
    status = body?.status;
  } catch {
    status = undefined;
  }
  return { error: t.errors[status ?? ""] ?? t.errors.generic ?? fr.errors.generic };
}

const settingsSchema = z.object({
  displayName: z.string().max(80),
  visitMinutes: z.coerce
    .number()
    .pipe(z.union([z.literal(30), z.literal(60), z.literal(90), z.literal(120)])),
  instructions: z.string().max(600),
});

export async function saveSecretarySettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = {
    displayName: text(formData, "displayName") ?? "",
    visitMinutes: text(formData, "visitMinutes") ?? "60",
    instructions: text(formData, "instructions") ?? "",
  };
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) return { error: fr.errors.generic, values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_secretary_settings", {
    p_display_name: parsed.data.displayName,
    p_can_book: checkbox(formData, "canBook"),
    p_visit_minutes: parsed.data.visitMinutes,
    p_instructions: parsed.data.instructions,
  });
  if (error) return { error: error.code === "22023" ? error.message : fr.errors.generic, values };
  revalidatePath(PATH);
  return { success: t.saved };
}

export async function markSecretaryMessage(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = z.uuid().safeParse(text(formData, "id"));
  if (!id.success) return { error: fr.errors.generic };
  const supabase = await createClient();
  const { error } = await supabase.rpc("secretary_message_done", {
    p_id: id.data,
    p_done: text(formData, "done") === "oui",
  });
  if (error) return { error: fr.errors.generic };
  revalidatePath(PATH);
  return {};
}
