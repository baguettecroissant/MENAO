/**
 * Dernières données de chaque écran, gardées en mémoire le temps de la session : un écran rouvert
 * s'affiche aussitôt avec ce qu'il montrait, puis se met à jour en arrière-plan (fluidité, lot 1 de
 * la refonte de l'espace artisan). Rien n'est écrit sur le téléphone ; tout est vidé quand le
 * compte change (déconnexion, autre compte).
 *
 * Clé : la fonction de chargement elle-même quand elle est stable (module), ou un texte explicite
 * pour un écran à paramètre (« chantier:<id> »), dont la fonction change à chaque ouverture.
 */
export type ScreenCacheKey = string | ((...args: never[]) => unknown);

/** Écrans à paramètre gardés au plus (les plus récents). */
const MAX_TEXT_KEYS = 40;

let byFunction = new WeakMap<object, unknown>();
const byText = new Map<string, unknown>();
let owner: string | null = null;

export function readScreenCache<T>(key: ScreenCacheKey): T | undefined {
  if (typeof key === "string") {
    if (!byText.has(key)) return undefined;
    const value = byText.get(key);
    // Plus récent en dernier : réinséré à chaque lecture.
    byText.delete(key);
    byText.set(key, value);
    return value as T;
  }
  return byFunction.get(key) as T | undefined;
}

export function writeScreenCache<T>(key: ScreenCacheKey, value: T): void {
  if (typeof key !== "string") {
    byFunction.set(key, value);
    return;
  }
  byText.delete(key);
  byText.set(key, value);
  while (byText.size > MAX_TEXT_KEYS) {
    const oldest = byText.keys().next().value;
    if (oldest === undefined) break;
    byText.delete(oldest);
  }
}

export function clearScreenCache(): void {
  byFunction = new WeakMap();
  byText.clear();
}

/** Compte connecté (identifiant, ou null) : les données d'un autre compte sont oubliées. */
export function setScreenCacheOwner(userId: string | null): void {
  if (userId === owner) return;
  owner = userId;
  clearScreenCache();
}

/** Mêmes données qu'avant ? Évite de redessiner l'écran quand rien n'a changé. */
export function sameScreenData(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
