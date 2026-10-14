import { buildIcs, type CalendarEvent } from "@menao/core";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/**
 * Fichier .ics d'une intervention, proposé au partage du téléphone (Calendrier, Fichiers),
 * comme le lien « Ajouter à Calendrier » du site. Faux en cas d'échec.
 */
export async function shareIcs(event: CalendarEvent, uid: string): Promise<boolean> {
  try {
    if (!(await Sharing.isAvailableAsync())) return false;
    const file = new File(Paths.cache, `menao-${uid}.ics`);
    file.create({ overwrite: true });
    file.write(buildIcs({ ...event, uid: `${uid}@menao`, stamp: new Date() }));
    await Sharing.shareAsync(file.uri, { mimeType: "text/calendar", UTI: "com.apple.ical.ics" });
    return true;
  } catch {
    return false;
  }
}
