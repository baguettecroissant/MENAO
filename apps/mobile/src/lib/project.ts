import { MAX_SEARCH_RESULTS, parisToday } from "@menao/core";
import type { Database } from "@menao/db";
import { projectCriteriaSchema, type ProjectCriteriaInput } from "@menao/validation";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";

export type Criteria = ProjectCriteriaInput;

type SaveArgs = Database["public"]["Functions"]["save_project_criteria"]["Args"];
// Les types générés ne disent pas quels arguments SQL acceptent null (même contournement que le site).
type NullableArgs<T> = { [K in keyof T]: T[K] | null };

/**
 * Session de recherche, comme sur le site (ADR 0012) : celle du compte connecté, sinon une session
 * anonyme Supabase. Le projet appartient à cet utilisateur et le restera s'il crée son compte.
 */
async function ensureSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return true;
  const { data: anonymous, error } = await supabase.auth.signInAnonymously();
  return !error && Boolean(anonymous.user);
}

export type AnalyzeOutcome =
  { status: "ok"; projectId: string } | { status: keyof typeof fr.search.errors };

/** Artisan d'un chantier précédent à proposer en premier (« Redemander un devis », ADR 0040). */
export type Rehire = { artisanId: string; chantierId: string };

/**
 * Analyse du besoin (Edge Function `analyze-need`), qui crée le projet et pré-remplit ses critères.
 * Pour une nouvelle demande à un artisan déjà connu, la fonction vérifie le chantier commun.
 */
export async function analyzeNeed(
  description: string,
  tradeHint: string | null,
  rehire: Rehire | null = null,
): Promise<AnalyzeOutcome> {
  if (!(await ensureSession())) return { status: "session" };
  const { data, error } = await supabase.functions.invoke<{ status: string; projectId?: string }>(
    "analyze-need",
    {
      method: "POST",
      body: {
        description,
        tradeHint,
        ...(rehire
          ? { preferredArtisanId: rehire.artisanId, fromChantierId: rehire.chantierId }
          : {}),
      },
    },
  );
  const payload =
    error instanceof FunctionsHttpError
      ? ((await error.context.json().catch(() => null)) as typeof data)
      : error
        ? null
        : data;
  if (payload?.status === "ok" && payload.projectId) {
    return { status: "ok", projectId: payload.projectId };
  }
  if (payload?.status === "rate_limited" || payload?.status === "invalid") {
    return { status: payload.status };
  }
  return { status: "unavailable" };
}

export type ProjectForReview = {
  id: string;
  description: string;
  analyzed: boolean;
  lowConfidence: boolean;
  criteria: Criteria;
};

/** Projet à vérifier (F-07), lu avec les droits de l'utilisateur (RLS : le sien seulement). */
export async function loadProject(id: string, confidenceThreshold: number) {
  const { data: p } = await supabase
    .from("projects")
    .select(
      "id, description, analyzed_at, ai_confidence, trade_code, lieu_type, room_codes, work_type_codes, surface, ville_code_insee, ville_nom, code_postal, adresse, date_mode, date_souhaitee",
    )
    .eq("id", id)
    .maybeSingle();
  if (!p) return null;
  const project: ProjectForReview = {
    id: p.id,
    description: p.description,
    analyzed: p.analyzed_at !== null,
    lowConfidence: p.ai_confidence !== null && p.ai_confidence < confidenceThreshold,
    criteria: {
      tradeCode: p.trade_code,
      lieuType: p.lieu_type,
      roomCodes: p.room_codes,
      workTypeCodes: p.work_type_codes,
      surface: p.surface,
      // Ville et adresse déjà enregistrées : leurs coordonnées restent en base (lon et lat nuls).
      ville: p.ville_code_insee
        ? {
            code: p.ville_code_insee,
            nom: p.ville_nom ?? p.ville_code_insee,
            codePostal: p.code_postal,
            lon: null,
            lat: null,
          }
        : null,
      adresse:
        p.adresse && p.ville_code_insee
          ? { label: p.adresse, citycode: p.ville_code_insee, lon: null, lat: null }
          : null,
      dateMode: p.date_mode,
      dateSouhaitee: p.date_souhaitee,
    },
  };
  return project;
}

/** Message d'une erreur SQL : ceux des règles métier (code 22023) sont rédigés pour l'utilisateur. */
function sqlError(error: { code?: string; message: string }): string {
  return error.code === "22023" ? error.message : fr.errors.generic;
}

/**
 * Enregistre les critères (validés ici, puis en base par `save_project_criteria`) et vérifie
 * qu'ils suffisent à la recherche (`validate_project_criteria` : métier et ville).
 * Renvoie le message d'erreur à afficher, ou null.
 */
export async function saveAndValidateCriteria(
  projectId: string,
  input: Criteria,
): Promise<string | null> {
  const parsed = projectCriteriaSchema(parisToday()).safeParse(input);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? fr.errors.generic;
  const c = parsed.data;
  const args: NullableArgs<SaveArgs> = {
    p_project_id: projectId,
    p_trade_code: c.tradeCode,
    p_lieu_type: c.lieuType,
    p_room_codes: c.roomCodes,
    p_work_type_codes: c.workTypeCodes,
    p_surface: c.surface,
    p_ville_code_insee: c.ville?.code ?? null,
    p_ville_nom: c.ville?.nom ?? null,
    p_code_postal: c.ville?.codePostal ?? null,
    p_ville_lon: c.ville?.lon ?? null,
    p_ville_lat: c.ville?.lat ?? null,
    p_adresse: c.adresse?.label ?? null,
    p_lon: c.adresse?.lon ?? null,
    p_lat: c.adresse?.lat ?? null,
    p_date_mode: c.dateMode,
    p_date_souhaitee: c.dateSouhaitee,
  };
  const { error } = await supabase.rpc("save_project_criteria", args as SaveArgs);
  if (error) return sqlError(error);
  const { error: invalid } = await supabase.rpc("validate_project_criteria", {
    p_project_id: projectId,
  });
  return invalid ? sqlError(invalid) : null;
}

const specialtiesSchema = z.array(z.object({ code: z.string(), label: z.string() }));

export type MatchedArtisan = {
  id: string;
  name: string;
  avatarUrl: string | null;
  experienceYears: number | null;
  availableFrom: string | null;
  distanceKm: number | null;
  zone: {
    mode: "rayon" | "communes" | null;
    radiusKm: number | null;
    city: string | null;
    communes: string[];
  };
  specialties: { code: string; label: string }[];
};

export type ProjectResults = {
  tradeLabel: string;
  city: string;
  workTypeCodes: string[];
  artisans: MatchedArtisan[];
};

/** Adresse publique d'un fichier des espaces publics (photos de profil, réalisations). */
export function publicUrl(bucket: "avatars" | "portfolio", path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Artisans proposés par la base (`match_artisans`), classés ; null en cas d'erreur. */
export async function matchArtisans(
  projectId: string,
  limit: number,
): Promise<MatchedArtisan[] | null> {
  const { data: rows, error } = await supabase.rpc("match_artisans", {
    p_project_id: projectId,
    p_limit: limit,
  });
  if (error) return null;
  return (rows ?? []).map((row) => ({
    id: row.artisan_id,
    name: row.display_name,
    avatarUrl: row.avatar_path ? publicUrl("avatars", row.avatar_path) : null,
    experienceYears: row.experience_years,
    availableFrom: row.available_from,
    distanceKm: row.distance_km === null ? null : Number(row.distance_km),
    zone: {
      mode: row.zone_mode,
      radiusKm: row.zone_radius_km,
      city: row.zone_city,
      communes: row.zone_communes ?? [],
    },
    specialties: specialtiesSchema.catch([]).parse(row.specialties),
  }));
}

/**
 * Artisans proposés pour un projet (F-09) : sélection et classement faits par la base
 * (`match_artisans`, 5 artisans au plus), comme sur le site. Null en cas d'erreur.
 */
export async function loadResults(projectId: string): Promise<ProjectResults | null> {
  const { data: project } = await supabase
    .from("projects")
    .select("trade_code, work_type_codes, ville_nom")
    .eq("id", projectId)
    .maybeSingle();
  if (!project?.trade_code) return null;
  const [{ data: trade }, artisans] = await Promise.all([
    supabase.from("trades").select("label").eq("code", project.trade_code).maybeSingle(),
    matchArtisans(projectId, MAX_SEARCH_RESULTS),
  ]);
  if (!artisans) return null;
  return {
    tradeLabel: trade?.label ?? project.trade_code,
    city: project.ville_nom ?? "",
    workTypeCodes: project.work_type_codes,
    artisans,
  };
}
