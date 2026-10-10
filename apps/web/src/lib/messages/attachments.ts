import { MAX_UPLOAD_BYTES } from "@menao/core";
import { invokeFunction } from "@/lib/project/client";
import type { UploadStatus } from "@/lib/project/photos";
import { createClient } from "@/lib/supabase/client";
import { resizeImage, uploadRaw } from "@/lib/upload/client";

const PHOTO_MAX_SIDE = 2000;
/** Photos et documents PDF acceptés dans une conversation (F-40). */
export const ATTACHMENT_ACCEPT = "image/jpeg,image/png,image/heic,image/heif,application/pdf";

/**
 * Pièce jointe d'une conversation (F-40) : photo réduite dans le navigateur (JPEG sans
 * métadonnées) ou document PDF, déposé dans « uploads », puis vérifié, rangé et enregistré par
 * process-upload. Le fichier ne transite pas par Vercel.
 */
export async function uploadMessageAttachment(
  chantierId: string,
  file: File,
): Promise<UploadStatus> {
  if (file.size > MAX_UPLOAD_BYTES) return "too_large";
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return "forbidden";
  let blob: Blob = file;
  if (file.type !== "application/pdf") {
    try {
      blob = await resizeImage(file, PHOTO_MAX_SIDE);
    } catch {
      return "unreadable";
    }
  }
  const path = await uploadRaw(userId, blob);
  if (!path) return "unavailable";
  const result = await invokeFunction<{ status: UploadStatus }>(supabase, "process-upload", {
    purpose: "message_attachment",
    path,
    chantierId,
  });
  return result.status;
}
