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
 * Logos : PNG, pour garder la transparence (en JPEG, le fond transparent deviendrait noir).
 * `square` (photo de profil, affichée dans un cercle) : une photo presque carrée est recadrée au
 * centre ; un logo ou un bandeau est gardé entier, centré sur un carré avec une marge, pour que le
 * cercle ne le coupe jamais.
 */
export async function resizeImage(
  file: File,
  maxSide: number,
  {
    type = "image/jpeg",
    quality = 0.85,
    square = false,
  }: { type?: "image/jpeg" | "image/png"; quality?: number; square?: boolean } = {},
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const { width, height } = bitmap;
  const ratio = width / height;
  if (square && ratio >= 0.8 && ratio <= 1.25) {
    const crop = Math.min(width, height);
    canvas.width = canvas.height = Math.min(maxSide, crop);
    context?.drawImage(
      bitmap,
      (width - crop) / 2,
      (height - crop) / 2,
      crop,
      crop,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  } else if (square) {
    const side = Math.min(maxSide, Math.max(width, height));
    canvas.width = canvas.height = side;
    if (context && type === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, side, side);
    }
    const scale = (side * 0.88) / Math.max(width, height);
    context?.drawImage(
      bitmap,
      (side - width * scale) / 2,
      (side - height * scale) / 2,
      width * scale,
      height * scale,
    );
  } else {
    const scale = Math.min(1, maxSide / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encodage impossible"))),
      type,
      quality,
    ),
  );
}

/**
 * Retire un fichier brut de « uploads » quand il ne sera pas envoyé : document remplacé après sa
 * lecture automatique (ADR 0176). Sans conséquence si process-upload l'a déjà retiré.
 */
export async function discardRaw(path: string): Promise<void> {
  await createClient().storage.from("uploads").remove([path]);
}
