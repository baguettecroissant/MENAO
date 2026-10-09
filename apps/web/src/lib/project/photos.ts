import { MAX_PROJECT_PHOTOS, MAX_UPLOAD_BYTES } from "@menao/core";
import { resizeImage, uploadRaw } from "@/lib/upload/client";
import { invokeFunction, type ensureSession } from "./client";

type Session = NonNullable<Awaited<ReturnType<typeof ensureSession>>>;

export const PHOTO_ACCEPT = "image/jpeg,image/png,image/heic,image/heif";
const PHOTO_MAX_SIDE = 2000;

export type PhotoSelection = { accepted: File[]; errors: string[] };

/** Contrôles avant envoi (spec F-05) : 10 Mo par photo, 10 photos au total. */
export function selectPhotos(
  files: File[],
  alreadySelected: number,
  messages: { tooMany: string; tooLarge: (name: string) => string },
): PhotoSelection {
  const accepted: File[] = [];
  const errors: string[] = [];
  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      errors.push(messages.tooLarge(file.name));
    } else if (alreadySelected + accepted.length >= MAX_PROJECT_PHOTOS) {
      if (!errors.includes(messages.tooMany)) errors.push(messages.tooMany);
    } else {
      accepted.push(file);
    }
  }
  return { accepted, errors };
}

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

/**
 * Réduit la photo dans le navigateur (JPEG, sans métadonnées ; HEIC décodé si le navigateur le
 * sait), la dépose dans « uploads » puis la fait vérifier et ranger par process-upload.
 */
export async function uploadProjectPhoto(
  session: Session,
  projectId: string,
  file: File,
): Promise<UploadStatus> {
  let blob: Blob;
  try {
    blob = await resizeImage(file, PHOTO_MAX_SIDE);
  } catch {
    return "unreadable";
  }
  const path = await uploadRaw(session.userId, blob);
  if (!path) return "unavailable";
  const result = await invokeFunction<{ status: UploadStatus }>(
    session.supabase,
    "process-upload",
    {
      purpose: "project_photo",
      path,
      projectId,
    },
  );
  return result.status;
}
