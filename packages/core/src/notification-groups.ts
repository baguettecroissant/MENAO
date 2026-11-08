import { parisToday } from "./project";

/**
 * Notifications rangées en « Aujourd'hui » puis « Plus tôt » (refonte « Nette », ADR 0258), au
 * jour de Paris ; l'ordre d'arrivée est conservé dans chaque groupe.
 */
export function notificationGroups<T extends { createdAt: string }>(
  items: readonly T[],
  now: Date,
): { today: T[]; earlier: T[] } {
  const today = parisToday(now);
  const groups = { today: [] as T[], earlier: [] as T[] };
  for (const item of items) {
    (parisToday(new Date(item.createdAt)) === today ? groups.today : groups.earlier).push(item);
  }
  return groups;
}
