import { artisanInvitationSchema } from "@menao/validation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";

/** Erreur de la base affichable telle quelle (règle métier), sinon message générique. */
function sqlError(error: { code?: string; message: string }): string {
  return error.code === "22023" ? error.message : fr.errors.generic;
}

export type InvitationForm = {
  company: string;
  contact_name: string;
  phone: string;
  email: string;
  city: string;
  message: string;
};

/**
 * « Invitez votre artisan de confiance » (ADR 0162) : mêmes règles que le site
 * (`artisanInvitationSchema`, puis `invite_artisan`). Erreurs par champ, ou message général.
 */
export async function inviteArtisan(
  values: InvitationForm,
): Promise<{ fieldErrors?: Record<string, string[] | undefined>; error?: string } | null> {
  const parsed = artisanInvitationSchema.safeParse({ ...values, trade_code: "" });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { error } = await supabase.rpc("invite_artisan", {
    p_company: parsed.data.company,
    p_contact_name: parsed.data.contact_name ?? "",
    p_phone: parsed.data.phone ?? "",
    p_email: parsed.data.email ?? "",
    p_trade_code: "",
    p_city: parsed.data.city ?? "",
    p_message: parsed.data.message ?? "",
  });
  return error ? { error: sqlError(error) } : null;
}

export type MyInvitation = {
  id: string;
  company: string;
  status: "envoyee" | "inscrit";
  created_at: string;
};

/** Invitations du particulier connecté, les plus récentes d'abord (RLS). */
export async function loadMyInvitations(): Promise<MyInvitation[]> {
  const { data } = await supabase
    .from("artisan_invitations")
    .select("id, company, status, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}
