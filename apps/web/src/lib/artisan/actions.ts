"use server";

import {
  REQUIRED_DOCUMENT_TYPES,
  onboardingProgress,
  type ConnectTokenPrefill,
  type ConnectTokens,
  type DocumentPrefill,
  type DocumentReadingWarning,
} from "@menao/core";
import {
  RADIUS_OPTIONS_KM,
  UPLOAD_PURPOSES,
  certificationSchema,
  companyStepSchema,
  diplomaSchema,
  documentMetadataSchema,
  messages,
  presentationSchema,
  siretSchema,
  tradesStepSchema,
  territoryChoiceSchema,
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
import { invokeRgeCheck } from "@/lib/rge";
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

/**
 * « Revérifier au registre » (ADR 0217) : nouvelle vérification du SIRET, puis de l'entreprise
 * dans l'annuaire public ; la fiche de vérification remplace le Kbis à déposer si elle aboutit.
 */
export async function recheckRegistry(): Promise<void> {
  await verifySiret();
}

/** Nouvelle lecture de l'annuaire RGE pour le SIRET de l'artisan (ADR 0118), « Actualiser ». */
export async function refreshRge(): Promise<void> {
  const { supabase } = await getOnboardingContext();
  const status = await invokeRgeCheck(supabase);
  refresh();
  redirect(`/pro/onboarding/metiers?rge=${status}` as Route);
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
  // Diplôme du métier déclaré (Score MENAO, ADR 0155), facultatif.
  const diploma = diplomaSchema.safeParse(text(formData, "diploma") ?? "");
  if (!diploma.success) return { fieldErrors: { diploma: [fr.errors.generic] } };
  // Budget minimum des demandes (ADR 0164), facultatif : vérifié en base.
  const budgetMinimum = text(formData, "budgetMinimum") ?? "";

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
  // Limite de métiers de la formule (ADR 0290) : message de la base.
  if (error) return { error: error.hint === "metiers_limite" ? error.message : fr.errors.generic };
  const { error: diplomaError } = await supabase.rpc("set_artisan_diploma", {
    p_diplome: diploma.data ?? "",
  });
  if (diplomaError) return { error: fr.errors.generic };
  const { error: budgetError } = await supabase.rpc("set_artisan_budget_minimum", {
    p_budget: budgetMinimum,
  });
  if (budgetError) return { fieldErrors: { budgetMinimum: [fr.errors.generic] } };

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

  const jsonList = (name: string): unknown => {
    try {
      return JSON.parse(text(formData, name) ?? "[]") as unknown;
    } catch {
      return [];
    }
  };
  const territories = jsonList("territories");

  // Territoires sans nouvelle adresse : l'adresse de base existante est conservée (ADR 0213).
  if (
    mode !== "rayon" &&
    mode !== "communes" &&
    text(formData, "keepBase") &&
    !text(formData, "lon")
  ) {
    const choice = territoryChoiceSchema.safeParse({ mode, territories });
    if (!choice.success) {
      return { fieldErrors: z.flattenError(choice.error).fieldErrors };
    }
    const { supabase } = await getOnboardingContext();
    const { error } = await supabase.rpc("set_artisan_zone", {
      p_mode: choice.data.mode,
      ...("territories" in choice.data ? { p_territoires: choice.data.territories } : {}),
    });
    if (error) return { error: fr.errors.generic };
    refresh();
    redirect("/pro/onboarding" as Route);
  }

  const base = {
    mode,
    baseLabel: text(formData, "baseLabel") ?? "",
    baseCitycode: text(formData, "baseCitycode") ?? "",
    lon: text(formData, "lon") ?? "",
    lat: text(formData, "lat") ?? "",
  };
  const parsed = zoneStepSchema.safeParse(
    mode === "communes"
      ? { mode, communes: jsonList("communes") }
      : mode === "rayon"
        ? { ...base, radiusKm: text(formData, "radiusKm") ?? "" }
        : { ...base, territories },
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
    z0.mode === "communes"
      ? await supabase.rpc("set_artisan_zone", { p_mode: "communes", p_communes: z0.communes })
      : await supabase.rpc("set_artisan_zone", {
          p_mode: z0.mode,
          p_base_label: z0.baseLabel,
          p_base_code_insee: z0.baseCitycode,
          p_lon: z0.lon,
          p_lat: z0.lat,
          ...("radiusKm" in z0 ? { p_radius_km: z0.radiusKm } : {}),
          ...("territories" in z0 ? { p_territoires: z0.territories } : {}),
        });
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

export type DocumentReadResult =
  | { status: "ok"; fields: DocumentPrefill; warnings: DocumentReadingWarning[] }
  | { status: "unavailable" };

/**
 * Lecture automatique d'un document déjà déposé dans « uploads » (ADR 0176), par l'Edge Function
 * read-document : champs à pré-remplir et alertes. En cas d'échec, l'artisan remplit les champs.
 */
export async function readDocument(path: string, type: string): Promise<DocumentReadResult> {
  const documentType = REQUIRED_DOCUMENT_TYPES.find((value) => value === type);
  if (!documentType || typeof path !== "string" || !path) return { status: "unavailable" };
  const { supabase } = await getOnboardingContext();
  const { data, error } = await supabase.functions.invoke<{
    status: string;
    fields?: DocumentPrefill;
    warnings?: DocumentReadingWarning[];
  }>("read-document", { method: "POST", body: { path, type: documentType } });
  if (error || data?.status !== "ok") return { status: "unavailable" };
  return { status: "ok", fields: data.fields ?? {}, warnings: data.warnings ?? [] };
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
  fn: "billing-checkout" | "billing-portal" | "billing-topup",
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
  // Au mois par défaut ; à l'année si l'artisan l'a choisi (ADR 0200).
  const periodicite = text(formData, "periodicite") === "annuel" ? "annuel" : "mensuel";
  const result = await invokeBilling("billing-checkout", { plan: plan.data, periodicite });
  if ("url" in result && result.url) redirect(result.url as Route);
  return { error: result.error };
}

/** Recharge de minutes de voix (ADR 0233) : paiement unique sur le site, jamais dans l'application. */
export async function startTopUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const offer = z
    .string()
    .regex(/^[a-z0-9_]{1,40}$/)
    .catch("recharge_100")
    .parse(text(formData, "offer") ?? "recharge_100");
  const result = await invokeBilling("billing-topup", { offer });
  if ("url" in result && result.url) redirect(result.url as Route);
  return { error: result.error };
}

export async function openBillingPortal(): Promise<FormState> {
  const result = await invokeBilling("billing-portal", {});
  if ("url" in result && result.url) redirect(result.url as Route);
  return { error: result.error };
}

type ConnectStatus = keyof typeof t.connect.errors | "ok";

/**
 * Avant la création du compte Stripe : données d'identité que le navigateur transforme en jetons
 * avec la clé publique (ADR 0204), et de quoi présenter le formulaire des compléments (ADR 0215).
 * Null si le compte existe déjà ou si la clé publique n'est pas configurée.
 */
export async function loadConnectPrefill(): Promise<ConnectTokenPrefill | null> {
  const { supabase } = await getOnboardingContext();
  const { data } = await supabase.functions.invoke<{
    status: string;
    prefill?: ConnectTokenPrefill | null;
  }>("connect-onboarding", { method: "POST", body: { action: "prefill" } });
  return data?.status === "ok" ? (data.prefill ?? null) : null;
}

type ConnectReply = {
  status: ConnectStatus;
  url?: string;
  clientSecret?: string;
  publishableKey?: string;
};

/** Appelle `connect-onboarding` ; en cas d'échec, le message d'erreur à afficher. */
async function invokeConnect(
  body: Record<string, unknown>,
): Promise<{ data: ConnectReply } | { error: string }> {
  const { supabase } = await getOnboardingContext();
  const { data, error } = await supabase.functions.invoke<ConnectReply>("connect-onboarding", {
    method: "POST",
    body,
  });
  if (data?.status === "ok") return { data };
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

/** Jetons du pré-remplissage, tels que la fonction les attend. */
const tokenBody = (tokens: ConnectTokens) => ({
  accountToken: tokens.accountToken,
  personToken: tokens.personToken,
  bankToken: tokens.bankToken,
});

/** Ouvre l'inscription Stripe Connect sur le site de Stripe (secours du formulaire intégré). */
export async function startConnectOnboarding(tokens: ConnectTokens = {}): Promise<FormState> {
  const result = await invokeConnect({
    action: "link",
    origin: env.NEXT_PUBLIC_SITE_URL,
    ...tokenBody(tokens),
  });
  if ("data" in result && result.data.url) redirect(result.data.url as Route);
  return { error: "error" in result ? result.error : t.connect.errors.unavailable };
}

/**
 * Crée le compte Stripe de l'artisan, pré-rempli par les jetons créés dans le navigateur (identité,
 * IBAN), avant le formulaire Stripe intégré (ADR 0215).
 */
export async function createConnectAccount(
  tokens: ConnectTokens = {},
  website: string | null = null,
): Promise<FormState> {
  const result = await invokeConnect({ action: "create", ...tokenBody(tokens), website });
  return "error" in result ? { error: result.error } : { success: "ok" };
}

/**
 * Session du formulaire Stripe intégré à MENAO (ADR 0215) : secret à durée courte, propre au
 * compte de l'artisan connecté, et clé publique. Appelée à l'ouverture puis à chaque expiration.
 */
export async function openConnectSession(): Promise<
  { clientSecret: string; publishableKey: string } | { error: string }
> {
  const result = await invokeConnect({ action: "session" });
  if ("error" in result) return result;
  const { clientSecret, publishableKey } = result.data;
  return clientSecret && publishableKey
    ? { clientSecret, publishableKey }
    : { error: t.connect.errors.unavailable };
}
