/**
 * Dernières données de chaque écran, gardées en mémoire le temps de la session : un écran rouvert
 * s'affiche aussitôt avec ce qu'il montrait, puis se met à jour en arrière-plan (fluidité, lot 1 de
 * la refonte de l'espace artisan). Les onglets (clés « tab:… ») sont aussi gardés sur le téléphone
 * d'une ouverture à l'autre (ADR 0192), pour le compte connecté seulement ; tout est vidé, mémoire
 * et téléphone, quand le compte change (déconnexion, autre compte).
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

/** Écrans gardés sur le téléphone d'une ouverture à l'autre : les onglets. */
const PERSISTED_PREFIX = "tab:";
const STORE_VERSION = 1;
/** Écrit sur le téléphone une seconde après la dernière mise à jour. */
const SAVE_DELAY_MS = 1000;
/** Préchargement encore frais : l'écran ouvert juste après ne recharge pas une seconde fois. */
const FRESH_PRELOAD_MS = 20_000;

/** Fichier où sont gardés les onglets (fourni par l'application ; aucun dans les tests). */
export type ScreenCacheStore = {
  read(): Promise<string | null>;
  write(text: string): Promise<void>;
  remove(): Promise<void>;
};

let store: ScreenCacheStore | null = null;
let persisting = true;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
const preloadedAt = new Map<string, number>();
/** Chargements d'avance en cours, par écran : l'écran ouvert entre-temps les attend. */
const inflight = new Map<string, Promise<unknown>>();
/** Aperçu d'une fiche (titre, sous-titre), connu de la liste avant son chargement. */
const previews = new Map<string, ScreenPreview>();
/** Change à chaque oubli (compte, exemples) : un chargement parti avant n'écrit plus rien. */
let generation = 0;

export type ScreenPreview = { title: string; subtitle?: string | null };

export function setScreenCacheStore(next: ScreenCacheStore | null): void {
  store = next;
}

/** Mode exemples (ADR 0184) : rien n'est écrit sur le téléphone tant qu'il est actif. */
export function setScreenCachePersistence(on: boolean): void {
  persisting = on;
  if (!on) clearTimeout(saveTimer);
}

/** Contenu du fichier : version, compte et onglets seulement. */
export function serializeScreenCache(user: string, entries: Iterable<[string, unknown]>): string {
  // Une erreur de chargement (null) n'est pas gardée : l'onglet rechargera à l'ouverture.
  const kept = [...entries].filter(
    ([key, value]) => key.startsWith(PERSISTED_PREFIX) && value !== null,
  );
  return JSON.stringify({ v: STORE_VERSION, owner: user, entries: Object.fromEntries(kept) });
}

/** Onglets gardés pour ce compte ; rien si le fichier est illisible, ancien ou d'un autre compte. */
export function parseScreenCache(text: string | null, user: string): [string, unknown][] {
  if (!text) return [];
  try {
    const data = JSON.parse(text) as { v?: unknown; owner?: unknown; entries?: unknown };
    if (data.v !== STORE_VERSION || data.owner !== user) return [];
    if (!data.entries || typeof data.entries !== "object") return [];
    return Object.entries(data.entries).filter(([key]) => key.startsWith(PERSISTED_PREFIX));
  } catch {
    return [];
  }
}

function scheduleSave(): void {
  if (!store || !persisting || owner === null) return;
  clearTimeout(saveTimer);
  const user = owner;
  saveTimer = setTimeout(() => {
    if (owner === user && persisting) void store?.write(serializeScreenCache(user, byText));
  }, SAVE_DELAY_MS);
}

/** Onglets de la dernière ouverture, pour ce compte : relus avant le premier écran. */
export async function restoreScreenCache(user: string): Promise<void> {
  if (!store) return;
  const entries = parseScreenCache(await store.read(), user);
  if (owner !== user) return;
  for (const [key, value] of entries) {
    if (!byText.has(key)) byText.set(key, value);
  }
}

/**
 * Charge d'avance l'écran d'une fiche ou d'un onglet (ADR 0192 et 0193) : au toucher d'une ligne,
 * ou pour les premières lignes d'une liste. Un seul chargement à la fois par écran ; rien n'est
 * écrit si le compte ou le mode exemples a changé entre-temps, ni en cas d'erreur (null).
 */
export function prefetchScreen(key: string, load: () => Promise<unknown>): void {
  if (inflight.has(key)) return;
  const at = preloadedAt.get(key);
  if (at !== undefined && Date.now() - at < FRESH_PRELOAD_MS) return;
  const started = generation;
  const promise = load()
    .then((value) => {
      if (generation !== started || value === null) return null;
      writePreloadedScreen(key, value);
      return value;
    })
    .catch(() => null)
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
}

/** Chargement d'avance en cours pour cet écran (résout ses données, ou null). */
export function inflightScreen(key: ScreenCacheKey): Promise<unknown> | undefined {
  return typeof key === "string" ? inflight.get(key) : undefined;
}

const invalidations = new Map<string, Set<() => void>>();

/** Écran à recharger tout de suite (action annulée, ADR 0195) : prévient l'écran affiché. */
export function invalidateScreen(key: string): void {
  for (const listener of invalidations.get(key) ?? []) listener();
}

export function onScreenInvalidated(key: string, listener: () => void): () => void {
  const listeners = invalidations.get(key) ?? new Set();
  listeners.add(listener);
  invalidations.set(key, listeners);
  return () => {
    listeners.delete(listener);
  };
}

/** Titre d'une fiche connu de la liste, affiché pendant son chargement (ADR 0193). */
export function setScreenPreview(key: string, preview: ScreenPreview): void {
  previews.set(key, preview);
}

export function readScreenPreview(key: string): ScreenPreview | undefined {
  return previews.get(key);
}

/** Onglet chargé d'avance (ADR 0192) : affiché tel quel s'il est ouvert dans les 20 secondes. */
export function writePreloadedScreen(key: string, value: unknown): void {
  writeScreenCache(key, value);
  preloadedAt.set(key, Date.now());
}

/** Préchargement encore frais pour cet écran ? Vrai une seule fois. */
export function takeFreshPreload(key: ScreenCacheKey): boolean {
  if (typeof key !== "string") return false;
  const at = preloadedAt.get(key);
  preloadedAt.delete(key);
  return at !== undefined && Date.now() - at < FRESH_PRELOAD_MS;
}

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
  if (key.startsWith(PERSISTED_PREFIX)) scheduleSave();
  while (byText.size > MAX_TEXT_KEYS) {
    const oldest = byText.keys().next().value;
    if (oldest === undefined) break;
    byText.delete(oldest);
  }
}

export function clearScreenCache(): void {
  byFunction = new WeakMap();
  byText.clear();
  preloadedAt.clear();
  inflight.clear();
  previews.clear();
  generation += 1;
}

/**
 * Compte connecté (identifiant, ou null) : les données d'un autre compte sont oubliées. À la
 * déconnexion ou au changement de compte, le fichier du téléphone est effacé aussi.
 */
export function setScreenCacheOwner(userId: string | null): void {
  if (userId === owner) return;
  const previous = owner;
  owner = userId;
  clearScreenCache();
  if (previous !== null) {
    clearTimeout(saveTimer);
    void store?.remove();
  }
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
