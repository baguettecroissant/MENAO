"use server";

import { artisanInvitationSchema, clientCancelSchema } from "@menao/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";

const t = fr.clientCancel;

/** Erreur de la base affichable telle quelle (règle métier), sinon message générique. */
const rpcError = (error: { code?: string; message: string }): FormState => ({
  error: error.code === "22023" ? error.message : fr.errors.generic,
});

/** Recherche commencée mais jamais envoyée : supprimée avec ses photos (F-12, ADR 0040). */
export async function deleteDraftProject(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(text(formData, "projectId"));
  if (!id.success) return;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, project_photos(storage_path)")
    .eq("id", id.data)
    .in("status", ["brouillon", "criteres_valides"])
    .maybeSingle();
  if (!project) return;
  const paths = project.project_photos.map((photo) => photo.storage_path);
  if (paths.length) await supabase.storage.from("project-photos").remove(paths);
  await supabase.from("projects").delete().eq("id", project.id);
  revalidatePath("/mon-espace");
}

function parseCancel(formData: FormData) {
  const values = {
    reason: text(formData, "reason") ?? "",
    comment: text(formData, "comment") ?? "",
  };
  return { values, parsed: clientCancelSchema.safeParse(values) };
}

/** Demande encore sans réponse : annulée par le client, l'artisan est prévenu (F-11). */
export async function cancelRequest(
  requestId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(requestId).success) return { error: fr.errors.generic };
  const { values, parsed } = parseCancel(formData);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("particulier_cancel_request", {
    p_request_id: requestId,
    p_reason: parsed.data.reason,
    p_comment: parsed.data.comment,
  });
  if (error) return { ...rpcError(error), values };
  revalidatePath("/mon-espace", "layout");
  return { success: t.request.done };
}

/** Chantier avant l'acompte : annulé par le client, rendez-vous annulé, artisan prévenu (F-12). */
export async function cancelChantier(
  chantierId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(chantierId).success) return { error: fr.errors.generic };
  const { values, parsed } = parseCancel(formData);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("particulier_cancel_chantier", {
    p_chantier_id: chantierId,
    p_reason: parsed.data.reason,
    p_comment: parsed.data.comment,
  });
  if (error) return { ...rpcError(error), values };
  revalidatePath("/mon-espace", "layout");
  return { success: t.chantier.done };
}

const INVITATION_FIELDS = [
  "company",
  "contact_name",
  "phone",
  "email",
  "trade_code",
  "city",
  "message",
] as const;

/** « Invitez votre artisan de confiance » (ADR 0162) : ticket pour l'équipe MENAO. */
export async function inviteArtisan(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(
    INVITATION_FIELDS.map((name) => [name, text(formData, name) ?? ""]),
  ) as Record<(typeof INVITATION_FIELDS)[number], string>;
  const parsed = artisanInvitationSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_artisan", {
    p_company: parsed.data.company,
    p_contact_name: parsed.data.contact_name ?? "",
    p_phone: parsed.data.phone ?? "",
    p_email: parsed.data.email ?? "",
    p_trade_code: parsed.data.trade_code ?? "",
    p_city: parsed.data.city ?? "",
    p_message: parsed.data.message ?? "",
  });
  if (error) return { ...rpcError(error), values };
  revalidatePath("/mon-espace/inviter-un-artisan");
  return { success: fr.inviteArtisan.sent };
}
