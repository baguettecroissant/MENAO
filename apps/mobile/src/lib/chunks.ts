/**
 * Découpage d'une valeur en morceaux : le trousseau du téléphone (expo-secure-store) refuse les
 * valeurs trop longues, alors qu'une session Supabase dépasse souvent 2 Ko.
 */
export function splitIntoChunks(value: string, size: number): string[] {
  if (size <= 0) throw new Error("Taille de morceau invalide");
  if (value === "") return [""];
  const chunks: string[] = [];
  for (let start = 0; start < value.length; start += size) {
    chunks.push(value.slice(start, start + size));
  }
  return chunks;
}

/** Morceaux relus : null si l'un manque (valeur incomplète, à ignorer). */
export function joinChunks(chunks: readonly (string | null)[]): string | null {
  if (chunks.length === 0 || chunks.some((chunk) => chunk === null)) return null;
  return chunks.join("");
}
