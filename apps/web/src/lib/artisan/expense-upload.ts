import { MAX_UPLOAD_BYTES } from "@menao/core";
import { createClient } from "@/lib/supabase/client";
import { resizeImage, uploadRaw } from "@/lib/upload/client";

/** Photo d'une pièce : réduite avant l'envoi, assez nette pour être lue (comme les documents). */
const RECEIPT_PHOTO_MAX_SIDE = 2400;

/**
 * Pièce d'une dépense (F-62) : photo réduite dans le navigateur (JPEG sans métadonnées) ou PDF tel
 * quel, déposée dans « uploads ». Elle est lue par read-expense, puis rangée par process-upload à
 * l'enregistrement de la dépense. Le fichier ne transite pas par Vercel.
 */
export async function uploadExpenseDocument(
  file: File,
): Promise<{ path: string } | { error: "too_large" | "unavailable" }> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return { error: "unavailable" };
  let blob: Blob = file;
  if (file.type.startsWith("image/")) {
    try {
      blob = await resizeImage(file, RECEIPT_PHOTO_MAX_SIDE);
    } catch {
      blob = file;
    }
  }
  if (blob.size > MAX_UPLOAD_BYTES) return { error: "too_large" };
  const path = await uploadRaw(userId, blob);
  return path ? { path } : { error: "unavailable" };
}
