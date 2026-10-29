/**
 * Synchronisation avec le calendrier du téléphone (ADR 0203) : plages occupées lues dans les
 * calendriers choisis par l'artisan (début et fin seulement, jamais le titre), et rendez-vous
 * MENAO à écrire, mettre à jour ou retirer dans le calendrier choisi.
 */
import type { AgendaItem } from "./agenda";

/** Jours lus et écrits à partir d'aujourd'hui. */
export const PHONE_CALENDAR_DAYS = 90;
/** Plages envoyées au plus (la base refuse au-delà). */
export const PHONE_BUSY_MAX = 500;
/** Une plage dure au plus 14 jours (au-delà, coupée). */
const MAX_SLOT_MS = 14 * 86_400_000;

/** Événement lu dans un calendrier du téléphone. */
export type PhoneEvent = {
  id: string;
  startDate: string | Date;
  endDate: string | Date;
  allDay?: boolean;
  /** « free » : l'événement ne rend pas indisponible (option du calendrier). */
  availability?: string | null;
};

export type BusyRange = { startsAt: string; endsAt: string };

/**
 * Plages occupées à envoyer : événements à horaire (les événements « journée entière », comme les
 * anniversaires ou les jours fériés, ne comptent pas), ni « libres », ni écrits par MENAO ;
 * coupés à la période, fusionnés quand ils se chevauchent, 500 au plus.
 */
export function phoneBusySlots(
  events: readonly PhoneEvent[],
  { exclude, from, to }: { exclude: ReadonlySet<string>; from: Date; to: Date },
): BusyRange[] {
  const ranges = events
    .filter((e) => !e.allDay && e.availability !== "free" && !exclude.has(e.id))
    .map((e) => {
      const start = Math.max(new Date(e.startDate).getTime(), from.getTime());
      const end = Math.min(new Date(e.endDate).getTime(), to.getTime(), start + MAX_SLOT_MS);
      return { start, end };
    })
    .filter((r) => Number.isFinite(r.start) && Number.isFinite(r.end) && r.end > r.start)
    .sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const r of ranges) {
    const last = merged.at(-1);
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else merged.push({ ...r });
  }
  return merged.slice(0, PHONE_BUSY_MAX).map((r) => ({
    startsAt: new Date(r.start).toISOString(),
    endsAt: new Date(r.end).toISOString(),
  }));
}

/** Rendez-vous MENAO écrits dans le calendrier du téléphone : identifiant de l'événement créé. */
export type PhoneEventMap = Record<string, { eventId: string; version: string }>;

/** Empreinte d'un rendez-vous : il est réécrit quand elle change. */
export function agendaItemVersion(item: AgendaItem): string {
  return [item.start, item.durationMinutes, item.title ?? "", item.place ?? ""].join("|");
}

/**
 * Ce qu'il faut faire dans le calendrier du téléphone pour qu'il reflète l'agenda MENAO : créer
 * les nouveaux rendez-vous, réécrire ceux qui ont changé, retirer ceux qui ont disparu (annulés,
 * déplacés hors de la période, passés). Les plages « occupé » ne sont jamais réécrites.
 */
export function phoneSyncPlan(
  items: readonly AgendaItem[],
  written: PhoneEventMap,
): {
  create: AgendaItem[];
  update: { item: AgendaItem; eventId: string }[];
  remove: { key: string; eventId: string }[];
} {
  const wanted = items.filter((i) => i.kind !== "occupe");
  const keys = new Set(wanted.map((i) => i.id));
  const create: AgendaItem[] = [];
  const update: { item: AgendaItem; eventId: string }[] = [];
  for (const item of wanted) {
    const done = written[item.id];
    if (!done) create.push(item);
    else if (done.version !== agendaItemVersion(item)) update.push({ item, eventId: done.eventId });
  }
  const remove = Object.entries(written)
    .filter(([key]) => !keys.has(key))
    .map(([key, w]) => ({ key, eventId: w.eventId }));
  return { create, update, remove };
}
