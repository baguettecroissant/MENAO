import { MAX_UPLOAD_BYTES } from "@menao/core";
import { createClient } from "@/lib/supabase/client";

/**
 * Dépose un fichier brut dans « uploads/<userId>/<uuid> ». Il sera vérifié puis rangé par
 * l'Edge Function process-upload (via une Server Action) ; le navigateur n'écrit jamais
 * dans les espaces définitifs.
 */
export async function uploadRaw(userId: string, file: Blob): Promise<string | null> {
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) return null;
  const path = `${userId}/${crypto.randomUUID()}`;
  const { error } = await createClient()
    .storage.from("uploads")
    .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
  return error ? null : path;
}

/**
 * Redimensionne une photo dans le navigateur (côté le plus long ≤ maxSide) et la réencode
 * en JPEG : fichier plus léger (spec §4.4) et sans métadonnées. L'orientation EXIF est
 * appliquée par createImageBitmap. Les métadonnées sont de toute façon retirées côté serveur.
 */
export async function resizeImage(file: File, maxSide: number, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encodage impossible"))),
      "image/jpeg",
      quality,
    ),
  );
}
