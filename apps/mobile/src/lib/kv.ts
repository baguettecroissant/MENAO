import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Petites valeurs gardées sur le téléphone : trousseau chiffré (SecureStore), localStorage sur
 * la version web de développement. Une valeur illisible vaut « absente ».
 */
export const kv = {
  async get(key: string): Promise<string | null> {
    try {
      if (Platform.OS === "web") return globalThis.localStorage?.getItem(key) ?? null;
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === "web") globalThis.localStorage?.setItem(key, value);
      else await SecureStore.setItemAsync(key, value);
    } catch {
      // Sans stockage, la demande en attente ne sera simplement pas reprise.
    }
  },
  async remove(key: string): Promise<void> {
    try {
      if (Platform.OS === "web") globalThis.localStorage?.removeItem(key);
      else await SecureStore.deleteItemAsync(key);
    } catch {
      // Rien à faire.
    }
  },
};
