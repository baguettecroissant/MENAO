import { MAX_CHANTIER_PHOTOS_PER_BATCH, MAX_UPLOAD_BYTES } from "@menao/core";
import { invokeFunction } from "@/lib/project/client";
import type { UploadStatus } from "@/lib/project/photos";
import { createClient } from "@/lib/supabase/client";
import { resizeImage, uploadRaw } from "@/lib/upload/client";

const PHOTO_MAX_SIDE = 2000;

/** Contrôles avant envoi (F-22) : 10 Mo par photo, 10 photos à la fois. */
export function selectChantierPhotos(files: File[]): {
  accepted: File[];
  tooLarge: string[];
  tooMany: boolean;
} {
  const sized = files.filter((f) => f.size <= MAX_UPLOAD_BYTES);
  return {
    accepted: sized.slice(0, MAX_CHANTIER_PHOTOS_PER_BATCH),
    tooLarge: files.filter((f) => f.size > MAX_UPLOAD_BYTES).map((f) => f.name),
    tooMany: sized.length > MAX_CHANTIER_PHOTOS_PER_BATCH,
  };
}

/**
 * Photo du journal de chantier (F-22) : réduite dans le navigateur (JPEG sans métadonnées),
 * déposée dans « uploads », puis vérifiée, rangée et enregistrée par process-upload. Le fichier
 * ne transite pas par Vercel.
 */
export async function uploadChantierPhoto(chantierId: string, file: File): Promise<UploadStatus> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return "forbidden";
  let blob: Blob;
  try {
    blob = await resizeImage(file, PHOTO_MAX_SIDE);
  } catch {
    return "unreadable";
  }
  const path = await uploadRaw(userId, blob);
  if (!path) return "unavailable";
  const result = await invokeFunction<{ status: UploadStatus }>(supabase, "process-upload", {
    purpose: "chantier_photo",
    path,
    chantierId,
  });
  return result.status;
}
