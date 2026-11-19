"use server";

import {
  INTERVIEW_CRITERIA,
  RECRUITMENT_MEETING_DURATIONS,
  RECRUITMENT_STAGES,
  isMeetingUrl,
  normalizeInterviewGrid,
  parisLocalToDate,
} from "@menao/core";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireAdmin } from "@/lib/admin/guard";

const t = fr.admin.candidates;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LIST = "/admin/candidats";
const MEETINGS = "/admin/candidats/reunions";
const detail = (id: string) => `${LIST}/${id}`;
const failure = (error: { code?: string; message: string }) => ({
  error: error.code === "22023" ? error.message : t.errors.generic,
});

/** Grille d'entretien (six critères notés de 1 à 5) et notes, sur la fiche du candidat. */
export async function saveInterviewGrid(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "candidate") ?? "";
  if (!UUID.test(id)) return { error: t.errors.generic };
  const grid = normalizeInterviewGrid(
    Object.fromEntries(INTERVIEW_CRITERIA.map((k) => [k, text(formData, k)])),
  );
  const notes = (text(formData, "notes") ?? "").trim().slice(0, 4000) || null;
  const { supabase, userId } = await requireAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("commercial_candidates")
    .update({
      interview_grid: grid,
      interview_notes: notes,
      interviewed_by: userId,
      interviewed_at: now,
      last_contact_at: now,
    })
    .eq("id", id);
  if (error) return failure(error);
  revalidatePath(detail(id));
  return { success: t.detail.saved };
}

/** Étape choisie à la main (appel, entretien, retenu…). « Non retenu » passe par l'e-mail poli. */
export async function setCandidateStage(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "candidate") ?? "";
  const stage = RECRUITMENT_STAGES.find((s) => s === text(formData, "stage"));
  if (!UUID.test(id) || !stage || stage === "non_retenu") return { error: t.errors.generic };
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("commercial_candidates")
    .update({ stage, last_contact_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return failure(error);
  revalidatePath(detail(id));
  revalidatePath(LIST);
  return { success: t.detail.stageSaved };
}

/** Candidat non retenu : réponse polie par e-mail (admin_decline_candidate). */
export async function declineCandidate(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "candidate") ?? "";
  if (!UUID.test(id)) return { error: t.errors.generic };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_decline_candidate", { p_id: id });
  if (error) return failure(error);
  revalidatePath(detail(id));
  revalidatePath(LIST);
  return { success: t.detail.declined };
}

/** Lien de démo de l'espace conseiller envoyé par e-mail (le lien doit être activé). */
export async function sendCandidateDemo(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "candidate") ?? "";
  if (!UUID.test(id)) return { error: t.errors.generic };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_send_candidate_demo", { p_id: id });
  if (error) return failure(error);
  revalidatePath(detail(id));
  return { success: t.detail.demoSent };
}

/** Présence à la réunion, cochée par l'équipe : un présent passe à l'étape « Entretien ». */
export async function markAttendance(formData: FormData): Promise<void> {
  const id = text(formData, "candidate") ?? "";
  const attendance = text(formData, "attendance");
  if (!UUID.test(id) || (attendance !== "present" && attendance !== "absent")) return;
  const { supabase } = await requireAdmin();
  await supabase
    .from("commercial_candidates")
    .update({
      attendance,
      ...(attendance === "present" ? { stage: "entretien" } : {}),
      last_contact_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath(MEETINGS);
  revalidatePath(LIST);
}

/** Nouvelle réunion d'information : date et heure de Paris, durée, places, lien de visio. */
export async function createMeeting(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    date: text(formData, "date") ?? "",
    time: text(formData, "time") ?? "",
    duration: text(formData, "duration") ?? "30",
    capacity: text(formData, "capacity") ?? "10",
    url: (text(formData, "url") ?? "").trim(),
  };
  const m = t.meetings.errors;
  const fieldErrors: Record<string, string[]> = {};
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(values.date) && /^\d{2}:\d{2}$/.test(values.time);
  const start = ok ? parisLocalToDate(values.date, values.time) : null;
  if (!start || Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    fieldErrors.date = [m.date];
  }
  if (!isMeetingUrl(values.url)) fieldErrors.url = [m.url];
  const duration = RECRUITMENT_MEETING_DURATIONS.find((d) => String(d) === values.duration) ?? 30;
  const capacity = Math.min(Math.max(Number.parseInt(values.capacity, 10) || 10, 1), 50);
  if (Object.keys(fieldErrors).length || !start) return { fieldErrors, values };
  const { supabase, userId } = await requireAdmin();
  const { error } = await supabase.from("recruitment_meetings").insert({
    starts_at: start.toISOString(),
    duration_minutes: duration,
    capacity,
    meet_url: values.url,
    created_by: userId,
  });
  if (error) return { ...failure(error), values };
  revalidatePath(MEETINGS);
  revalidatePath(LIST);
  return { success: t.meetings.created };
}

/** Réunion annulée : les inscrits sont prévenus par e-mail et peuvent en choisir une autre. */
export async function cancelMeeting(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "meeting") ?? "";
  if (!UUID.test(id)) return { error: t.errors.generic };
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_cancel_recruitment_meeting", { p_id: id });
  if (error) return failure(error);
  revalidatePath(MEETINGS);
  revalidatePath(LIST);
  return { success: t.meetings.cancelDone(data ?? 0) };
}

/** « Inviter comme commercial » : l'invitation des commerciaux, déjà remplie. */
export async function inviteCandidate(formData: FormData): Promise<void> {
  const id = text(formData, "candidate") ?? "";
  if (!UUID.test(id)) return;
  redirect(`/admin/commerciaux?candidat=${id}#inviter` as Route);
}
