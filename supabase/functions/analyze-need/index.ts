// Edge Function analyze-need (F-06) : analyse le besoin saisi par le particulier (session
// anonyme acceptée), crée le projet et renvoie son identifiant. Sorties structurées validées
// par Zod ; modèle de secours si la réponse est invalide ou peu sûre ; repli sur un projet
// sans analyse si tout échoue. Jamais d'e-mail, de téléphone ni de nom envoyé au modèle.
// Avec `projectId` (F-07, ADR 0044) : nouvelle description d'un projet pas encore envoyé ; la
// nouvelle analyse complète les critères encore vides, sans remplacer un choix déjà fait.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PROJECT_TEXT_MAX_LENGTH,
  completeCriteria,
  compositeTrades,
  parisToday,
  scrubPersonalData,
  suggestedLots,
  type CompletedSection,
  type NeedCriteria,
} from "../../../packages/core/src/project.ts";
import { normalizePartnerCode } from "../../../packages/core/src/partners.ts";
import { llmConfig, logAiRuns, withinHourlyLimits, type AiRun } from "../_shared/ai.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { geocodeAddress, geocodeCommune } from "../_shared/geocoding.ts";
import { withCors } from "../_shared/cors.ts";
import {
  analyzeNeed,
  needUserContent,
  type Attempt,
  type Labeled,
  type Referentials,
} from "./analysis.ts";

const MAX_PER_HOUR = 20;

async function loadReferentials(admin: SupabaseClient): Promise<Referentials> {
  const [trades, works, rooms] = await Promise.all([
    admin.from("trades").select("code, label").eq("active", true).order("sort_order"),
    admin
      .from("work_types")
      .select("code, label, trade_code")
      .eq("active", true)
      .order("sort_order"),
    admin.from("rooms").select("code, label").eq("active", true).order("sort_order"),
  ]);
  if (trades.error || works.error || rooms.error) throw new Error("référentiels indisponibles");
  const workTypeLabels = (works.data ?? []).map((w) => ({
    code: w.code as string,
    label: w.label as string,
    trade: w.trade_code as string,
  }));
  return {
    trades: (trades.data ?? []).map((t) => t.code as string),
    workTypes: workTypeLabels.map((w) => ({ code: w.code, trade: w.trade })),
    rooms: (rooms.data ?? []).map((r) => r.code as string),
    tradeLabels: (trades.data ?? []) as Labeled[],
    workTypeLabels,
    roomLabels: (rooms.data ?? []) as Labeled[],
  };
}

/** Retire aussi les prénom et nom du compte s'ils apparaissent dans le texte. */
function scrub(text: string, names: (string | null)[]): string {
  let clean = scrubPersonalData(text);
  for (const name of names) {
    if (!name || name.trim().length < 2) continue;
    const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    clean = clean.replace(new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, "giu"), "[nom]");
  }
  return clean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Lot proposé, tel qu'enregistré dans `projects.suggested_lots` (ADR 0167). */
type StoredLot = { trade_code: string; work_type_codes: string[] };

/** Projet modifiable (pas encore envoyé) dont la description change. */
type EditedProject = {
  id: string;
  status: string;
  trade_code: string | null;
  lieu_type: NeedCriteria["lieuType"];
  room_codes: string[];
  work_type_codes: string[];
  surface: NeedCriteria["surface"];
  budget: NeedCriteria["budget"];
  ville_code_insee: string | null;
  adresse: string | null;
  date_mode: NeedCriteria["dateMode"];
  date_souhaitee: string | null;
};
const EDITABLE_STATUSES = ["brouillon", "criteres_valides"];

type PreviousProject = {
  trade_code: string | null;
  ville_code_insee: string | null;
  ville_nom: string | null;
  code_postal: string | null;
  ville_location: unknown;
  adresse: string | null;
  location: unknown;
};

/**
 * « Redemander un devis » (F-12, ADR 0040) : chantier précédent du particulier avec cet artisan.
 * Sans chantier commun, la demande est une recherche ordinaire.
 */
async function previousProject(
  admin: ReturnType<typeof adminClient>,
  userId: string,
  artisanId: unknown,
  chantierId: unknown,
): Promise<PreviousProject | null> {
  if (typeof artisanId !== "string" || typeof chantierId !== "string") return null;
  if (!UUID.test(artisanId) || !UUID.test(chantierId)) return null;
  const { data } = await admin
    .from("chantiers")
    .select(
      "projects(trade_code, ville_code_insee, ville_nom, code_postal, ville_location, adresse, location)",
    )
    .eq("id", chantierId)
    .eq("particulier_id", userId)
    .eq("artisan_id", artisanId)
    .maybeSingle();
  const project = (data as { projects: PreviousProject | null } | null)?.projects;
  return project ?? null;
}

const point = (lon: number, lat: number) => `SRID=4326;POINT(${lon} ${lat})`;

/**
 * Enregistre la nouvelle description (ADR 0044). Analyse réussie : résumé et indices d'urgence
 * renouvelés, critères encore vides complétés ; une ville ou une adresse n'est reprise que si
 * elle est trouvée par le géocodage. Renvoie les cartes complétées, ou null si le projet a été
 * envoyé entre-temps.
 */
async function updateProject(
  admin: ReturnType<typeof adminClient>,
  edited: EditedProject,
  description: string,
  best: Attempt,
  lots: StoredLot[],
): Promise<CompletedSection[] | null> {
  // Sans nouvelle analyse, l'ancienne reformulation ne correspond plus au texte : retirée. Les
  // lots proposés suivent la nouvelle description ; le choix du particulier reste.
  const patch: Record<string, unknown> = {
    description,
    artisan_brief: null,
    suggested_lots: lots,
  };
  let completed: CompletedSection[] = [];
  if (best) {
    const c = best.criteria;
    const needsPlace = edited.ville_code_insee === null || edited.adresse === null;
    const commune = needsPlace && c.ville ? await geocodeCommune(c.ville, c.codePostal) : null;
    // Pas de ville dans le texte : l'adresse est cherchée dans la ville déjà choisie.
    const placeCode = commune?.code ?? (c.ville ? null : edited.ville_code_insee);
    const address =
      placeCode && c.adresse && edited.adresse === null
        ? await geocodeAddress(c.adresse, placeCode)
        : null;
    const done = completeCriteria(
      {
        tradeCode: edited.trade_code,
        lieuType: edited.lieu_type,
        roomCodes: edited.room_codes,
        workTypeCodes: edited.work_type_codes,
        surface: edited.surface,
        villeCodeInsee: edited.ville_code_insee,
        adresse: edited.adresse,
        dateMode: edited.date_mode,
        dateSouhaitee: edited.date_souhaitee,
      },
      c,
      { villeCode: placeCode, adresse: address?.label ?? null },
    );
    completed = done.completed;
    Object.assign(patch, {
      ai_analysis: best.raw,
      ai_model: best.model,
      ai_confidence: Math.round(c.confiance * 100) / 100,
      analyzed_at: new Date().toISOString(),
      summary: c.summary,
      // Demande reformulée pour l'artisan (ADR 0163), renouvelée avec la description ; budget
      // repris du texte seulement s'il n'a pas encore été choisi.
      artisan_brief: c.artisanBrief,
      budget: edited.budget ?? c.budget,
      urgence: c.urgence,
      trade_code: done.tradeCode,
      lieu_type: done.lieuType,
      room_codes: done.roomCodes,
      work_type_codes: done.workTypeCodes,
      surface: done.surface,
      date_mode: done.dateMode,
      date_souhaitee: done.dateSouhaitee,
    });
    if (done.takeVille && commune) {
      Object.assign(patch, {
        ville_code_insee: commune.code,
        ville_nom: commune.nom,
        code_postal: commune.postcode,
        ville_location:
          commune.lon != null && commune.lat != null ? point(commune.lon, commune.lat) : null,
      });
    }
    if (done.takeAdresse && address) {
      Object.assign(patch, { adresse: address.label, location: point(address.lon, address.lat) });
    }
    // Critères changés : à valider de nouveau, comme après save_project_criteria.
    if (completed.length) {
      Object.assign(patch, { status: "brouillon", criteria_validated_at: null });
    }
  }
  const { data, error } = await admin
    .from("projects")
    .update(patch)
    .eq("id", edited.id)
    .in("status", EDITABLE_STATUSES)
    .select("id");
  if (error) throw error;
  return data?.length ? completed : null;
}

Deno.serve(
  withCors(async (req) => {
    if (req.method !== "POST") return new Response(null, { status: 405 });

    const admin = adminClient();
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    const { data: userData } = token ? await admin.auth.getUser(token) : { data: null };
    const user = userData?.user;
    if (!user) return json({ status: "forbidden" }, 401);

    const body = (await req.json().catch(() => null)) as {
      description?: unknown;
      tradeHint?: unknown;
      preferredArtisanId?: unknown;
      fromChantierId?: unknown;
      projectId?: unknown;
      partnerCode?: unknown;
    } | null;
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    if (description.length === 0 || description.length > PROJECT_TEXT_MAX_LENGTH) {
      return json({ status: "invalid" }, 400);
    }

    // Nouvelle description d'un projet existant : le sien, pas encore envoyé aux artisans.
    let edited: EditedProject | null = null;
    if (body?.projectId !== undefined) {
      if (typeof body.projectId !== "string" || !UUID.test(body.projectId)) {
        return json({ status: "invalid" }, 400);
      }
      const { data } = await admin
        .from("projects")
        .select(
          "id, status, trade_code, lieu_type, room_codes, work_type_codes, surface, budget, ville_code_insee, adresse, date_mode, date_souhaitee",
        )
        .eq("id", body.projectId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) return json({ status: "forbidden" }, 404);
      edited = data as EditedProject;
      if (!EDITABLE_STATUSES.includes(edited.status)) return json({ status: "locked" }, 409);
    }

    if (
      !(await withinHourlyLimits(admin, "analyze-need", user.id, req, MAX_PER_HOUR, MAX_PER_HOUR))
    ) {
      return json({ status: "rate_limited" }, 429);
    }

    try {
      const ref = await loadReferentials(admin);
      const previous = edited
        ? null
        : await previousProject(admin, user.id, body?.preferredArtisanId, body?.fromChantierId);
      // Métier déjà retenu pour le projet modifié, sinon métier choisi, sinon celui du chantier
      // précédent (« Redemander un devis »).
      const hint =
        edited?.trade_code ??
        (typeof body?.tradeHint === "string" ? body.tradeHint : previous?.trade_code);
      const tradeHint = hint && ref.trades.includes(hint) ? hint : null;
      const today = parisToday();

      const { data: profile } = await admin
        .from("profiles")
        .select("first_name, last_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const clean = scrub(description, [profile?.first_name ?? null, profile?.last_name ?? null]);
      const userContent = needUserContent(today, tradeHint, clean);

      const runs: AiRun[] = [];
      let best: Attempt = null;
      const llm = llmConfig();
      if (llm) {
        best = await analyzeNeed(llm, ref, userContent, today, tradeHint, runs);
      } else {
        console.error("analyze-need : aucune clé de modèle configurée");
      }

      const c = best?.criteria;
      // Chantier à plusieurs métiers (ADR 0167) : métiers complémentaires de l'IA, puis ceux des
      // chantiers composés relevés dans la description.
      const lots: StoredLot[] = suggestedLots(
        edited?.trade_code ?? c?.tradeCode ?? tradeHint,
        c?.extraTrades ?? [],
        compositeTrades(clean, ref.trades),
      ).map((l) => ({ trade_code: l.tradeCode, work_type_codes: l.workTypeCodes }));
      if (edited) {
        const completed = await updateProject(admin, edited, description, best, lots);
        await logAiRuns(
          admin,
          runs.map((r) => ({ ...r, project_id: edited.id })),
        );
        if (!completed) return json({ status: "locked" }, 409);
        return json({ status: "ok", projectId: edited.id, analysed: best !== null, completed });
      }
      const commune = c?.ville ? await geocodeCommune(c.ville, c.codePostal) : null;
      const address = commune && c?.adresse ? await geocodeAddress(c.adresse, commune.code) : null;
      // Aucune ville dans la description : adresse du chantier précédent, modifiable aux critères.
      const place =
        !commune && previous?.ville_code_insee
          ? {
              ville_code_insee: previous.ville_code_insee,
              ville_nom: previous.ville_nom,
              code_postal: previous.code_postal,
              ville_location: previous.ville_location,
              adresse: previous.adresse,
              location: previous.location,
            }
          : {
              ville_code_insee: commune?.code ?? null,
              ville_nom: commune?.nom ?? null,
              code_postal: commune?.postcode ?? null,
              ville_location:
                commune?.lon != null && commune.lat != null
                  ? `SRID=4326;POINT(${commune.lon} ${commune.lat})`
                  : null,
              adresse: address?.label ?? null,
              location: address ? `SRID=4326;POINT(${address.lon} ${address.lat})` : null,
            };

      const { data: project, error } = await admin
        .from("projects")
        .insert({
          user_id: user.id,
          description,
          ai_analysis: best?.raw ?? null,
          ai_model: best?.model ?? null,
          ai_confidence: c ? Math.round(c.confiance * 100) / 100 : null,
          analyzed_at: best ? new Date().toISOString() : null,
          summary: c?.summary ?? null,
          artisan_brief: c?.artisanBrief ?? null,
          budget: c?.budget ?? null,
          suggested_lots: lots,
          trade_code: c?.tradeCode ?? tradeHint,
          lieu_type: c?.lieuType ?? null,
          room_codes: c?.roomCodes ?? [],
          work_type_codes: c?.workTypeCodes ?? [],
          surface: c?.surface ?? null,
          ...place,
          preferred_artisan_id: previous ? body?.preferredArtisanId : null,
          date_mode: c?.dateMode ?? "inconnue",
          date_souhaitee: c?.dateSouhaitee ?? null,
          urgence: c?.urgence ?? false,
        })
        .select("id")
        .single();
      if (error || !project) throw error ?? new Error("projet non créé");

      // Programme Partenaires (F-59) : projet arrivé par un lien partenaire (code lu dans
      // l'adresse, sans traceur). Un code inconnu ou une erreur n'empêche jamais le projet.
      const partnerCode = normalizePartnerCode(body?.partnerCode);
      if (partnerCode) {
        const { error: partnerError } = await admin.rpc("attribute_project_partner", {
          p_project_id: project.id,
          p_code: partnerCode,
        });
        if (partnerError) console.error("analyze-need : attribution partenaire impossible");
      }

      await logAiRuns(
        admin,
        runs.map((r) => ({ ...r, project_id: project.id as string })),
      );
      return json({ status: "ok", projectId: project.id, analysed: best !== null });
    } catch (error) {
      console.error("analyze-need : erreur", error instanceof Error ? error.name : "");
      return json({ status: "unavailable" }, 503);
    }
  }),
);
