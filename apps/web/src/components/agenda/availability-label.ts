import type { AvailabilityStatus } from "@menao/core";
import { fr } from "@/i18n/fr";
import { formatDayMonth } from "@/lib/format";

const t = fr.appShell.availability;

/** Libellé court du statut de disponibilité (menu, agenda). */
export function availabilityLabel(status: AvailabilityStatus): string {
  switch (status.kind) {
    case "pause":
      return t.pause;
    case "conges":
      return t.conges(formatDayMonth(status.until));
    case "a_partir_du":
      return t.aPartirDu(formatDayMonth(status.date));
    default:
      return t.disponible;
  }
}

/** Pause et congés retirent l'artisan des recherches. */
export const isWithdrawn = (status: AvailabilityStatus) =>
  status.kind === "pause" || status.kind === "conges";
