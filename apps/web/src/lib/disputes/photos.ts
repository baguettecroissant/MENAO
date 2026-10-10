import { MAX_UPLOAD_BYTES } from "@menao/core";
import { invokeFunction } from "@/lib/project/client";
import type { UploadStatus } from "@/lib/project/photos";
import { createClient } from "@/lib/supabase/client";
import { resizeImage, uploadRaw } from "@/lib/upload/client";

const PHOTO_MAX_SIDE = 2000;

/**
 * Photo d'un signalement (F-42) : réduite dans le navigateur (JPEG sans métadonnées), déposée
 * dans « uploads », puis vérifiée, rangée et enregistrée par process-upload.
 */
export async function uploadTicketPhoto(ticketId: string, file: File): Promise<UploadStatus> {
  if (file.size > MAX_UPLOAD_BYTES) return "too_large";
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
    purpose: "ticket_photo",
    path,
    ticketId,
  });
  return result.status;
}
