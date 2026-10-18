import {
  certificationSchema,
  companyStepSchema,
  siretSchema,
  tradesStepSchema,
  zoneStepSchema,
  type CertificationType,
} from "@menao/validation";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";

/**
 * Entreprise, métiers, certifications et zone de l'artisan dans l'application (ADR 0125), comme
 * les étapes du site : mêmes contrôles (@menao/validation), mêmes écritures (RPC et tables, avec
 * les droits du compte), mêmes garde-fous en base (SIRET figé après l'envoi du dossier, raison
 * sociale modifiable seulement en cas de diffusion partielle Sirene).
 */

export type FieldErrors = Record<string, string | undefined>;
export type SaveResult = { ok: true } | { ok: false; error?: string; fields?: FieldErrors };

function flatten(error: z.ZodError): FieldErrors {
  return Object.fromEntries(
    Object.entries(z.flattenError(error).fieldErrors as Record<string, string[] | undefined>).map(
      ([key, list]) => [key, list?.[0]],
    ),
  );
}

async function myArtisanId(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("artisans")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return data?.id ?? null;
}

// ---------------------------------------------------------------------------------------------
// Entreprise et logo
// ---------------------------------------------------------------------------------------------

export type Company = {
  status: string;
  siret: string | null;
  siren: string | null;
  checkedAt: string | null;
  active: boolean | null;
  partial: boolean;
  raisonSociale: string | null;
  nomCommercial: string | null;
  assujettiTva: boolean | null;
  formeJuridique: string | null;
  ape: string | null;
  apeEligible: boolean | null;
  address: string | null;
  logoUrl: string | null;
};

export async function loadCompany(): Promise<Company | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: a } = await supabase
    .from("artisans")
    .select(
      "status, siret, siren, sirene_checked_at, sirene_active, sirene_partial, raison_sociale, nom_commercial, assujetti_tva, forme_juridique_code, ape_code, ape_eligible, adresse_ligne, adresse_code_postal, adresse_commune, logo_path",
    )
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!a) return null;
  const { data: logo } = a.logo_path
    ? await supabase.storage.from("artisan-logos").createSignedUrl(a.logo_path, 3600)
    : { data: null };
  return {
    status: a.status,
    siret: a.siret,
    siren: a.siren,
    checkedAt: a.sirene_checked_at,
    active: a.sirene_active,
    partial: a.sirene_partial,
    raisonSociale: a.raison_sociale,
    nomCommercial: a.nom_commercial,
    assujettiTva: a.assujetti_tva,
    formeJuridique: a.forme_juridique_code,
    ape: a.ape_code,
    apeEligible: a.ape_eligible,
    address:
      [a.adresse_ligne, a.adresse_code_postal, a.adresse_commune].filter(Boolean).join(" ") || null,
    logoUrl: logo?.signedUrl ?? null,
  };
}

/** Nouveau SIRET (possible tant que le dossier est en brouillon : garde-fou en base). */
export async function saveSiret(value: string): Promise<SaveResult> {
  const parsed = siretSchema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, fields: { siret: parsed.error.issues[0]?.message } };
  }
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: fr.errors.generic };
  const { error } = await supabase
    .from("artisans")
    .update({ siret: parsed.data })
    .eq("user_id", auth.user.id);
  if (!error) return { ok: true };
  const t = fr.proCompany;
  return {
    ok: false,
    error:
      error.code === "23505"
        ? t.siretTaken
        : error.code === "42501"
          ? t.siretLocked
          : fr.errors.generic,
  };
}

export type SireneStatus = keyof typeof fr.proCompany.status;

/** Vérification du SIRET auprès de l'INSEE (sirene-check), comme sur le site. */
export async function verifySiret(): Promise<SireneStatus> {
  const { data, error } = await supabase.functions.invoke<{ status: string }>("sirene-check", {
    method: "POST",
  });
  let status = data?.status;
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { status?: string } | null;
    status = body?.status;
  } else if (error) {
    status = undefined;
  }
  return status && status in fr.proCompany.status ? (status as SireneStatus) : "unavailable";
}

/** Nom commercial, TVA (et raison sociale si diffusion partielle Sirene). */
export async function saveCompany(input: {
  nomCommercial: string;
  raisonSociale: string;
  assujettiTva: boolean | null;
  partial: boolean;
}): Promise<SaveResult> {
  const parsed = companyStepSchema.safeParse({
    nomCommercial: input.nomCommercial,
    raisonSociale: input.raisonSociale,
    assujettiTva: input.assujettiTva ?? undefined,
  });
  if (!parsed.success) return { ok: false, fields: flatten(parsed.error) };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: fr.errors.generic };
  const { error } = await supabase
    .from("artisans")
    .update({
      nom_commercial: parsed.data.nomCommercial ?? null,
      assujetti_tva: parsed.data.assujettiTva,
      ...(input.partial ? { raison_sociale: parsed.data.raisonSociale ?? null } : {}),
    })
    .eq("user_id", auth.user.id);
  return error ? { ok: false, error: fr.errors.generic } : { ok: true };
}

/** « Retirer le logo » (ADR 0038) : l'ancien fichier n'est effacé que s'il n'est repris nulle part. */
export async function removeLogo(): Promise<boolean> {
  const { data: previous, error } = await supabase.rpc("artisan_remove_logo");
  if (error) return false;
  if (previous) await supabase.storage.from("artisan-logos").remove([previous]);
  return true;
}

// ---------------------------------------------------------------------------------------------
// Métiers, spécialités, certifications, RGE
// ---------------------------------------------------------------------------------------------

export type TradesData = {
  trades: { code: string; label: string; workTypes: { code: string; label: string }[] }[];
  selectedTrades: string[];
  selectedWorkTypes: string[];
  experienceYears: number | null;
  certifications: { id: string; type: CertificationType; numero: string; dateFin: string }[];
  rgeDomains: { domain: string; endsOn: string }[];
  rgeCheckedAt: string | null;
};

export async function loadTrades(): Promise<TradesData | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: artisan } = await supabase
    .from("artisans")
    .select("id, experience_years, rge_checked_at")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!artisan) return null;
  const [trades, workTypes, mine, myWorkTypes, certifications, rge] = await Promise.all([
    supabase.from("trades").select("code, label").eq("active", true).order("sort_order"),
    supabase
      .from("work_types")
      .select("code, label, trade_code")
      .eq("active", true)
      .order("sort_order"),
    supabase.from("artisan_trades").select("trade_code").eq("artisan_id", artisan.id),
    supabase.from("artisan_work_types").select("work_type_code").eq("artisan_id", artisan.id),
    supabase
      .from("certifications")
      .select("id, type, numero, date_fin")
      .eq("artisan_id", artisan.id)
      .order("created_at"),
    supabase
      .from("artisan_rge_qualifications")
      .select("domaine, date_fin")
      .eq("artisan_id", artisan.id),
  ]);
  if (trades.error) return null;
  return {
    trades: (trades.data ?? []).map((tr) => ({
      code: tr.code,
      label: tr.label,
      workTypes: (workTypes.data ?? [])
        .filter((w) => w.trade_code === tr.code)
        .map((w) => ({ code: w.code, label: w.label })),
    })),
    selectedTrades: (mine.data ?? []).map((m) => m.trade_code),
    selectedWorkTypes: (myWorkTypes.data ?? []).map((m) => m.work_type_code),
    experienceYears: artisan.experience_years,
    certifications: (certifications.data ?? []).map((c) => ({
      id: c.id,
      type: c.type,
      numero: c.numero,
      dateFin: c.date_fin,
    })),
    rgeDomains: (rge.data ?? []).map((r) => ({ domain: r.domaine, endsOn: r.date_fin })),
    rgeCheckedAt: artisan.rge_checked_at,
  };
}

/** Métiers, spécialités (seulement celles des métiers cochés) et années d'expérience. */
export async function saveTrades(input: {
  tradeCodes: string[];
  workTypeCodes: string[];
  experienceYears: string;
  allowedWorkTypes: string[];
}): Promise<SaveResult> {
  const parsed = tradesStepSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fields: flatten(parsed.error) };
  const allowed = new Set(input.allowedWorkTypes);
  const { error } = await supabase.rpc("set_artisan_trades", {
    p_trade_codes: parsed.data.tradeCodes,
    p_work_type_codes: parsed.data.workTypeCodes.filter((code) => allowed.has(code)),
    p_experience_years: parsed.data.experienceYears,
  });
  return error ? { ok: false, error: fr.errors.generic } : { ok: true };
}

export async function addCertification(input: {
  type: string;
  numero: string;
  dateFin: string;
}): Promise<SaveResult> {
  const parsed = certificationSchema().safeParse(input);
  if (!parsed.success) return { ok: false, fields: flatten(parsed.error) };
  const artisanId = await myArtisanId();
  if (!artisanId) return { ok: false, error: fr.errors.generic };
  const { error } = await supabase.from("certifications").insert({
    artisan_id: artisanId,
    type: parsed.data.type,
    numero: parsed.data.numero,
    date_fin: parsed.data.dateFin,
  });
  return error ? { ok: false, error: fr.errors.generic } : { ok: true };
}

export async function deleteCertification(id: string): Promise<boolean> {
  const { error } = await supabase.from("certifications").delete().eq("id", id);
  return !error;
}

export type RgeStatus = keyof typeof fr.proTrades.rgeStatus;

/** Nouvelle lecture de l'annuaire RGE pour le SIRET de l'artisan (rge-check, ADR 0118). */
export async function refreshRge(): Promise<RgeStatus> {
  const { data, error } = await supabase.functions.invoke<{ status: string }>("rge-check", {
    method: "POST",
    body: {},
  });
  let status = data?.status;
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { status?: string } | null;
    status = body?.status;
  } else if (error) {
    status = undefined;
  }
  return status && status in fr.proTrades.rgeStatus ? (status as RgeStatus) : "unavailable";
}

// ---------------------------------------------------------------------------------------------
// Zone d'intervention
// ---------------------------------------------------------------------------------------------

export type Zone = {
  mode: "rayon" | "communes" | null;
  radiusKm: number | null;
  baseLabel: string | null;
  hasBase: boolean;
  communes: { code: string; nom: string }[];
};

export async function loadZone(): Promise<Zone | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: a } = await supabase
    .from("artisans")
    .select("id, zone_mode, radius_km, base_label, base_location")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!a) return null;
  const { data: communes } = await supabase
    .from("artisan_zones")
    .select("code_insee, nom")
    .eq("artisan_id", a.id)
    .order("nom");
  return {
    mode: a.zone_mode,
    radiusKm: a.radius_km,
    baseLabel: a.base_label,
    hasBase: a.base_location !== null,
    communes: (communes ?? []).map((c) => ({ code: c.code_insee, nom: c.nom })),
  };
}

/**
 * Zone en rayon (nouvelle adresse de départ, ou rayon seul en gardant l'adresse enregistrée) ou
 * liste de communes, comme sur le site (set_artisan_zone).
 */
export async function saveZone(
  input:
    | {
        mode: "rayon";
        radiusKm: number;
        base: { label: string; citycode: string; lon: number; lat: number } | null;
      }
    | { mode: "communes"; communes: { code: string; nom: string }[] },
): Promise<SaveResult> {
  if (input.mode === "rayon" && input.base === null) {
    const { error } = await supabase.rpc("set_artisan_zone", {
      p_mode: "rayon",
      p_radius_km: input.radiusKm,
    });
    return error ? { ok: false, error: fr.errors.generic } : { ok: true };
  }
  const parsed = zoneStepSchema.safeParse(
    input.mode === "rayon"
      ? {
          mode: "rayon",
          baseLabel: input.base?.label ?? "",
          baseCitycode: input.base?.citycode ?? "",
          lon: input.base?.lon,
          lat: input.base?.lat,
          radiusKm: input.radiusKm,
        }
      : { mode: "communes", communes: input.communes },
  );
  if (!parsed.success) return { ok: false, fields: flatten(parsed.error) };
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
  return error ? { ok: false, error: fr.errors.generic } : { ok: true };
}
