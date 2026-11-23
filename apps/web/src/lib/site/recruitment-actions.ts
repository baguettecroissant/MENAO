"use server";

import { commercialApplicationSchema } from "@menao/validation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { checkbox, text, type FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";
import { openMeetings, type MeetingSlot } from "./recruitment";

const FIELDS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "sector",
  "legal_status",
  "sees_artisans",
  "experience",
  "availability",
  "source",
  "motivation",
  "linkedin_url",
  "cv_path",
] as const;

export type ApplicationState = FormState & {
  token?: string;
  firstName?: string;
  email?: string;
};

/**
 * Candidature « Devenir commercial MENAO » (F-183, ADR 0380 et 0382) : contrôlée ici, puis en base
 * (`apply_as_commercial`, limites d'envoi), avec le CV, s'il y en a un (facultatif, ADR 0386), déjà
 * rangé par process-upload dans le dossier de la session anonyme du navigateur. Plus de réservation de réunion juste après l'envoi
 * (lot 79) : le candidat voit la confirmation, l'équipe lit son CV.
 */
export async function applyAsCommercial(
  _prev: ApplicationState,
  formData: FormData,
): Promise<ApplicationState> {
  const values: Record<string, string> = Object.fromEntries(
    FIELDS.map((k) => [k, text(formData, k) ?? ""]),
  );
  const consent = checkbox(formData, "consent");
  if (consent) values.consent = "on";
  const parsed = commercialApplicationSchema.safeParse({ ...values, consent });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const d = parsed.data;
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("apply_as_commercial", {
    p_first_name: d.first_name,
    p_last_name: d.last_name,
    p_email: d.email,
    p_phone: d.phone,
    p_sector: d.sector,
    p_legal_status: d.legal_status,
    p_sees_artisans: d.sees_artisans,
    p_experience: d.experience,
    p_availability: d.availability,
    p_source: d.source,
    p_motivation: d.motivation ?? "",
    p_consent: true,
    p_cv_path: d.cv_path ?? "",
    p_linkedin_url: d.linkedin_url ?? undefined,
  });
  if (error || !token) {
    return { error: error?.code === "22023" ? error.message : fr.errors.generic, values };
  }
  return {
    success: fr.pages.recruitment.meeting.sent,
    token,
    firstName: d.first_name,
    email: d.email,
  };
}

const uuid = z.uuid();

export type BookingResult = { error?: string; startsAt?: string; durationMinutes?: number };

/** Réservation (ou changement) de la réunion d'information, avec le jeton de la candidature. */
export async function bookRecruitmentMeeting(
  token: string,
  meetingId: string,
): Promise<BookingResult> {
  if (!uuid.safeParse(token).success || !uuid.safeParse(meetingId).success) {
    return { error: fr.pages.recruitment.invalidLink };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("recruitment_book_meeting", {
    p_token: token,
    p_meeting: meetingId,
  });
  const row = data?.[0];
  if (error || !row) {
    return { error: error?.code === "22023" ? error.message : fr.errors.generic };
  }
  return { startsAt: row.starts_at, durationMinutes: row.duration_minutes };
}

/** « Aucun créneau ne vous va ? » : l'équipe rappelle le candidat. */
export async function requestRecruitmentCallback(token: string): Promise<{ error?: string }> {
  if (!uuid.safeParse(token).success) return { error: fr.pages.recruitment.invalidLink };
  const supabase = await createClient();
  const { error } = await supabase.rpc("recruitment_request_callback", { p_token: token });
  if (error) return { error: error.code === "22023" ? error.message : fr.errors.generic };
  return {};
}

/** Réunions encore ouvertes, relues au moment de changer de créneau. */
export async function refreshOpenMeetings(): Promise<MeetingSlot[]> {
  return openMeetings(await createClient());
}
