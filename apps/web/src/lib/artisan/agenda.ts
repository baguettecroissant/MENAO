import "server-only";
import {
  agendaItemsFrom,
  suggestSlots,
  type Absence,
  type AgendaItem,
  type HoursRange,
  type Weekday,
} from "@menao/core";
import { cache } from "react";
import { artisanActivity, requireProSpace } from "./space";

/** Élément horaire de l'agenda (F-44), commun avec l'application (`@menao/core`). */
export type { AgendaItem, AgendaItemKind as AgendaKind } from "@menao/core";

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
 * Visites planifiées, démarrages de chantier, créneaux bloqués et plages occupées du téléphone qui
 * commencent entre deux instants (chantiers annulés exclus), assemblés par `agendaItemsFrom` (`@menao/core`).
 * `excludeChantierId` : le rendez-vous en cours de modification.
 */
export async function agendaItems(
  from: Date,
  to: Date,
  excludeChantierId?: string,
): Promise<AgendaItem[]> {
  const { supabase, artisanId } = await requireProSpace();
  const [{ chantiers }, { data: blocked }, { data: external }] = await Promise.all([
    artisanActivity(),
    supabase
      .from("artisan_blocked_slots")
      .select("id, starts_at, ends_at, label")
      .eq("artisan_id", artisanId)
      .lt("starts_at", to.toISOString())
      .gt("ends_at", from.toISOString())
      .order("starts_at"),
    // Plages occupées du calendrier du téléphone (ADR 0203).
    supabase
      .from("artisan_external_busy")
      .select("id, starts_at, ends_at")
      .eq("artisan_id", artisanId)
      .lt("starts_at", to.toISOString())
      .gt("ends_at", from.toISOString())
      .order("starts_at"),
  ]);
  return agendaItemsFrom({
    chantiers: chantiers.map((c) => ({
      chantierId: c.chantier_id,
      status: c.status,
      title: c.title,
      codePostal: c.code_postal,
      villeNom: c.ville_nom,
      appointmentAt: c.appointment_at,
      startAt: c.start_at,
    })),
    blocked: (blocked ?? []).map((b) => ({
      id: b.id,
      startsAt: b.starts_at,
      endsAt: b.ends_at,
      label: b.label,
    })),
    external: (external ?? []).map((e) => ({
      id: e.id,
      startsAt: e.starts_at,
      endsAt: e.ends_at,
    })),
    from,
    to,
    excludeChantierId,
  });
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
