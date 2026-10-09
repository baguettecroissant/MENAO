"use server";

import { onboardingProgress } from "@menao/core";
import {
  RADIUS_OPTIONS_KM,
  certificationSchema,
  companyStepSchema,
  messages,
  siretSchema,
  tradesStepSchema,
  zoneStepSchema,
} from "@menao/validation";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { getOnboardingContext } from "./context";

const t = fr.pro.onboarding;

function refresh() {
  revalidatePath("/pro/onboarding", "layout");
}

/** Remplace le SIRET (possible tant que la fiche est en brouillon : garde-fou en base). */
export async function updateSiret(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { siret: text(formData, "siret") ?? "" };
  const parsed = siretSchema.safeParse(values.siret);
  if (!parsed.success)
    return { fieldErrors: { siret: [parsed.error.issues[0]?.message ?? ""] }, values };

  const { supabase, artisan } = await getOnboardingContext();
  const { error } = await supabase
    .from("artisans")
    .update({ siret: parsed.data })
    .eq("id", artisan.id);
  if (error) {
    const message =
      error.code === "23505"
        ? fr.errors.siretTaken
        : error.code === "42501"
          ? t.company.siretLocked
          : fr.errors.generic;
    return { error: message, values };
  }
  refresh();
  return { success: t.saved };
}

export type SireneCheckState = { status?: keyof typeof t.company.status };

/** Appelle l'Edge Function sirene-check avec la session de l'artisan. */
export async function verifySiret(): Promise<SireneCheckState> {
  const { supabase } = await getOnboardingContext();
  const { data, error } = await supabase.functions.invoke<{ status: SireneCheckState["status"] }>(
    "sirene-check",
    { method: "POST" },
  );
  let status: SireneCheckState["status"] = data?.status;
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { status?: string } | null;
    status =
      body?.status && body.status in t.company.status
        ? (body.status as typeof status)
        : "unavailable";
  } else if (error) {
    status = "unavailable";
  }
  refresh();
  return { status: status ?? "unavailable" };
}

export async function saveCompany(_prev: FormState, formData: FormData): Promise<FormState> {
  const tva = text(formData, "assujettiTva");
  const parsed = companyStepSchema.safeParse({
    nomCommercial: text(formData, "nomCommercial"),
    raisonSociale: text(formData, "raisonSociale"),
    assujettiTva: tva === "oui" ? true : tva === "non" ? false : undefined,
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const { supabase, artisan, snapshot } = await getOnboardingContext();
  if (!snapshot.siretVerified || !snapshot.sireneActive) return { error: t.company.verifyFirst };

  const update = {
    nom_commercial: parsed.data.nomCommercial ?? null,
    assujetti_tva: parsed.data.assujettiTva,
    // La raison sociale n'est modifiable qu'en cas de diffusion partielle Sirene (garde-fou en base).
    ...(artisan.sirene_partial ? { raison_sociale: parsed.data.raisonSociale ?? null } : {}),
  };
  const { error } = await supabase.from("artisans").update(update).eq("id", artisan.id);
  if (error) return { error: fr.errors.generic };

  const done = onboardingProgress({
    ...snapshot,
    assujettiTva: update.assujetti_tva,
    raisonSociale: artisan.sirene_partial
      ? (update.raison_sociale ?? null)
      : snapshot.raisonSociale,
  }).entreprise;
  refresh();
  if (done) redirect("/pro/onboarding/metiers");
  return { success: t.saved };
}

export async function saveTrades(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = tradesStepSchema.safeParse({
    tradeCodes: formData.getAll("trade").map(String),
    workTypeCodes: formData.getAll("workType").map(String),
    experienceYears: text(formData, "experienceYears") ?? "",
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const { supabase } = await getOnboardingContext();
  // Spécialités d'un métier décoché : ignorées plutôt que refusées.
  const { data: allowed } = await supabase
    .from("work_types")
    .select("code")
    .in("trade_code", parsed.data.tradeCodes);
  const allowedCodes = new Set((allowed ?? []).map((w) => w.code));

  const { error } = await supabase.rpc("set_artisan_trades", {
    p_trade_codes: parsed.data.tradeCodes,
    p_work_type_codes: parsed.data.workTypeCodes.filter((c) => allowedCodes.has(c)),
    p_experience_years: parsed.data.experienceYears,
  });
  if (error) return { error: fr.errors.generic };

  refresh();
  redirect("/pro/onboarding/zone");
}

export async function addCertification(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    type: text(formData, "type") ?? "",
    numero: text(formData, "numero") ?? "",
    dateFin: text(formData, "dateFin") ?? "",
  };
  const parsed = certificationSchema().safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const { supabase, artisan } = await getOnboardingContext();
  const { error } = await supabase.from("certifications").insert({
    artisan_id: artisan.id,
    type: parsed.data.type,
    numero: parsed.data.numero,
    date_fin: parsed.data.dateFin,
  });
  if (error) return { error: fr.errors.generic, values };

  refresh();
  return {};
}

export async function deleteCertification(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(text(formData, "id"));
  if (!id.success) return;
  const { supabase } = await getOnboardingContext();
  await supabase.from("certifications").delete().eq("id", id.data);
  refresh();
}

export async function saveZone(_prev: FormState, formData: FormData): Promise<FormState> {
  const mode = text(formData, "mode");

  // Rayon modifié sans nouvelle adresse : l'adresse de base existante est conservée (fonction SQL).
  if (mode === "rayon" && text(formData, "keepBase") && !text(formData, "lon")) {
    const radius = Number(text(formData, "radiusKm"));
    if (!(RADIUS_OPTIONS_KM as readonly number[]).includes(radius)) {
      return { fieldErrors: { radiusKm: [messages.radiusInvalid] } };
    }
    const { supabase } = await getOnboardingContext();
    const { error } = await supabase.rpc("set_artisan_zone", {
      p_mode: "rayon",
      p_radius_km: radius,
    });
    if (error) return { error: fr.errors.generic };
    refresh();
    redirect("/pro/onboarding" as Route);
  }

  const communes = (() => {
    try {
      return JSON.parse(text(formData, "communes") ?? "[]") as unknown;
    } catch {
      return [];
    }
  })();
  const parsed = zoneStepSchema.safeParse(
    mode === "rayon"
      ? {
          mode,
          baseLabel: text(formData, "baseLabel") ?? "",
          baseCitycode: text(formData, "baseCitycode") ?? "",
          lon: text(formData, "lon") ?? "",
          lat: text(formData, "lat") ?? "",
          radiusKm: text(formData, "radiusKm") ?? "",
        }
      : { mode: "communes", communes },
  );
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>;
    // Erreurs de coordonnées / code commune : l'adresse n'a pas été choisie dans la liste.
    if (errors.lon || errors.lat || errors.baseCitycode)
      errors.baseLabel = [fr.zoneErrors.addressRequired];
    return { fieldErrors: errors };
  }

  const { supabase } = await getOnboardingContext();
  const z0 = parsed.data;
  const { error } =
    z0.mode === "rayon"
      ? await supabase.rpc("set_artisan_zone", {
          p_mode: "rayon",
          p_base_label: z0.baseLabel,
          p_base_code_insee: z0.baseCitycode,
          p_lon: z0.lon,
          p_lat: z0.lat,
          p_radius_km: z0.radiusKm,
        })
      : await supabase.rpc("set_artisan_zone", { p_mode: "communes", p_communes: z0.communes });
  if (error) return { error: fr.errors.generic };

  refresh();
  redirect("/pro/onboarding" as Route);
}
