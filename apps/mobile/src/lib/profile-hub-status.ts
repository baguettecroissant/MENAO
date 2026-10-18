import {
  profileHubStatuses,
  type ProfileHubFacts,
  type ProfileHubRow,
  type ProfileHubStatus,
  type ProfileHubTone,
} from "@menao/core";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "./dates";

/**
 * État affiché à droite de chaque ligne de « Mon profil » (ADR 0129) : les règles sont communes
 * au site (`profileHubStatuses`, @menao/core) ; ici, leur texte dans l'application.
 */
export type HubTone = ProfileHubTone;
export type HubStatus = { text: string; tone: HubTone } | null;
export type HubRow = ProfileHubRow;
export type HubFacts = ProfileHubFacts;

const v = fr.proHub.values;

function text(s: ProfileHubStatus): string {
  switch (s.code) {
    case "photos":
      return v.photos(s.n);
    case "toAnswer":
      return v.toAnswer(s.n);
    case "reviews":
      return v.reviews(s.n);
    case "level":
      return v.level(s.n);
    case "communes":
      return v.communes(s.n);
    case "toRenew":
      return v.toRenew(s.n);
    case "refused":
      return v.refused(s.n);
    case "radius":
      return v.radius(s.km);
    case "trades":
      return v.trades(s.n, s.rge);
    case "from":
      return v.from(formatLongDate(s.date));
    default:
      return v[s.code];
  }
}

export function hubStatuses(f: HubFacts, now: Date = new Date()): Record<HubRow, HubStatus> {
  const statuses = profileHubStatuses(f, now);
  return Object.fromEntries(
    Object.entries(statuses).map(([row, s]) => [row, s ? { text: text(s), tone: s.tone } : null]),
  ) as Record<HubRow, HubStatus>;
}
