import {
  parisToday,
  parseAiAgents,
  parsePlanUsage,
  planContents,
  voiceGauge,
  type AiAgentsRights,
  type PlanCode,
  type PlanContents,
  type VoiceGauge,
} from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { fr } from "@/i18n/fr";
import { examplesActive } from "./examples";
import {
  stopView,
  termView,
  type StopView,
  type TermSubscription,
  type TermView,
} from "./subscription-term-view";
import { supabase } from "./supabase";
import { loadTeam, myArtisanKey } from "./team";

/**
 * Formule de l'artisan dans l'application (F-172, ADR 0363) : ce qu'elle comprend et les compteurs
 * du mois, à partir du comparatif de la base (plan_features) et des droits accordés
 * (my_ai_agents). Jamais de prix ni d'achat ici (CLAUDE.md règle 10).
 */

const t = fr.proPlan;
const PLAN_CODES: readonly PlanCode[] = ["base", "premium", "entreprise"];
const SUBSCRIPTION_TERM_COLUMNS =
  "status, trial_end, cancel_at_period_end, current_period_end, cancel_at, engagement_version, essai_demarre_le, arret_effet_le";

/** Droits de la formule en cours ; ceux de Base sans formule. null en cas d'erreur. */
export async function loadPlanRights(): Promise<AiAgentsRights | null> {
  const { data, error } = await supabase.rpc("my_ai_agents");
  return error ? null : parseAiAgents(data).agents;
}

export type MyPlan = {
  /** Formule en cours ; null : aucune, les droits de Base s'appliquent. */
  code: PlanCode | null;
  name: string;
  state: string;
  /** Engagement d'un an (ADR 0383) : dates qui comptent et arrêt possible ; null sans abonnement. */
  term: TermView | null;
  requests: { received: number; limit: number | null };
  voice: VoiceGauge | null;
  seats: { used: number; total: number } | null;
  /** Formule dont l'écran montre le contenu : Base sans formule en cours. */
  column: PlanCode;
  groups: PlanContents["groups"];
  excluded: string[];
  /** Lignes comprises, et lignes « en plus » de Base (lot 71, ADR 0369). */
  included: number;
  added: number;
};

export async function loadMyPlan(): Promise<MyPlan | null> {
  if (examplesActive()) return null;
  const artisanId = await myArtisanKey();
  const [agentsResult, usageResult, features, plans, subscription, team] = await Promise.all([
    supabase.rpc("my_ai_agents"),
    supabase.rpc("my_plan_usage"),
    supabase.from("plan_features").select("categorie, libelle, valeurs, ordre").order("ordre"),
    supabase.from("plans").select("code, nom"),
    supabase
      .from("subscriptions")
      .select(SUBSCRIPTION_TERM_COLUMNS)
      .eq("artisan_id", artisanId)
      .maybeSingle(),
    loadTeam(),
  ]);
  if (agentsResult.error || features.error) return null;
  const agents = parseAiAgents(agentsResult.data);
  const usage = parsePlanUsage(usageResult.data);
  const code = PLAN_CODES.find((p) => p === agents.plan) ?? null;
  // Sans formule en cours : les droits de Base (app.artisan_agents).
  const column = code ?? "base";
  const { groups, excluded, included, added } = planContents(features.data ?? [], column);
  const sub = subscription.data as TermSubscription | null;
  const term = code && sub ? termView(sub, parisToday()) : null;
  const state = !code ? t.states.none : (term?.state ?? t.states.active);
  const gauge = voiceGauge(agents);
  return {
    code,
    name: code
      ? ((plans.data ?? []).find((p) => p.code === code)?.nom ?? t.names[code])
      : t.names.none,
    state,
    term,
    requests: usage.requests,
    voice: gauge.level === "sans_voix" ? null : gauge,
    seats: team ? { used: team.used, total: team.seats } : null,
    column,
    groups,
    excluded,
    included,
    added,
  };
}

/** Nom de la formule, pour la ligne « Ma formule » de « Mon profil » ; null sans formule. */
export async function loadPlanName(): Promise<string | null> {
  if (examplesActive()) return null;
  const { data, error } = await supabase.rpc("my_ai_agents");
  if (error) return null;
  const code = PLAN_CODES.find((p) => p === parseAiAgents(data).plan);
  return code ? t.names[code] : null;
}

/** « Arrêter mon abonnement » (ADR 0383) : ce que l'écran propose ; null en cas d'erreur. */
export async function loadStopView(): Promise<StopView | null> {
  if (examplesActive()) return { kind: "closed" };
  const artisanId = await myArtisanKey();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_TERM_COLUMNS)
    .eq("artisan_id", artisanId)
    .maybeSingle();
  if (error) return null;
  return stopView(data as TermSubscription | null, parisToday());
}

export type StopReason = "demandes" | "prix" | "activite" | "autre";

/** Demande l'arrêt (billing-cancel) ; le message d'erreur à afficher, ou null si c'est fait. */
export async function stopSubscription(motif: StopReason | null): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke<{ status: string }>("billing-cancel", {
    method: "POST",
    body: motif ? { motif } : {},
  });
  if (data?.status === "ok") return null;
  const errors: Record<string, string> = t.stopErrors;
  let status = data?.status;
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { status?: string } | null;
    status = body?.status ?? status;
  }
  return (status && errors[status]) || (errors.unavailable ?? fr.errors.generic);
}
