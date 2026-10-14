import {
  AGENDA_MAX_DAYS_AHEAD,
  absenceError,
  addDays,
  availabilityStatus,
  hoursErrors,
  isValidDate,
  parisToday,
  type AvailabilityStatus,
  type HoursRange,
  type Weekday,
} from "@menao/core";
import { absenceSchema, availableFromSchema, hoursSchema } from "@menao/validation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import type { AgendaAbsence } from "./pro-agenda";
import { supabase } from "./supabase";

const t = fr.proAvailability;

export type Availability = {
  today: string;
  status: AvailabilityStatus;
  paused: boolean;
  availableFrom: string | null;
  hours: HoursRange[];
  /** Absences en cours et à venir. */
  absences: AgendaAbsence[];
};

/**
 * « Mes disponibilités » (F-44), comme sur le site : statut, date de reprise, horaires de travail,
 * absences en cours et à venir. Lectures avec les droits du compte (RLS). Null en cas d'erreur.
 */
export async function loadAvailability(): Promise<Availability | null> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return null;
  const { data: artisan } = await supabase
    .from("artisans")
    .select("id, paused, available_from")
    .eq("user_id", userId)
    .maybeSingle();
  if (!artisan) return null;
  const today = parisToday();
  const [{ data: hours }, { data: absences }] = await Promise.all([
    supabase
      .from("artisan_hours")
      .select("weekday, start_time, end_time")
      .eq("artisan_id", artisan.id)
      .order("weekday")
      .order("start_time"),
    supabase
      .from("artisan_absences")
      .select("id, starts_on, ends_on, label")
      .eq("artisan_id", artisan.id)
      .gte("ends_on", today)
      .order("starts_on"),
  ]);
  const upcoming = (absences ?? []).map((a) => ({
    id: a.id,
    startsOn: a.starts_on,
    endsOn: a.ends_on,
    label: a.label,
  }));
  return {
    today,
    status: availabilityStatus({
      paused: artisan.paused,
      availableFrom: artisan.available_from,
      absences: upcoming,
      today,
    }),
    paused: artisan.paused,
    availableFrom: artisan.available_from,
    hours: (hours ?? []).map((h) => ({
      weekday: h.weekday as Weekday,
      start: h.start_time.slice(0, 5),
      end: h.end_time.slice(0, 5),
    })),
    absences: upcoming,
  };
}

/** Erreur de la base affichable telle quelle (règle métier), sinon message générique. */
const rpcError = (error: { code?: string; message: string }) =>
  error.code === "22023" ? error.message : fr.errors.generic;

type Outcome = { success: string } | { error: string };

/** F-44 : pause (retiré des recherches) ou reprise des demandes. */
export async function setPaused(paused: boolean): Promise<Outcome> {
  const { error } = await supabase.rpc("set_artisan_paused", { p_paused: paused });
  if (error) return { error: rpcError(error) };
  return { success: paused ? t.status.paused : t.status.resumed };
}

/** F-44 : « Nouveaux chantiers à partir du » (vide ou date passée : dès maintenant). */
export async function setAvailableFrom(value: string): Promise<Outcome> {
  const parsed = availableFromSchema.safeParse(value);
  if (!parsed.success || (parsed.data !== "" && !isValidDate(parsed.data))) {
    return { error: t.from.errors.invalide };
  }
  const today = parisToday();
  if (parsed.data > addDays(today, AGENDA_MAX_DAYS_AHEAD)) return { error: t.from.errors.tropLoin };
  const { error } = await supabase.rpc(
    "set_artisan_available_from",
    parsed.data > today ? { p_date: parsed.data } : {},
  );
  if (error) return { error: rpcError(error) };
  return { success: t.from.saved };
}

/** F-44 : horaires de la semaine, contrôlés comme sur le site puis remplacés en une fois. */
export async function saveHours(hours: HoursRange[]): Promise<Outcome> {
  const parsed = hoursSchema.safeParse(hours);
  if (!parsed.success) return { error: t.hours.errors.format };
  const issue = hoursErrors(parsed.data);
  if (issue) return { error: t.hours.errors[issue] };
  const { error } = await supabase.rpc("set_artisan_hours", { p_hours: parsed.data });
  if (error) return { error: rpcError(error) };
  return { success: t.hours.saved };
}

export type AbsenceInput = { startsOn: string; endsOn: string; label: string };
export type AbsenceErrors = Partial<Record<keyof AbsenceInput, string>>;

/** F-44 : absence sur des journées entières (congés, formation, fermeture…). */
export async function addAbsence(
  input: AbsenceInput,
): Promise<{ fields: AbsenceErrors } | Outcome> {
  const parsed = absenceSchema.safeParse(input);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error).fieldErrors;
    return {
      fields: {
        startsOn: flat.startsOn?.[0],
        endsOn: flat.endsOn?.[0],
        label: flat.label?.[0],
      },
    };
  }
  const issue = absenceError(parsed.data.startsOn, parsed.data.endsOn, parisToday());
  if (issue) {
    const field = issue === "invalide" || issue === "trop_loin" ? "startsOn" : "endsOn";
    return { fields: { [field]: t.absences.errors[issue] } };
  }
  const { error } = await supabase.rpc("add_artisan_absence", {
    p_starts_on: parsed.data.startsOn,
    p_ends_on: parsed.data.endsOn,
    ...(parsed.data.label ? { p_label: parsed.data.label } : {}),
  });
  if (error) return { error: rpcError(error) };
  return { success: t.absences.added };
}

export async function deleteAbsence(id: string): Promise<Outcome> {
  const { error } = await supabase.rpc("delete_artisan_absence", { p_id: id });
  if (error) return { error: rpcError(error) };
  return { success: t.absences.removed };
}
