"use server";

import { CHARTER_RULE_COUNT } from "@menao/core";
import { charterAcceptanceSchema, messages } from "@menao/validation";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { getOnboardingContext } from "./context";

/** Signature de la charte qualité (ADR 0104) : contrôlée ici, puis enregistrée par la base. */
export async function acceptCharter(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = charterAcceptanceSchema.safeParse({
    version: text(formData, "version"),
    rules: formData.getAll("rule").filter((v): v is string => typeof v === "string"),
    name: text(formData, "name") ?? "",
    company: text(formData, "company") ?? "",
    siret: text(formData, "siret") ?? "",
    signature: text(formData, "signature") ?? "",
    agree: text(formData, "agree") === "on",
  });
  if (!parsed.success) {
    const { formErrors, fieldErrors } = z.flattenError(parsed.error);
    return {
      error: formErrors[0] ?? Object.values(fieldErrors).flat()[0] ?? fr.errors.generic,
      fieldErrors: fieldErrors as Record<string, string[] | undefined>,
    };
  }

  const { supabase } = await getOnboardingContext();
  const c = parsed.data;
  const { error } = await supabase.rpc("accept_artisan_charter", {
    p_version: c.version,
    p_rules_count: CHARTER_RULE_COUNT,
    p_signer_name: c.name,
    p_company: c.company,
    p_siret: c.siret,
    p_signature_path: c.signature,
  });
  if (error) {
    return { error: error.code === "22023" ? messages.charterOutdated : fr.errors.generic };
  }

  revalidatePath("/pro/onboarding", "layout");
  redirect("/pro/onboarding/charte" as Route);
}
