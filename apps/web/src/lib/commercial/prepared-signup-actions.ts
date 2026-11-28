"use server";

import {
  isValidSiret,
  PREPARED_NAME_MAX_LENGTH,
  PREPARED_SIGNUP_KEY_PATTERN,
  preparedSignupDraft,
  parseSignupDraft,
  type ArtisanSignupCompany,
} from "@menao/core";
import { normalizePhone } from "@menao/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import { getCommercialSpace } from "./space";

const t = fr.commercialField.prepare;
const SIGNUPS = "/commercial/inscriptions";

export type PrepareResult =
  { status: "ok"; link: string } | { status: "error"; message: string; field?: string };

const inputSchema = z.object({
  company: z.unknown(),
  tradeCodes: z.array(z.string()).min(1).max(20),
  radiusKm: z.number().int(),
  firstName: z.string().trim().min(1).max(PREPARED_NAME_MAX_LENGTH),
  lastName: z.string().trim().max(PREPARED_NAME_MAX_LENGTH),
  email: z.email(),
  phone: z.string(),
  consent: z.literal(true),
});

/** Adresse du lien personnel de l'artisan. */
export async function preparedSignupLink(key: string): Promise<string> {
  return `${env.NEXT_PUBLIC_SITE_URL}/pro/inscription/preparee/${key}`;
}

/**
 * Préparer l'inscription d'un artisan (F-195, ADR 0395) : brouillon du parcours (préparé par
 * preparedSignupDraft, @menao/core) et contact, avec l'accord de l'artisan. Retourne son lien.
 */
export async function prepareSignup(input: unknown): Promise<PrepareResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    const message =
      field === "consent"
        ? t.consentRequired
        : field === "email"
          ? "Adresse e-mail invalide."
          : field === "firstName"
            ? "Indiquez son prénom."
            : t.errors.unavailable;
    return { status: "error", message, field };
  }
  const v = parsed.data;
  const company = parseSignupDraft({ company: v.company }).company as ArtisanSignupCompany | null;
  const phone = normalizePhone(v.phone);
  if (!company || !isValidSiret(company.siret))
    return { status: "error", message: t.errors.unavailable };
  if (!phone) {
    return {
      status: "error",
      message: "Téléphone invalide : un portable, par exemple 06 12 34 56 78.",
      field: "phone",
    };
  }
  const space = await getCommercialSpace();
  if (!space.active || space.demo)
    return { status: "error", message: fr.commercialProspects.errors.suspended };
  const draft = preparedSignupDraft({ company, tradeCodes: v.tradeCodes, radiusKm: v.radiusKm });
  const { data: key, error } = await space.supabase.rpc("commercial_prepare_signup", {
    p_siret: company.siret,
    p_company_name: company.name ?? "",
    p_draft: draft,
    p_first_name: v.firstName,
    p_last_name: v.lastName,
    p_email: v.email,
    p_phone: phone,
  });
  if (error || !key) {
    return {
      status: "error",
      message: error?.code === "22023" ? error.message : t.errors.unavailable,
    };
  }
  revalidatePath(SIGNUPS);
  return { status: "ok", link: await preparedSignupLink(key) };
}

/** Retirer une préparation pas encore devenue une inscription. */
export async function removePreparedSignup(id: string): Promise<void> {
  if (!z.uuid().safeParse(id).success) return;
  const space = await getCommercialSpace();
  if (!space.active || space.demo) return;
  await space.supabase.rpc("commercial_delete_prepared_signup", { p_id: id });
  revalidatePath(SIGNUPS);
}

/** « Ce n'est pas moi » : l'artisan efface ce qui a été préparé (sans compte). */
export async function forgetPreparedSignup(key: string): Promise<{ status: "ok" | "error" }> {
  if (typeof key !== "string" || !PREPARED_SIGNUP_KEY_PATTERN.test(key)) return { status: "error" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("prepared_signup_forget", { p_key: key });
  return { status: error ? "error" : "ok" };
}
