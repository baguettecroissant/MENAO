"use server";

import { onboardingProgress } from "@menao/core";
import {
  RADIUS_OPTIONS_KM,
  UPLOAD_PURPOSES,
  certificationSchema,
  companyStepSchema,
  documentMetadataSchema,
  messages,
  presentationSchema,
  siretSchema,
  tradesStepSchema,
  zoneStepSchema,
} from "@menao/validation";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/env";
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
  if (done) redirect("/pro/onboarding" as Route);
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
  redirect("/pro/onboarding" as Route);
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

type UploadStatus = keyof typeof t.upload.status;

/**
 * Fait vérifier et ranger par l'Edge Function process-upload un fichier déjà déposé par le
 * navigateur dans « uploads ». Les métadonnées d'un document sont validées ici (Zod).
 */
export async function processUpload(_prev: FormState, formData: FormData): Promise<FormState> {
  const purpose = UPLOAD_PURPOSES.find((p) => p === text(formData, "purpose"));
  const path = text(formData, "path");
  if (!purpose || !path) return { error: t.upload.status.invalid };

  let document: unknown;
  if (purpose === "document") {
    const parsed = documentMetadataSchema().safeParse({
      type: text(formData, "documentType"),
      dateEmission: text(formData, "dateEmission"),
      dateFin: text(formData, "dateFin"),
      assureur: text(formData, "assureur"),
      numero: text(formData, "numero"),
      couverture: text(formData, "couverture"),
      coveredTrades: formData.getAll("coveredTrades").filter((v) => typeof v === "string"),
    });
    if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
    document = parsed.data;
  }

  const { supabase } = await getOnboardingContext();
  const { data, error } = await supabase.functions.invoke<{ status: UploadStatus }>(
    "process-upload",
    {
      method: "POST",
      body: { purpose, path, document },
    },
  );
  let status: UploadStatus = data?.status ?? "unavailable";
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { status?: string } | null;
    status =
      body?.status && body.status in t.upload.status
        ? (body.status as UploadStatus)
        : "unavailable";
  } else if (error) {
    status = "unavailable";
  }
  if (status !== "ok") return { error: t.upload.status[status] };

  refresh();
  return { success: t.upload.status.ok };
}

export async function savePresentation(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { presentation: text(formData, "presentation") ?? "" };
  const parsed = presentationSchema.safeParse(values.presentation);
  if (!parsed.success) {
    return { fieldErrors: { presentation: [parsed.error.issues[0]?.message ?? ""] }, values };
  }
  const { supabase, artisan } = await getOnboardingContext();
  const { error } = await supabase
    .from("artisans")
    .update({ presentation: parsed.data })
    .eq("id", artisan.id);
  if (error) return { error: fr.errors.generic, values };
  refresh();
  return { success: t.saved };
}

export async function deletePortfolioPhoto(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(text(formData, "id"));
  if (!id.success) return;
  const { supabase } = await getOnboardingContext();
  const { data: photo } = await supabase
    .from("artisan_photos")
    .select("storage_path")
    .eq("id", id.data)
    .single();
  if (!photo) return;
  await supabase.storage.from("portfolio").remove([photo.storage_path]);
  await supabase.from("artisan_photos").delete().eq("id", id.data);
  refresh();
}

/**
 * « Retirer le logo » (ADR 0038). L'ancien fichier n'est effacé que s'il n'est repris dans aucun
 * devis envoyé : la politique du bucket artisan-logos refuse sinon la suppression.
 */
export async function removeLogo(): Promise<void> {
  const { supabase } = await getOnboardingContext();
  const { data: previous } = await supabase.rpc("artisan_remove_logo");
  if (previous) await supabase.storage.from("artisan-logos").remove([previous]);
  refresh();
}

/** « Non soumis » à la décennale (ADR 0116), déclaré ou retiré tant que le dossier est modifiable. */
export async function setDecennaleExempt(formData: FormData): Promise<void> {
  const { supabase } = await getOnboardingContext();
  await supabase.rpc("set_decennale_non_soumis", { p_value: formData.get("value") === "oui" });
  refresh();
}

export async function submitOnboarding(): Promise<FormState> {
  const { supabase } = await getOnboardingContext();
  const { error } = await supabase.rpc("submit_artisan_onboarding");
  refresh();
  return error ? { error: t.submit.error } : {};
}

type BillingStatus = keyof typeof t.plans.errors | "ok";

async function invokeBilling(
  fn: "billing-checkout" | "billing-portal",
  body: Record<string, unknown>,
) {
  const { supabase } = await getOnboardingContext();
  const { data, error } = await supabase.functions.invoke<{ status: BillingStatus; url?: string }>(
    fn,
    {
      method: "POST",
      body: { ...body, origin: env.NEXT_PUBLIC_SITE_URL },
    },
  );
  if (data?.status === "ok" && data.url) return { url: data.url };
  let status: BillingStatus = data?.status ?? "unavailable";
  if (error instanceof FunctionsHttpError) {
    const parsed = (await error.context.json().catch(() => null)) as { status?: string } | null;
    status =
      parsed?.status && parsed.status in t.plans.errors
        ? (parsed.status as BillingStatus)
        : "unavailable";
  }
  return { error: t.plans.errors[status === "ok" ? "unavailable" : status] };
}

/** Ouvre Stripe Checkout pour la formule choisie (web uniquement, CLAUDE.md règle 10). */
export async function startCheckout(_prev: FormState, formData: FormData): Promise<FormState> {
  const plan = z.enum(["base", "premium", "entreprise"]).safeParse(text(formData, "plan"));
  if (!plan.success) return { error: t.plans.errors.plan_unavailable };
  const result = await invokeBilling("billing-checkout", { plan: plan.data });
  if ("url" in result && result.url) redirect(result.url as Route);
  return { error: result.error };
}

export async function openBillingPortal(): Promise<FormState> {
  const result = await invokeBilling("billing-portal", {});
  if ("url" in result && result.url) redirect(result.url as Route);
  return { error: result.error };
}

type ConnectStatus = keyof typeof t.connect.errors | "ok";

/** Ouvre l'inscription Stripe Connect (création du compte si besoin). */
export async function startConnectOnboarding(): Promise<FormState> {
  const { supabase } = await getOnboardingContext();
  const { data, error } = await supabase.functions.invoke<{ status: ConnectStatus; url?: string }>(
    "connect-onboarding",
    { method: "POST", body: { action: "link", origin: env.NEXT_PUBLIC_SITE_URL } },
  );
  if (data?.status === "ok" && data.url) redirect(data.url as Route);
  let status: ConnectStatus = data?.status ?? "unavailable";
  if (error instanceof FunctionsHttpError) {
    const parsed = (await error.context.json().catch(() => null)) as { status?: string } | null;
    status =
      parsed?.status && parsed.status in t.connect.errors
        ? (parsed.status as ConnectStatus)
        : "unavailable";
  }
  return { error: t.connect.errors[status === "ok" ? "unavailable" : status] };
}
