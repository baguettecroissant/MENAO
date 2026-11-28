"use server";

import {
  TOUR_MAX_STOPS,
  isTourDuration,
  isTourOutcome,
  isTourTrade,
  isValidStart,
  outcomeNextAction,
  planTour,
  tourApeCodes,
  TOUR_DURATIONS,
  type TourDuration,
  type TourOutcome,
} from "@menao/core";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCommercialSpace } from "./space";

const TOUR = "/commercial/tournee";
const DAY = "/commercial/journee";
const uuid = z.uuid();

/** Arrêt proposé, tel qu'il est montré dans la préparation. */
export type TourCandidateView = {
  id: string;
  nom: string;
  ape: string | null;
  commune: string | null;
  lat: number;
  lng: number;
  mine: boolean;
  rge: boolean;
};

export type TourProposal =
  | {
      status: "ok";
      stops: TourCandidateView[];
      others: TourCandidateView[];
      meters: number;
      minutes: number;
    }
  | { status: "empty" }
  | { status: "error" };

async function activeSpace() {
  const space = await getCommercialSpace();
  return space.active && !space.demo ? space : null;
}

/**
 * Proposition de tournée (F-194, ADR 0394) : les prospects autour du départ, choisis et mis dans
 * l'ordre par planTour (@menao/core). Le point de départ n'est ni enregistré ni journalisé.
 */
export async function proposeTour(input: {
  lat: number;
  lng: number;
  trades: string[];
  duration: string;
}): Promise<TourProposal> {
  const start = { lat: Number(input?.lat), lng: Number(input?.lng) };
  const trades = Array.isArray(input?.trades) ? input.trades.filter(isTourTrade) : [];
  if (!isValidStart(start) || !trades.length || !isTourDuration(input?.duration)) {
    return { status: "error" };
  }
  const duration: TourDuration = input.duration;
  const space = await getCommercialSpace();
  if (!space.active) return { status: "error" };
  const { data, error } = await space.supabase.rpc("commercial_tour_candidates", {
    p_lat: start.lat,
    p_lng: start.lng,
    p_ape: tourApeCodes(trades),
    p_radius_m: TOUR_DURATIONS[duration].radiusMeters,
  });
  if (error) return { status: "error" };
  const candidates: TourCandidateView[] = (data ?? [])
    .filter((r) => typeof r.lat === "number" && typeof r.lng === "number")
    .map((r) => ({
      id: r.id,
      nom: r.nom,
      ape: r.ape_code,
      commune: r.commune,
      lat: r.lat,
      lng: r.lng,
      mine: r.mine,
      rge: r.rge,
    }));
  const plan = planTour(start, candidates, duration);
  if (!plan.stops.length) return { status: "empty" };
  return {
    status: "ok",
    stops: plan.stops,
    others: plan.others.slice(0, 20),
    meters: plan.meters,
    minutes: plan.minutes,
  };
}

/** Commencer la tournée : les arrêts dans l'ordre choisi ; ouvre la tournée en cours. */
export async function startTour(input: {
  ids: string[];
  trades: string[];
  duration: string;
  meters: number;
}): Promise<{ status: "error" | "not_free" }> {
  const ids = Array.isArray(input?.ids) ? input.ids.filter((id) => uuid.safeParse(id).success) : [];
  const trades = Array.isArray(input?.trades) ? input.trades.filter(isTourTrade) : [];
  if (!ids.length || ids.length > TOUR_MAX_STOPS || !isTourDuration(input?.duration)) {
    return { status: "error" };
  }
  const space = await activeSpace();
  if (!space) return { status: "error" };
  const { error } = await space.supabase.rpc("commercial_start_tour", {
    p_prospects: ids,
    p_metiers: trades,
    p_duree: input.duration,
    p_distance_m: Math.max(0, Math.min(200_000, Math.round(Number(input.meters) || 0))),
  });
  if (error) return { status: error.code === "22023" ? "not_free" : "error" };
  revalidatePath(TOUR);
  revalidatePath(DAY);
  redirect(TOUR as Route);
}

/**
 * Suite d'une visite. Absent : relance proposée par outcomeNextAction ; à rappeler : la date
 * choisie (à défaut, le lendemain à 18 h).
 */
export async function recordStopOutcome(input: {
  tourId: string;
  prospectId: string;
  outcome: string;
  nextActionAt?: string | null;
}): Promise<{ status: "ok" | "error" | "date" }> {
  if (!uuid.safeParse(input?.tourId).success || !uuid.safeParse(input?.prospectId).success) {
    return { status: "error" };
  }
  if (!isTourOutcome(input.outcome)) return { status: "error" };
  const outcome: TourOutcome = input.outcome;
  let next: Date | null = outcomeNextAction(outcome);
  if (outcome === "a_rappeler" && input.nextActionAt) {
    const chosen = new Date(input.nextActionAt);
    if (Number.isNaN(chosen.getTime())) return { status: "date" };
    next = chosen;
  }
  const space = await activeSpace();
  if (!space) return { status: "error" };
  const { error } = await space.supabase.rpc("commercial_tour_outcome", {
    p_tour: input.tourId,
    p_prospect: input.prospectId,
    p_outcome: outcome,
    p_next_action_at: next?.toISOString(),
  });
  if (error) return { status: error.message.startsWith("Date") ? "date" : "error" };
  revalidatePath(TOUR);
  revalidatePath(DAY);
  return { status: "ok" };
}

/** Terminer la tournée, puis le bilan. */
export async function endTour(tourId: string): Promise<void> {
  if (!uuid.safeParse(tourId).success) return;
  const space = await activeSpace();
  if (!space) return;
  const { error } = await space.supabase.rpc("commercial_end_tour", { p_tour: tourId });
  if (error) return;
  revalidatePath(TOUR);
  revalidatePath(DAY);
  redirect(`${TOUR}/${tourId}` as Route);
}
