/** Fichier agenda .ics d'un rendez-vous (F-44), conforme à la RFC 5545. */

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

export function buildIcs(event: IcsEvent): string {
  const end = new Date(event.start.getTime() + event.durationMinutes * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MENAO//Rendez-vous//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}@menao.fr`,
    `DTSTAMP:${utc(event.stamp)}`,
    `DTSTART:${utc(event.start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
