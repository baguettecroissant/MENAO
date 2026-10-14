import {
  addDays,
  agendaItemsFrom,
  availabilityStatus,
  blockedSlotError,
  parisLocalToDate,
  parisToday,
  type Absence,
  type AgendaItem,
  type AvailabilityStatus,
  type HoursRange,
  type Weekday,
} from "@menao/core";
import { blockedSlotSchema } from "@menao/validation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";

export type AgendaAbsence = Absence & { id: string; label: string | null };

export type AgendaWeek = {
  /** Lundi de la semaine affichée (AAAA-MM-JJ). */
  monday: string;
  today: string;
  /** Statut de disponibilité (pause, congés, à partir du…), comme le menu du site. */
  availability: AvailabilityStatus;
  hours: HoursRange[];
  items: AgendaItem[];
  /** Absences qui touchent la semaine. */
  absences: AgendaAbsence[];
};

const toAbsence = (a: {
  id: string;
  starts_on: string;
  ends_on: string;
  label: string | null;
}) => ({
  id: a.id,
  startsOn: a.starts_on,
  endsOn: a.ends_on,
  label: a.label,
});

/**
 * Semaine de l'agenda de l'artisan (F-44), comme sur le site : horaires de travail, visites,
 * démarrages et créneaux bloqués (`agendaItemsFrom`), absences, statut de disponibilité. Lectures
 * avec les droits du compte (RLS), filtrées sur l'artisan. Null en cas d'erreur.
 */
export async function loadAgendaWeek(monday: string): Promise<AgendaWeek | null> {
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
  const sunday = addDays(monday, 6);
  const from = parisLocalToDate(monday, "00:00");
  const to = parisLocalToDate(addDays(monday, 7), "00:00");
  const [hours, chantiers, blocked, weekAbsences, upcoming] = await Promise.all([
    supabase
      .from("artisan_hours")
      .select("weekday, start_time, end_time")
      .eq("artisan_id", artisan.id)
      .order("weekday")
      .order("start_time"),
    supabase.rpc("artisan_chantiers"),
    supabase
      .from("artisan_blocked_slots")
      .select("id, starts_at, ends_at, label")
      .eq("artisan_id", artisan.id)
      .lt("starts_at", to.toISOString())
      .gt("ends_at", from.toISOString())
      .order("starts_at"),
    supabase
      .from("artisan_absences")
      .select("id, starts_on, ends_on, label")
      .eq("artisan_id", artisan.id)
      .lte("starts_on", sunday)
      .gte("ends_on", monday)
      .order("starts_on"),
    // Absences en cours et à venir : statut de disponibilité, comme le menu du site.
    supabase
      .from("artisan_absences")
      .select("id, starts_on, ends_on, label")
      .eq("artisan_id", artisan.id)
      .gte("ends_on", today)
      .order("starts_on"),
  ]);
  if (chantiers.error) return null;
  return {
    monday,
    today,
    availability: availabilityStatus({
      paused: artisan.paused,
      availableFrom: artisan.available_from,
      absences: (upcoming.data ?? []).map(toAbsence),
      today,
    }),
    hours: (hours.data ?? []).map((h) => ({
      weekday: h.weekday as Weekday,
      start: h.start_time.slice(0, 5),
      end: h.end_time.slice(0, 5),
    })),
    items: agendaItemsFrom({
      chantiers: (chantiers.data ?? []).map((c) => ({
        chantierId: c.chantier_id,
        status: c.status,
        title: c.title,
        codePostal: c.code_postal,
        villeNom: c.ville_nom,
        appointmentAt: c.appointment_at as string | null,
        startAt: c.start_at as string | null,
      })),
      blocked: (blocked.data ?? []).map((b) => ({
        id: b.id,
        startsAt: b.starts_at,
        endsAt: b.ends_at,
        label: b.label,
      })),
      from,
      to,
    }),
    absences: (weekAbsences.data ?? []).map(toAbsence),
  };
}

/** Erreur de la base affichable telle quelle (règle métier), sinon message générique. */
const rpcError = (error: { code?: string; message: string }) =>
  error.code === "22023" ? error.message : fr.errors.generic;

export type BlockedSlotInput = { date: string; start: string; end: string; label: string };
export type BlockedSlotErrors = Partial<Record<keyof BlockedSlotInput, string>>;

/**
 * F-44 « Bloquer un créneau » sur une journée, contrôlé comme sur le site (`blockedSlotSchema`,
 * `blockedSlotError`, puis la base). Renvoie les erreurs par champ, ou null.
 */
export async function addBlockedSlot(
  input: BlockedSlotInput,
): Promise<{ fields: BlockedSlotErrors } | { error: string } | null> {
  const parsed = blockedSlotSchema.safeParse(input);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error).fieldErrors;
    return {
      fields: {
        date: flat.date?.[0],
        start: flat.start?.[0],
        end: flat.end?.[0],
        label: flat.label?.[0],
      },
    };
  }
  const { date, start, end, label } = parsed.data;
  const issue = blockedSlotError(date, start, end, new Date());
  if (issue) {
    return { fields: { [issue === "ordre" ? "end" : "date"]: fr.proAgenda.block.errors[issue] } };
  }
  const { error } = await supabase.rpc("add_artisan_blocked_slot", {
    p_date: date,
    p_start: start,
    p_end: end,
    ...(label ? { p_label: label } : {}),
  });
  return error ? { error: rpcError(error) } : null;
}

/** F-44 « Libérer » un créneau bloqué. Renvoie le message d'erreur, ou null. */
export async function deleteBlockedSlot(id: string): Promise<string | null> {
  const { error } = await supabase.rpc("delete_artisan_blocked_slot", { p_id: id });
  return error ? rpcError(error) : null;
}
