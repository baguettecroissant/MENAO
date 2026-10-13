import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

/** Relances après le retour d'un paiement ou d'une signature, confirmés par webhook. */
const RETRY_DELAYS_MS = [1500, 3000, 5000, 8000];

/**
 * Données d'un écran, rechargées à chaque retour sur l'écran (undefined pendant le premier
 * chargement). Tant que `waiting` répond vrai (paiement ou signature en cours d'enregistrement),
 * le chargement est relancé quelques fois. `load` et `waiting` doivent être stables (useCallback).
 */
export function useFocusData<T>(load: () => Promise<T>, waiting?: (value: T) => boolean) {
  const [data, setData] = useState<T | undefined>(undefined);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const run = (attempt: number) => {
        load().then((value) => {
          if (!active) return;
          setData(value);
          const delay = RETRY_DELAYS_MS[attempt];
          if (delay !== undefined && waiting?.(value)) {
            timer = setTimeout(() => run(attempt + 1), delay);
          }
        });
      };
      run(0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }, [load, waiting]),
  );
  return data;
}
