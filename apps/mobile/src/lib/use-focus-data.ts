import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  readScreenCache,
  sameScreenData,
  takeFreshPreload,
  writeScreenCache,
  type ScreenCacheKey,
} from "./screen-cache";

/** Relances après le retour d'un paiement ou d'une signature, confirmés par webhook. */
const RETRY_DELAYS_MS = [1500, 3000, 5000, 8000];

/**
 * Données d'un écran, rechargées à chaque retour sur l'écran, et fonction pour les recharger après
 * une action. Un écran déjà ouvert pendant la session s'affiche aussitôt avec ses dernières
 * données (screen-cache), mises à jour en arrière-plan ; undefined seulement au tout premier
 * chargement. L'écran n'est redessiné que si les données ont changé.
 * Tant que `waiting` répond vrai (paiement ou signature en cours d'enregistrement), le chargement
 * est relancé quelques fois. `load` et `waiting` doivent être stables (useCallback) ; un écran à
 * paramètre passe `cacheKey` (« chantier:<id> »), sa fonction changeant à chaque ouverture. Un
 * onglet (« tab:… ») est gardé sur le téléphone ; chargé d'avance à l'instant (préchargement,
 * ADR 0192), il s'affiche sans recharger.
 */
export function useFocusData<T>(
  load: () => Promise<T>,
  waiting?: (value: T) => boolean,
  cacheKey?: string,
): readonly [T | undefined, () => Promise<void>] {
  const key: ScreenCacheKey = cacheKey ?? load;
  const [data, setData] = useState<T | undefined>(() => readScreenCache<T>(key));
  const apply = useCallback(
    (value: T) => {
      writeScreenCache(key, value);
      setData((current) => (sameScreenData(current, value) ? current : value));
    },
    [key],
  );
  useFocusEffect(
    useCallback(() => {
      let active = true;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const run = (attempt: number) => {
        load().then((value) => {
          if (!active) return;
          apply(value);
          const delay = RETRY_DELAYS_MS[attempt];
          if (delay !== undefined && waiting?.(value)) {
            timer = setTimeout(() => run(attempt + 1), delay);
          }
        });
      };
      if (takeFreshPreload(key)) {
        const preloaded = readScreenCache<T>(key);
        if (preloaded !== undefined) apply(preloaded);
      } else {
        run(0);
      }
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }, [load, waiting, apply, key]),
  );
  const reload = useCallback(() => load().then(apply), [load, apply]);
  return [data, reload] as const;
}
