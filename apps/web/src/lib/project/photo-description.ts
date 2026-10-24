"use client";

import { PHOTO_DESCRIPTION_MAX_BASE64, PHOTO_DESCRIPTION_MAX_SIDE } from "@menao/core";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/upload/client";

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Photo → description (ADR 0180) : une copie réduite de la photo (JPEG, sans métadonnées) est
 * envoyée à describe-photo, sans session ; la photo du projet suit son propre chemin. null si la
 * photo est illisible, hors sujet ou si la fonction ne répond pas.
 */
export async function describeProjectPhoto(file: File): Promise<string | null> {
  try {
    const image = await toBase64(
      await resizeImage(file, PHOTO_DESCRIPTION_MAX_SIDE, { quality: 0.8 }),
    );
    if (!image || image.length > PHOTO_DESCRIPTION_MAX_BASE64) return null;
    const { data, error } = await createClient().functions.invoke<{
      status: string;
      description?: string;
    }>("describe-photo", { method: "POST", body: { image } });
    return !error && data?.status === "ok" && data.description ? data.description : null;
  } catch {
    return null;
  }
}
