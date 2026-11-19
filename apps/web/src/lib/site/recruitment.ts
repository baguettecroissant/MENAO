import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@menao/db";

/** Réunion d'information encore ouverte (sans son lien de visio, envoyé par e-mail). */
export type MeetingSlot = {
  id: string;
  startsAt: string;
  durationMinutes: number;
  remaining: number;
};

/** Réunions à venir avec des places, lues par `recruitment_open_meetings` (ADR 0380). */
export async function openMeetings(supabase: SupabaseClient<Database>): Promise<MeetingSlot[]> {
  const { data } = await supabase.rpc("recruitment_open_meetings");
  return (data ?? []).map((m) => ({
    id: m.id,
    startsAt: m.starts_at,
    durationMinutes: m.duration_minutes,
    remaining: m.remaining,
  }));
}
