import "server-only";
import {
  APPOINTMENT_DURATION_MINUTES,
  suggestSlots,
  type Absence,
  type HoursRange,
  type Weekday,
} from "@menao/core";
import { cache } from "react";
import { artisanActivity, requireProSpace } from "./space";

export type AgendaKind = "visite" | "demarrage" | "creneau";

/** Élément horaire de l'agenda (F-44) : visite, démarrage de chantier ou créneau bloqué. */
export type AgendaItem = {
  id: string;
  kind: AgendaKind;
  /** Instant ISO. */
  start: string;
  durationMinutes: number;
  /** Titre du chantier, ou motif du créneau bloqué. */
  title: string | null;
  /** Commune du chantier. */
  place: string | null;
  chantierId: string | null;
};

export type AgendaAbsence = Absence & { id: string; label: string | null };

/** Horaires de travail de l'artisan (HH:MM), dans l'ordre de la semaine. */
export const artisanHours = cache(async (): Promise<HoursRange[]> => {
  const { supabase, artisanId } = await requireProSpace();
  const { data } = await supabase
    .from("artisan_hours")
    .select("weekday, start_time, end_time")
    .eq("artisan_id", artisanId)
    .order("weekday")
    .order("start_time");
  return (data ?? []).map((h) => ({
    weekday: h.weekday as Weekday,
    start: h.start_time.slice(0, 5),
    end: h.end_time.slice(0, 5),
  }));
});

/** Absences qui touchent la période (dates AAAA-MM-JJ, bornes incluses), passées comprises. */
export async function absencesBetween(from: string, to: string): Promise<AgendaAbsence[]> {
  const { supabase, artisanId } = await requireProSpace();
  const { data } = await supabase
    .from("artisan_absences")
    .select("id, starts_on, ends_on, label")
    .eq("artisan_id", artisanId)
    .lte("starts_on", to)
    .gte("ends_on", from)
    .order("starts_on");
  return (data ?? []).map((a) => ({
    id: a.id,
    startsOn: a.starts_on,
    endsOn: a.ends_on,
    label: a.label,
  }));
}

/**
 * Visites planifiées, démarrages de chantier et créneaux bloqués qui commencent entre deux instants
 * (chantiers annulés exclus). `excludeChantierId` : le rendez-vous en cours de modification.
 */
export async function agendaItems(
  from: Date,
  to: Date,
  excludeChantierId?: string,
): Promise<AgendaItem[]> {
  const { supabase, artisanId } = await requireProSpace();
  const [{ chantiers }, { data: blocked }] = await Promise.all([
    artisanActivity(),
    supabase
      .from("artisan_blocked_slots")
      .select("id, starts_at, ends_at, label")
      .eq("artisan_id", artisanId)
      .lt("starts_at", to.toISOString())
      .gt("ends_at", from.toISOString())
      .order("starts_at"),
  ]);
  const within = (iso: string | null): iso is string => {
    if (!iso) return false;
    const at = new Date(iso).getTime();
    return at >= from.getTime() && at < to.getTime();
  };
  const items: AgendaItem[] = [];
  for (const c of chantiers) {
    if (c.status === "annule" || c.chantier_id === excludeChantierId) continue;
    const place = [c.code_postal, c.ville_nom].filter(Boolean).join(" ") || null;
    const base = { title: c.title, place, chantierId: c.chantier_id };
    const duration = APPOINTMENT_DURATION_MINUTES;
    if (within(c.appointment_at)) {
      items.push({
        ...base,
        id: `visite-${c.chantier_id}`,
        kind: "visite",
        start: c.appointment_at,
        durationMinutes: duration,
      });
    }
    if (within(c.start_at)) {
      items.push({
        ...base,
        id: `demarrage-${c.chantier_id}`,
        kind: "demarrage",
        start: c.start_at,
        durationMinutes: duration,
      });
    }
  }
  for (const b of blocked ?? []) {
    items.push({
      id: b.id,
      kind: "creneau",
      start: b.starts_at,
      durationMinutes: Math.round(
        (new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / 60_000,
      ),
      title: b.label,
      place: null,
      chantierId: null,
    });
  }
  return items.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

/** Contexte des formulaires de rendez-vous (F-18) : créneaux libres et avertissements. */
export type AppointmentAgenda = {
  hours: HoursRange[];
  absences: AgendaAbsence[];
  busy: Pick<AgendaItem, "kind" | "start" | "durationMinutes" | "title">[];
  /** Instants ISO proposés (vide pour la date de démarrage). */
  suggestions: string[];
};

export async function appointmentAgenda({
  excludeChantierId,
  withSuggestions = true,
}: { excludeChantierId?: string; withSuggestions?: boolean } = {}): Promise<AppointmentAgenda> {
  const space = await requireProSpace();
  const now = new Date();
  const [hours, items] = await Promise.all([
    artisanHours(),
    agendaItems(
      new Date(now.getTime() - 86_400_000),
      new Date(now.getTime() + 366 * 86_400_000),
      excludeChantierId,
    ),
  ]);
  const busy = items.map(({ kind, start, durationMinutes, title }) => ({
    kind,
    start,
    durationMinutes,
    title,
  }));
  return {
    hours,
    absences: space.absences,
    busy,
    suggestions: withSuggestions
      ? suggestSlots({ hours, absences: space.absences, busy, now }).map((d) => d.toISOString())
      : [],
  };
}

/** Lien d'abonnement .ics de l'artisan, s'il l'a créé. */
export async function calendarFeed() {
  const { supabase, artisanId } = await requireProSpace();
  const { data } = await supabase
    .from("artisan_calendar_feeds")
    .select("token, last_read_at")
    .eq("artisan_id", artisanId)
    .maybeSingle();
  return data;
}
