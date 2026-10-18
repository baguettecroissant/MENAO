import type { ProfileHubRow, ProfileHubStatus } from "@menao/core";
import { fr } from "@/i18n/fr";

const v = fr.pro.hub.values;
const longDay = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

/** Texte d'un état de « Mon profil » (règles communes, `profileHubStatuses`, ADR 0131). */
export function hubStatusText(s: ProfileHubStatus): string {
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
      return v.from(longDay.format(new Date(`${s.date}T00:00:00Z`)));
    default:
      return v[s.code];
  }
}

export type HubLineStatus = { text: string; tone: ProfileHubStatus["tone"] } | null;

export function hubStatusTexts(
  statuses: Record<ProfileHubRow, ProfileHubStatus | null>,
): Record<ProfileHubRow, HubLineStatus> {
  return Object.fromEntries(
    Object.entries(statuses).map(([row, s]) => [
      row,
      s ? { text: hubStatusText(s), tone: s.tone } : null,
    ]),
  ) as Record<ProfileHubRow, HubLineStatus>;
}
