"use server";

import { CHARTER_RULE_COUNT } from "@menao/core";
import { charterAcceptanceSchema, messages } from "@menao/validation";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { getOnboardingContext } from "./context";

export type CharterDestination = "onboarding" | "espace";

/**
 * Signature de la charte qualité (ADR 0104) : contrôlée ici, puis enregistrée par la base.
 * Pendant l'inscription, ou pour un artisan déjà inscrit à qui l'espace pro la demande (ADR 0109).
 */
export async function acceptCharter(
  destination: CharterDestination,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
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
  // Adresse IP du visiteur (ADR 0111) : la base, appelée par le serveur, ne voit que la sienne.
  const forwarded = (await headers()).get("x-forwarded-for");
  const { error } = await supabase.rpc("accept_artisan_charter", {
    p_version: c.version,
    p_rules_count: CHARTER_RULE_COUNT,
    p_signer_name: c.name,
    p_company: c.company,
    p_siret: c.siret,
    p_signature_path: c.signature,
    ...(forwarded ? { p_ip: forwarded.split(",")[0]?.trim() } : {}),
  });
  if (error) {
    return { error: error.code === "22023" ? messages.charterOutdated : fr.errors.generic };
  }

  if (destination === "espace") {
    revalidatePath("/pro", "layout");
    redirect("/pro/charte" as Route);
  }
  revalidatePath("/pro/onboarding", "layout");
  redirect("/pro/onboarding/charte" as Route);
}
