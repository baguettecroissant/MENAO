import { PHOTO_DESCRIPTION_MAX_BASE64, PHOTO_DESCRIPTION_MAX_SIDE } from "@menao/core";
import { photoBase64, type PickedPhoto } from "./photos";
import { supabase } from "./supabase";

/**
 * Photo → description (ADR 0180), comme sur le site : une copie réduite de la photo est envoyée à
 * describe-photo, sans créer de session ; la photo du projet suit son propre chemin. null si la
 * photo est illisible, hors sujet, un PDF, ou si la fonction ne répond pas.
 */
export async function describeProjectPhoto(photo: PickedPhoto): Promise<string | null> {
  if (photo.pdf) return null;
  const image = await photoBase64(photo.uri, PHOTO_DESCRIPTION_MAX_SIDE);
  if (!image || image.length > PHOTO_DESCRIPTION_MAX_BASE64) return null;
  const { data, error } = await supabase.functions.invoke<{
    status: string;
    description?: string;
  }>("describe-photo", { method: "POST", body: { image } });
  return !error && data?.status === "ok" && data.description ? data.description : null;
}
