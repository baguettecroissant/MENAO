import {
  inWorkOrder,
  lotStart,
  MAX_PROJECT_LOTS,
  MAX_SEARCH_RESULTS,
  parisToday,
  photosAdvised,
  remainingSlots,
  storedLotTrades,
  type DateSouhaitMode,
  type ZoneMode,
} from "@menao/core";
import type { Database } from "@menao/db";
import {
  parseArtisanProfile,
  projectCriteriaSchema,
  type ProjectCriteriaInput,
} from "@menao/validation";
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
export async function ensureSession(): Promise<boolean> {
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
  /** Description encore vague, sans photo (ADR 0163) : photos conseillées. */
  advisePhotos: boolean;
  /** Chantier à plusieurs métiers (ADR 0167) : projet principal d'un lot, sinon null. */
  parentId: string | null;
  /** Autres métiers proposés d'après la description, et ceux choisis par le particulier. */
  suggestedLots: string[];
  lotTrades: string[];
  criteria: Criteria;
};

/** Projet à vérifier (F-07), lu avec les droits de l'utilisateur (RLS : le sien seulement). */
export async function loadProject(id: string, confidenceThreshold: number) {
  const { data: p } = await supabase
    .from("projects")
    .select(
      "id, description, analyzed_at, ai_confidence, trade_code, lieu_type, room_codes, work_type_codes, surface, budget, parent_project_id, suggested_lots, lot_trades, ville_code_insee, ville_nom, code_postal, adresse, date_mode, date_souhaitee, project_photos(count)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!p) return null;
  const project: ProjectForReview = {
    id: p.id,
    description: p.description,
    analyzed: p.analyzed_at !== null,
    lowConfidence: p.ai_confidence !== null && p.ai_confidence < confidenceThreshold,
    advisePhotos: photosAdvised({
      description: p.description,
      photoCount: p.project_photos[0]?.count ?? 0,
      workTypeCount: p.work_type_codes.length,
      confidence: p.ai_confidence,
    }),
    parentId: p.parent_project_id,
    suggestedLots: storedLotTrades(p.suggested_lots),
    lotTrades: p.lot_trades,
    criteria: {
      tradeCode: p.trade_code,
      lieuType: p.lieu_type,
      roomCodes: p.room_codes,
      workTypeCodes: p.work_type_codes,
      surface: p.surface,
      budget: p.budget,
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

/**
 * Autres métiers du chantier choisis par le particulier (ADR 0167), comme sur le site : créés en
 * lots au lancement de la recherche. Renvoie le message d'erreur à afficher, ou null.
 */
export async function saveProjectLots(
  projectId: string,
  tradeCodes: string[],
): Promise<string | null> {
  if (tradeCodes.length > MAX_PROJECT_LOTS) return fr.review.lots.limit;
  const { error } = await supabase.rpc("set_project_lot_trades", {
    p_project_id: projectId,
    p_trade_codes: tradeCodes,
  });
  return error ? sqlError(error) : null;
}

type LotStartArgs = Database["public"]["Functions"]["set_lot_start"]["Args"];

/**
 * Date de début propre à un lot (ADR 0169), comme sur le site ; mode null : celle du chantier.
 * Renvoie le message d'erreur à afficher, ou null.
 */
export async function saveLotStart(
  projectId: string,
  tradeCode: string,
  dateMode: DateSouhaitMode | null,
  date: string | null,
): Promise<string | null> {
  if (dateMode === "date" && !date) return fr.errors.generic;
  // Les types générés ne marquent pas les paramètres SQL facultatifs comme pouvant être nuls.
  const { error } = await supabase.rpc("set_lot_start", {
    p_project_id: projectId,
    p_trade_code: tradeCode,
    p_date_mode: dateMode,
    p_date: dateMode === "date" ? date : null,
  } as LotStartArgs);
  return error ? sqlError(error) : null;
}

/**
 * Projets d'un chantier à plusieurs métiers (ADR 0167, 0168), projet principal et lots, dans
 * l'ordre habituel des travaux, comme sur le site. Null si le projet est introuvable.
 */
export async function loadChantierProjects(projectId: string): Promise<{
  rootId: string;
  projects: { id: string; tradeCode: string | null; trade: string }[];
} | null> {
  const { data: project } = await supabase
    .from("projects")
    .select("id, parent_project_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;
  const rootId = project.parent_project_id ?? project.id;
  const { data } = await supabase
    .from("projects")
    .select("id, trade_code, trades(label)")
    .or(`id.eq.${rootId},parent_project_id.eq.${rootId}`)
    .order("created_at");
  const projects = (data ?? []).map((p) => ({
    id: p.id,
    tradeCode: p.trade_code,
    trade: p.trades?.label ?? "",
  }));
  return { rootId, projects: inWorkOrder(projects, (p) => p.tradeCode) };
}

/** Photo du projet (F-05), par URL signée (1 h) du bucket privé project-photos. */
export type ProjectPhoto = { id: string; url: string | null };

/** Photos du projet, dans l'ordre d'ajout, comme sur le site (RLS : le propriétaire seulement). */
export async function loadProjectPhotos(projectId: string): Promise<ProjectPhoto[]> {
  const { data: rows } = await supabase
    .from("project_photos")
    .select("id, storage_path")
    .eq("project_id", projectId)
    .order("sort_order")
    .order("created_at");
  const list = rows ?? [];
  const { data: signed } = list.length
    ? await supabase.storage.from("project-photos").createSignedUrls(
        list.map((p) => p.storage_path),
        3600,
      )
    : { data: [] };
  const urls = new Map(
    (signed ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])),
  );
  return list.map((p) => ({ id: p.id, url: urls.get(p.storage_path) ?? null }));
}

/**
 * Suppression d'une photo du projet, comme sur le site : ligne puis fichier, avec les droits du
 * propriétaire (RLS). Renvoie le message d'erreur à afficher, ou null.
 */
export async function deleteProjectPhoto(
  projectId: string,
  photoId: string,
): Promise<string | null> {
  const { data: photo } = await supabase
    .from("project_photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!photo) return fr.errors.generic;
  const { error } = await supabase.from("project_photos").delete().eq("id", photo.id);
  if (error) return fr.errors.generic;
  await supabase.storage.from("project-photos").remove([photo.storage_path]);
  return null;
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
    p_budget: c.budget,
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
    mode: ZoneMode | null;
    radiusKm: number | null;
    city: string | null;
    communes: string[];
  };
  specialties: { code: string; label: string }[];
  /** Badge « Assuré et vérifié » (ADR 0119). */
  verified: boolean;
  /** Score MENAO sur 100 (ADR 0155). */
  score: number | null;
  /** Artisan de la zone élargie (ADR 0165). */
  outsideZone: boolean;
};

/** Partenaire recommandé par un artisan du chantier (ADR 0174) : nom de celui qui recommande. */
export type RecommendedArtisan = { artisan: MatchedArtisan; by: string | null };

export type ProjectResults = {
  tradeLabel: string;
  city: string;
  workTypeCodes: string[];
  artisans: MatchedArtisan[];
  /** Partenaires recommandés (ADR 0174), présentés à part, hors du classement. */
  recommended: RecommendedArtisan[];
  /** Zone élargie (ADR 0165) : montrés seulement quand plus aucun artisan de la zone n'est à contacter. */
  nearby: MatchedArtisan[];
  /**
   * Artisan choisi par le client (« Redemander un devis » ou fiche publique, ADR 0173, 0198) :
   * `preferredId` enregistré sur le projet, `preferred` s'il convient (métier, zone, disponibilité).
   */
  preferredId: string | null;
  preferred: MatchedArtisan | null;
  /** Son prénom, même s'il ne convient pas (« … n'est pas disponible pour cette demande »). */
  preferredName: string | null;
  summary: NeedSummary;
  /** Chantier à plusieurs métiers (ADR 0167) : projet principal d'un lot, sinon null. */
  parentId: string | null;
  /**
   * Autres lots du chantier (projet principal seulement), avec les artisans trouvés et la date de
   * début (ADR 0169) : `own` quand elle est propre au métier, `sent` quand le lot est envoyé.
   */
  lots: {
    id: string;
    tradeCode: string | null;
    trade: string;
    workTypeCodes: string[];
    found: number;
    dateMode: DateSouhaitMode;
    dateSouhaitee: string | null;
    own: boolean;
    sent: boolean;
    /** Artisans de la zone, à cocher pour le même envoi (ADR 0170), et places restantes. */
    artisans: MatchedArtisan[];
    recommended: RecommendedArtisan[];
    requested: Set<string>;
    slots: number;
  }[];
  /** Métiers du chantier dans l'ordre habituel des travaux (ADR 0168). */
  workOrder: string[];
};

/** « Résumé de mon besoin » (maquettes) : métier, ville, date souhaitée et photos du projet. */
export type NeedSummary = {
  tradeLabel: string;
  city: string | null;
  dateMode: Database["public"]["Enums"]["project_date_mode"];
  /** AAAA-MM-JJ, quand une date est choisie. */
  dateSouhaitee: string | null;
  photoCount: number;
};

/** Résumé du besoin d'un projet ; null si le projet n'a pas encore de métier. */
export async function loadNeedSummary(projectId: string): Promise<NeedSummary | null> {
  const [{ data: project }, { count }] = await Promise.all([
    supabase
      .from("projects")
      .select("trade_code, ville_nom, date_mode, date_souhaitee")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("project_photos")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId),
  ]);
  if (!project?.trade_code) return null;
  const { data: trade } = await supabase
    .from("trades")
    .select("label")
    .eq("code", project.trade_code)
    .maybeSingle();
  return {
    tradeLabel: trade?.label ?? project.trade_code,
    city: project.ville_nom,
    dateMode: project.date_mode,
    dateSouhaitee: project.date_souhaitee,
    photoCount: count ?? 0,
  };
}

/**
 * « Envoyer mon dossier à MENAO » (F-09, F-56), comme sur le site : ticket pour l'équipe, avec un
 * message facultatif ; l'e-mail est demandé à une session anonyme. Message d'erreur, ou null.
 */
export async function sendProjectToMenao(
  projectId: string,
  message: string,
  email: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("send_project_to_menao", {
    p_project_id: projectId,
    p_message: message.slice(0, 2000),
    p_contact_email: email.trim(),
  });
  if (!error) return null;
  return error.code === "22023" ? fr.dossier.emailInvalid : fr.errors.generic;
}

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
    verified: row.verified === true,
    score: typeof row.menao_score === "number" ? row.menao_score : null,
    outsideZone: row.hors_zone === true,
  }));
}

/**
 * Artisans proposés pour un projet (F-09) : sélection et classement faits par la base
 * (`match_artisans`, 5 artisans au plus), comme sur le site. Null en cas d'erreur.
 */
export async function loadResults(projectId: string): Promise<ProjectResults | null> {
  const [{ data: project }, summary, artisans, { data: lotRows }] = await Promise.all([
    supabase
      .from("projects")
      .select("work_type_codes, parent_project_id, trade_code, lot_dates, preferred_artisan_id")
      .eq("id", projectId)
      .maybeSingle(),
    loadNeedSummary(projectId),
    matchArtisans(projectId, MAX_SEARCH_RESULTS),
    supabase
      .from("projects")
      .select("id, trade_code, work_type_codes, date_mode, date_souhaitee, trades(label)")
      .eq("parent_project_id", projectId)
      .order("created_at"),
  ]);
  if (!project || !summary || !artisans) return null;
  // Artisan choisi par le client, cherché plus loin dans le classement s'il le faut (ADR 0040).
  const preferredId = project.preferred_artisan_id;
  const preferred = !preferredId
    ? null
    : (artisans.find((a) => a.id === preferredId && !a.outsideZone) ??
      ((await matchArtisans(projectId, MAX_SEARCH_RESULTS + 20)) ?? []).find(
        (a) => a.id === preferredId && !a.outsideZone,
      ) ??
      null);
  const preferredName =
    preferred?.name ??
    (preferredId
      ? (parseArtisanProfile(
          (await supabase.rpc("artisan_public_profile", { p_artisan_id: preferredId })).data,
        )?.display_name ?? null)
      : null);
  const orderedLots = inWorkOrder(lotRows ?? [], (lot) => lot.trade_code);
  // Partenaires recommandés par un artisan du chantier (ADR 0174), comme sur le site.
  const [{ data: recRows }, { data: myRequests }] = await Promise.all([
    supabase
      .from("partner_recommendations")
      .select("project_id, to_artisan_id, request_id")
      .in("project_id", [projectId, ...orderedLots.map((l) => l.id)])
      .eq("status", "proposee"),
    supabase.rpc("particulier_requests"),
  ]);
  const recommendedFor = async (id: string, pool: MatchedArtisan[]) => {
    const recs = (recRows ?? []).filter((r) => r.project_id === id);
    if (recs.length === 0) return [];
    const rows = recs.every((r) => pool.some((a) => a.id === r.to_artisan_id))
      ? pool
      : ((await matchArtisans(id, 50)) ?? []);
    return recs.flatMap((rec) => {
      const artisan = rows.find((a) => a.id === rec.to_artisan_id && !a.outsideZone);
      const by = (myRequests ?? []).find((r) => r.request_id === rec.request_id)?.artisan_name;
      return artisan ? [{ artisan, by: by ?? null }] : [];
    });
  };
  const recommended = await recommendedFor(projectId, artisans);
  const recommendedIds = new Set(recommended.map((r) => r.artisan.id));
  const { data: sentRows } = orderedLots.length
    ? await supabase
        .from("requests")
        .select("project_id, artisan_id, status")
        .in(
          "project_id",
          orderedLots.map((l) => l.id),
        )
    : { data: [] };
  const lots = await Promise.all(
    orderedLots.map(async (lot) => {
      const found = (await matchArtisans(lot.id, MAX_SEARCH_RESULTS)) ?? [];
      const rows = (sentRows ?? []).filter((r) => r.project_id === lot.id);
      const lotRecommended = await recommendedFor(lot.id, found);
      const lotRecommendedIds = new Set(lotRecommended.map((r) => r.artisan.id));
      return {
        id: lot.id,
        tradeCode: lot.trade_code,
        trade: lot.trades?.label ?? "",
        workTypeCodes: lot.work_type_codes,
        found: found.length,
        dateMode: lot.date_mode,
        dateSouhaitee: lot.date_souhaitee,
        own: lot.trade_code !== null && lotStart(project.lot_dates, lot.trade_code) !== null,
        sent: rows.length > 0,
        artisans: found.filter((a) => !a.outsideZone && !lotRecommendedIds.has(a.id)),
        recommended: lotRecommended,
        requested: new Set(rows.map((r) => r.artisan_id)),
        slots: remainingSlots(rows.map((r) => r.status)),
      };
    }),
  );
  return {
    tradeLabel: summary.tradeLabel,
    city: summary.city ?? "",
    workTypeCodes: project.work_type_codes,
    // Artisan choisi en tête, comme sur le site (ADR 0173).
    artisans: [
      ...(preferred && !recommendedIds.has(preferred.id) ? [preferred] : []),
      ...artisans.filter(
        (a) => !a.outsideZone && !recommendedIds.has(a.id) && a.id !== preferredId,
      ),
    ].slice(0, MAX_SEARCH_RESULTS),
    recommended,
    nearby: artisans.filter((a) => a.outsideZone),
    preferredId,
    preferred,
    preferredName,
    summary,
    parentId: project.parent_project_id,
    lots,
    workOrder: inWorkOrder(
      [
        { code: project.trade_code, label: summary.tradeLabel },
        ...orderedLots.map((l) => ({ code: l.trade_code, label: l.trades?.label ?? "" })),
      ],
      (x) => x.code,
    )
      .map((x) => x.label)
      .filter(Boolean),
  };
}
