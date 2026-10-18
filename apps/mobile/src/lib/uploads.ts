/**
 * Envoi des photos (F-22, F-40, F-42), sans dépendance native : nom du fichier déposé dans
 * « uploads », taille des photos réduites et bilan d'un envoi groupé, comme sur le site.
 */

/** Statut renvoyé par process-upload, plus « unreadable » (photo illisible sur le téléphone). */
export type UploadStatus =
  | "ok"
  | "unreadable"
  | "invalid"
  | "invalid_type"
  | "too_large"
  | "not_found"
  | "locked"
  | "limit"
  | "forbidden"
  | "rate_limited"
  | "unavailable";

/** Côté le plus long d'une photo envoyée, comme sur le site (spec §4.4 : fichiers légers). */
export const PHOTO_MAX_SIDE = 2000;
/** Côté de la photo de profil, comme sur le site. */
export const AVATAR_MAX_SIDE = 512;
/** Côté du logo des documents, comme sur le site (PNG gardé pour la transparence, ADR 0125). */
export const LOGO_MAX_SIDE = 600;

/** Dimensions de la photo réduite (proportions gardées), ou null si elle est déjà assez petite. */
export function fitWithin(
  width: number,
  height: number,
  maxSide = PHOTO_MAX_SIDE,
): { width: number; height: number } | null {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return null;
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Nom du fichier déposé : un UUID v4, seul format accepté par process-upload. Hermes ne fournit pas
 * crypto.randomUUID ; le nom n'a besoin que d'être unique dans le dossier de l'utilisateur.
 */
export function uploadId(random?: () => number): string {
  if (!random && typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const next = random ?? Math.random;
  const hex = Array.from({ length: 32 }, (_, i) => {
    if (i === 12) return "4";
    const n = Math.floor(next() * 16);
    return (i === 16 ? (n & 0x3) | 0x8 : n).toString(16);
  }).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type BatchResult = {
  added: number;
  failed: number;
  /** Envoi interrompu : plafond de photos du chantier atteint, ou trop d'envois en peu de temps. */
  stopped: "limit" | "rate_limited" | null;
};

/**
 * Photos du journal envoyées une à une (F-22), comme sur le site : l'envoi s'arrête au plafond du
 * chantier ou à la limite de fréquence, les autres échecs sont comptés.
 */
export async function uploadBatch<T>(
  items: readonly T[],
  upload: (item: T) => Promise<UploadStatus>,
  onProgress?: (done: number, total: number) => void,
): Promise<BatchResult> {
  const result: BatchResult = { added: 0, failed: 0, stopped: null };
  for (const [i, item] of items.entries()) {
    onProgress?.(i + 1, items.length);
    const status = await upload(item);
    if (status === "ok") {
      result.added += 1;
    } else if (status === "limit" || status === "rate_limited") {
      result.stopped = status;
      break;
    } else {
      result.failed += 1;
    }
  }
  return result;
}
