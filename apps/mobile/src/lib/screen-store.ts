import { File, Paths } from "expo-file-system";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { restoreScreenCache, setScreenCacheStore, type ScreenCacheStore } from "./screen-cache";

const NAME = "menao-ecrans.json";
/** Au-delà, le premier écran s'affiche sans attendre le fichier (il chargera ses données). */
const RESTORE_TIMEOUT_MS = 400;

/**
 * Fichier des onglets gardés d'une ouverture à l'autre (ADR 0192) : dans le dossier privé de
 * l'application, effacé à la déconnexion ; localStorage sur la version web de développement.
 */
const fileStore: ScreenCacheStore = {
  async read() {
    try {
      if (Platform.OS === "web") return globalThis.localStorage?.getItem(NAME) ?? null;
      const file = new File(Paths.document, NAME);
      return file.exists ? await file.text() : null;
    } catch {
      return null;
    }
  },
  async write(text) {
    try {
      if (Platform.OS === "web") globalThis.localStorage?.setItem(NAME, text);
      else await new File(Paths.document, NAME).write(text);
    } catch {
      // Sans fichier, l'onglet se rechargera simplement à la prochaine ouverture.
    }
  },
  async remove() {
    try {
      if (Platform.OS === "web") globalThis.localStorage?.removeItem(NAME);
      else {
        const file = new File(Paths.document, NAME);
        if (file.exists) file.delete();
      }
    } catch {
      // Rien à faire.
    }
  },
};

setScreenCacheStore(fileStore);

/**
 * Onglets de la dernière ouverture relus pour ce compte avant d'afficher le premier écran :
 * `undefined` tant que la session n'est pas connue. Vrai dès que c'est fait (ou au bout de
 * 400 ms au plus).
 */
export function useScreenCacheRestored(user: string | null | undefined): boolean {
  const [restoredFor, setRestoredFor] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (user === undefined || user === null) return;
    let active = true;
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, RESTORE_TIMEOUT_MS));
    void Promise.race([restoreScreenCache(user), timeout]).then(() => {
      if (active) setRestoredFor(user);
    });
    return () => {
      active = false;
    };
  }, [user]);
  if (user === undefined) return false;
  return user === null || restoredFor === user;
}
