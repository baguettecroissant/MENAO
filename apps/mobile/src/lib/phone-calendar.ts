import {
  PHONE_CALENDAR_DAYS,
  agendaItemVersion,
  phoneBusySlots,
  phoneSyncPlan,
  type AgendaItem,
  type PhoneEventMap,
} from "@menao/core";
import * as Calendar from "expo-calendar/legacy";
import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { fr } from "@/i18n/fr";
import { kv } from "./kv";
import { loadUpcomingAgendaItems } from "./pro-agenda";
import { supabase } from "./supabase";

const t = fr.phoneCalendar;
/** Choix de l'artisan, propres à ce téléphone (les calendriers n'existent que sur lui). */
const PREFS_KEY = "menao.calendrier-telephone";
/** Événements écrits par MENAO : trop gros pour le trousseau, gardés dans un fichier. */
const WRITTEN_FILE = "menao-calendrier.json";
/** Pas plus d'une synchronisation toutes les deux minutes, sauf demande explicite. */
const MIN_INTERVAL_MS = 2 * 60_000;

export const phoneCalendarSupported = Platform.OS === "ios" || Platform.OS === "android";

export type PhoneCalendarPrefs = {
  /** Calendrier où écrire les rendez-vous MENAO, ou null. */
  writeTo: string | null;
  /** Calendriers dont les rendez-vous rendent l'artisan indisponible. */
  readFrom: string[];
};

export type PhoneCalendarInfo = {
  id: string;
  title: string;
  color: string;
  account: string;
  writable: boolean;
};

type Written = { calendarId: string | null; events: PhoneEventMap };

let lastSync = 0;
let running: Promise<SyncResult> | null = null;

export async function loadPhoneCalendarPrefs(): Promise<PhoneCalendarPrefs> {
  try {
    const raw = await kv.get(PREFS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<PhoneCalendarPrefs>) : {};
    return {
      writeTo: typeof parsed.writeTo === "string" ? parsed.writeTo : null,
      readFrom: Array.isArray(parsed.readFrom)
        ? parsed.readFrom.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return { writeTo: null, readFrom: [] };
  }
}

export async function savePhoneCalendarPrefs(prefs: PhoneCalendarPrefs): Promise<void> {
  await kv.set(PREFS_KEY, JSON.stringify(prefs));
}

function writtenFile(): File {
  return new File(Paths.document, WRITTEN_FILE);
}

async function loadWritten(): Promise<Written> {
  try {
    const file = writtenFile();
    if (!file.exists) return { calendarId: null, events: {} };
    const parsed = JSON.parse(await file.text()) as Written;
    return { calendarId: parsed.calendarId ?? null, events: parsed.events ?? {} };
  } catch {
    return { calendarId: null, events: {} };
  }
}

function saveWritten(written: Written) {
  try {
    const file = writtenFile();
    if (!file.exists) file.create();
    file.write(JSON.stringify(written));
  } catch {
    // Sans fichier, les rendez-vous seront réécrits à la prochaine synchronisation.
  }
}

export type CalendarPermission = "granted" | "denied" | "undetermined" | "unsupported";

export async function phoneCalendarPermission(): Promise<CalendarPermission> {
  if (!phoneCalendarSupported) return "unsupported";
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    return status === "granted" || status === "denied" ? status : "undetermined";
  } catch {
    return "unsupported";
  }
}

/** Accès au calendrier demandé au téléphone (une seule fois ; ensuite, dans les réglages). */
export async function requestPhoneCalendarPermission(): Promise<CalendarPermission> {
  if (!phoneCalendarSupported) return "unsupported";
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === "granted" || status === "denied" ? status : "undetermined";
  } catch {
    return "unsupported";
  }
}

/**
 * Calendriers du téléphone (iCloud, Google, Outlook… réunis par le téléphone). Le calendrier
 * « MENAO » de l'abonnement .ics est écarté : ses rendez-vous viennent déjà de MENAO.
 */
export async function listPhoneCalendars(): Promise<PhoneCalendarInfo[]> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return calendars
    .filter(
      (c) =>
        c.title.trim().toUpperCase() !== "MENAO" &&
        c.type !== Calendar.CalendarType.BIRTHDAYS &&
        c.source?.type !== Calendar.SourceType.BIRTHDAYS,
    )
    .map((c) => ({
      id: c.id,
      title: c.title,
      color: c.color ?? "#9aa1ad",
      account: c.source?.name ?? "",
      writable: c.allowsModifications,
    }))
    .sort((a, b) => a.account.localeCompare(b.account) || a.title.localeCompare(b.title));
}

/** Calendrier proposé pour écrire : celui par défaut du téléphone, sinon le premier modifiable. */
export async function defaultWritableCalendar(
  calendars: readonly PhoneCalendarInfo[],
): Promise<string | null> {
  if (Platform.OS === "ios") {
    try {
      const fallback = await Calendar.getDefaultCalendarAsync();
      if (calendars.some((c) => c.id === fallback.id && c.writable)) return fallback.id;
    } catch {
      // Pas de calendrier par défaut : le premier modifiable.
    }
  }
  return calendars.find((c) => c.writable)?.id ?? null;
}

/** Calendriers lus par défaut : tous, sauf les abonnements (jours fériés, sport…). */
export async function defaultReadCalendars(): Promise<string[]> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const listed = new Set((await listPhoneCalendars()).map((c) => c.id));
  return calendars
    .filter(
      (c) =>
        listed.has(c.id) &&
        c.type !== Calendar.CalendarType.SUBSCRIBED &&
        c.source?.type !== Calendar.SourceType.SUBSCRIBED,
    )
    .map((c) => c.id);
}

function eventDetails(item: AgendaItem) {
  const start = new Date(item.start);
  return {
    title: t.eventTitle(fr.proAgenda.kinds[item.kind], item.title),
    startDate: start,
    endDate: new Date(start.getTime() + item.durationMinutes * 60_000),
    location: item.place ?? undefined,
    notes: t.eventNotes,
    timeZone: "Europe/Paris",
  };
}

/** Rendez-vous MENAO écrits, réécrits ou retirés dans le calendrier choisi. */
async function writeEvents(calendarId: string | null, items: AgendaItem[]): Promise<Written> {
  let written = await loadWritten();
  // Autre calendrier choisi (ou écriture arrêtée) : les anciens rendez-vous sont retirés.
  if (written.calendarId && written.calendarId !== calendarId) {
    await Promise.all(
      Object.values(written.events).map((w) =>
        Calendar.deleteEventAsync(w.eventId).catch(() => undefined),
      ),
    );
    written = { calendarId: null, events: {} };
  }
  if (!calendarId) {
    saveWritten(written);
    return written;
  }
  const events: PhoneEventMap = { ...written.events };
  const plan = phoneSyncPlan(items, events);
  for (const { key, eventId } of plan.remove) {
    await Calendar.deleteEventAsync(eventId).catch(() => undefined);
    delete events[key];
  }
  for (const { item, eventId } of plan.update) {
    try {
      await Calendar.updateEventAsync(eventId, eventDetails(item));
      events[item.id] = { eventId, version: agendaItemVersion(item) };
    } catch {
      // Événement supprimé à la main dans le calendrier : il est recréé.
      plan.create.push(item);
    }
  }
  for (const item of plan.create) {
    try {
      const id = await Calendar.createEventAsync(calendarId, eventDetails(item));
      events[item.id] = { eventId: id, version: agendaItemVersion(item) };
    } catch {
      // Réessayé à la prochaine synchronisation.
    }
  }
  const next = { calendarId, events };
  saveWritten(next);
  return next;
}

export type SyncResult = "ok" | "off" | "denied" | "error";

/**
 * Synchronisation avec le calendrier du téléphone (ADR 0203) : rendez-vous MENAO écrits dans le
 * calendrier choisi, puis plages occupées des calendriers choisis envoyées à MENAO (début et fin
 * seulement). Appelée à l'ouverture de l'application, sur l'agenda et après chaque rendez-vous.
 */
export function syncPhoneCalendar({ force = false } = {}): Promise<SyncResult> {
  if (running) return running;
  if (!force && Date.now() - lastSync < MIN_INTERVAL_MS) return Promise.resolve("ok");
  running = run().finally(() => {
    running = null;
  });
  return running;
}

async function run(): Promise<SyncResult> {
  if (!phoneCalendarSupported) return "off";
  const prefs = await loadPhoneCalendarPrefs();
  if (!prefs.writeTo && prefs.readFrom.length === 0) {
    // Écriture arrêtée : les rendez-vous déjà écrits sont retirés une fois.
    if ((await loadWritten()).calendarId) await writeEvents(null, []).catch(() => undefined);
    return "off";
  }
  if ((await phoneCalendarPermission()) !== "granted") return "denied";
  try {
    const from = new Date(Date.now() - 86_400_000);
    const to = new Date(Date.now() + PHONE_CALENDAR_DAYS * 86_400_000);
    const items = await loadUpcomingAgendaItems(from, to);
    if (!items) return "error";
    const written = await writeEvents(prefs.writeTo, items);

    if (prefs.readFrom.length > 0) {
      const now = new Date();
      const events = await Calendar.getEventsAsync(prefs.readFrom, now, to);
      const mine = new Set(Object.values(written.events).map((w) => w.eventId));
      const slots = phoneBusySlots(
        events.map((e) => ({
          id: e.id,
          startDate: e.startDate,
          endDate: e.endDate,
          allDay: e.allDay,
          availability: e.availability,
        })),
        { exclude: mine, from: now, to },
      );
      const { error } = await supabase.rpc("replace_external_busy", {
        p_from: now.toISOString(),
        p_to: to.toISOString(),
        p_slots: slots.map((s) => ({ starts_at: s.startsAt, ends_at: s.endsAt })),
      });
      if (error) return "error";
    }
    lastSync = Date.now();
    await kv.set(`${PREFS_KEY}.derniere`, new Date(lastSync).toISOString());
    return "ok";
  } catch {
    return "error";
  }
}

/** Heure de la dernière synchronisation réussie sur ce téléphone. */
export async function lastPhoneCalendarSync(): Promise<string | null> {
  return kv.get(`${PREFS_KEY}.derniere`);
}

/** « Ne plus tenir compte de mes autres rendez-vous » : plages oubliées par MENAO. */
export async function clearPhoneBusy(): Promise<boolean> {
  const { error } = await supabase.rpc("clear_external_busy");
  return !error;
}
