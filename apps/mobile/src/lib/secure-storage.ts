import * as SecureStore from "expo-secure-store";
import { joinChunks, splitIntoChunks } from "./chunks";

const CHUNK_SIZE = 1800;
const countKey = (key: string) => `${key}.n`;
const chunkKey = (key: string, index: number) => `${key}.${index}`;

async function readCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(countKey(key));
  const count = raw === null ? 0 : Number.parseInt(raw, 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

async function removeChunks(key: string, from: number, to: number): Promise<void> {
  const removals: Promise<void>[] = [];
  for (let index = from; index < to; index += 1) {
    removals.push(SecureStore.deleteItemAsync(chunkKey(key, index)));
  }
  await Promise.all(removals);
}

/**
 * Stockage de la session Supabase dans le trousseau chiffré du téléphone (Keychain sur iPhone,
 * Keystore sur Android), découpée en morceaux.
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const count = await readCount(key);
    if (count === 0) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index))),
    );
    return joinChunks(chunks);
  },
  async setItem(key: string, value: string): Promise<void> {
    const previous = await readCount(key);
    const chunks = splitIntoChunks(value, CHUNK_SIZE);
    await Promise.all(
      chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk)),
    );
    await SecureStore.setItemAsync(countKey(key), String(chunks.length));
    if (previous > chunks.length) await removeChunks(key, chunks.length, previous);
  },
  async removeItem(key: string): Promise<void> {
    const count = await readCount(key);
    await removeChunks(key, 0, count);
    await SecureStore.deleteItemAsync(countKey(key));
  },
};
