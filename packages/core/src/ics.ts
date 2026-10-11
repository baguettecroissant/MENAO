/**
 * Agenda (F-12, F-44) : fichier .ics d'un rendez-vous ou d'un démarrage de travaux, agenda complet
 * de l'artisan à synchroniser (abonnement), conformes à la RFC 5545, et liens « Ajouter à Google
 * Agenda » et « Ajouter à Outlook ».
 */

export type IcsEvent = {
  uid: string;
  start: Date;
  durationMinutes: number;
  summary: string;
  location?: string | null;
  description?: string | null;
  /** Date de génération du fichier (DTSTAMP). */
  stamp: Date;
};

const utc = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Replie une ligne en segments de 75 octets au plus, sans couper un caractère UTF-8. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // Les lignes de continuation commencent par une espace, comptée dans les 75 octets.
    const limit = out.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

/** Absence sur des journées entières (bornes incluses), dans l'agenda à synchroniser. */
export type IcsAllDayEvent = {
  uid: string;
  startDate: string;
  endDate: string;
  summary: string;
  description?: string | null;
  stamp: Date;
};

const compactDate = (date: string) => date.replace(/-/g, "");

/** Lendemain d'une date AAAA-MM-JJ : la fin d'un événement sur la journée est exclusive. */
function nextDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

function eventLines(event: IcsEvent | IcsAllDayEvent): string[] {
  const when =
    "startDate" in event
      ? [
          `DTSTART;VALUE=DATE:${compactDate(event.startDate)}`,
          `DTEND;VALUE=DATE:${compactDate(nextDay(event.endDate))}`,
        ]
      : [
          `DTSTART:${utc(event.start)}`,
          `DTEND:${utc(new Date(event.start.getTime() + event.durationMinutes * 60_000))}`,
        ];
  return [
    "BEGIN:VEVENT",
    `UID:${event.uid}@menao.fr`,
    `DTSTAMP:${utc(event.stamp)}`,
    ...when,
    `SUMMARY:${escapeText(event.summary)}`,
    ...("location" in event && event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
    "END:VEVENT",
  ];
}

const serialize = (lines: string[]) => lines.map(fold).join("\r\n") + "\r\n";

export function buildIcs(event: IcsEvent): string {
  return serialize([
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MENAO//Rendez-vous//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...eventLines(event),
    "END:VCALENDAR",
  ]);
}

/**
 * Agenda complet à synchroniser (F-44) : rendez-vous, démarrages, créneaux bloqués et absences.
 * Les applications d'agenda le relisent d'elles-mêmes ; l'actualisation demandée est horaire.
 */
export function buildCalendar(
  name: string,
  events: readonly (IcsEvent | IcsAllDayEvent)[],
): string {
  return serialize([
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MENAO//Agenda//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...events.flatMap(eventLines),
    "END:VCALENDAR",
  ]);
}

export type CalendarEvent = Omit<IcsEvent, "uid" | "stamp">;

const endOf = (event: CalendarEvent) =>
  new Date(event.start.getTime() + event.durationMinutes * 60_000);

/** « Ajouter à Google Agenda » : mêmes informations que le fichier .ics. */
export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.summary,
    dates: `${utc(event.start)}/${utc(endOf(event))}`,
  });
  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** « Ajouter à Outlook » (Outlook.com) : mêmes informations que le fichier .ics. */
export function outlookCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.summary,
    startdt: event.start.toISOString(),
    enddt: endOf(event).toISOString(),
  });
  if (event.description) params.set("body", event.description);
  if (event.location) params.set("location", event.location);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
