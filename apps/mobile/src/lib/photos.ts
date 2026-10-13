import { MAX_UPLOAD_BYTES } from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";
import { fitWithin, uploadId, type UploadStatus } from "./uploads";

/** Qualité JPEG des photos réduites, comme sur le site. */
const JPEG_QUALITY = 0.85;

/** Photo choisie dans la photothèque ou prise avec l'appareil photo. */
export type PickedPhoto = { uri: string };

/** Où ranger la photo : journal du chantier (F-22), conversation (F-40) ou signalement (F-42). */
export type PhotoTarget =
  | { purpose: "chantier_photo"; chantierId: string }
  | { purpose: "message_attachment"; chantierId: string }
  | { purpose: "ticket_photo"; ticketId: string };

/**
 * « Prendre une photo » ou « Choisir dans mes photos ». La version web ouvre directement le
 * sélecteur de fichiers (pas de boîte de dialogue native).
 */
export function choosePhotoSource(title: string): Promise<"camera" | "library" | null> {
  if (Platform.OS === "web") return Promise.resolve("library");
  return new Promise((resolve) => {
    Alert.alert(
      title,
      undefined,
      [
        { text: fr.photos.camera, onPress: () => resolve("camera") },
        { text: fr.photos.library, onPress: () => resolve("library") },
        { text: fr.photos.cancel, style: "cancel", onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

/**
 * Photos choisies (sélecteur du système : aucune autorisation n'est demandée pour la photothèque)
 * ou prise de vue (autorisation de l'appareil photo demandée la première fois). Liste vide si
 * l'utilisateur annule.
 */
export async function pickPhotos(
  source: "camera" | "library",
  max = 1,
): Promise<{ photos: PickedPhoto[] } | { error: string }> {
  try {
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return { error: fr.photos.cameraDenied };
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      quality: 1,
      allowsMultipleSelection: max > 1,
      selectionLimit: max,
    };
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return { photos: [] };
    return { photos: result.assets.slice(0, max).map((asset) => ({ uri: asset.uri })) };
  } catch {
    return { error: fr.photos.failed };
  }
}

/**
 * Photo réduite (2 000 px au plus) et réencodée en JPEG, comme sur le site : fichier léger, photos
 * HEIC de l'iPhone converties, métadonnées (dont la position GPS) retirées.
 */
async function toJpeg(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  const original = await context.renderAsync();
  context.release();
  const size = fitWithin(original.width, original.height);
  let image = original;
  if (size) {
    const resizing = ImageManipulator.manipulate(original).resize(size);
    image = await resizing.renderAsync();
    resizing.release();
    original.release();
  }
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  image.release();
  return saved.uri;
}

async function readBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === "web") return new Uint8Array(await (await fetch(uri)).arrayBuffer());
  return new File(uri).bytes();
}

/** Copie réduite retirée du cache du téléphone une fois envoyée. */
function removeCopy(uri: string) {
  if (Platform.OS === "web") return;
  try {
    new File(uri).delete();
  } catch {
    // Fichier déjà retiré : rien à faire.
  }
}

/**
 * Envoi d'une photo, comme sur le site : réduite sur le téléphone, déposée dans
 * « uploads/<user_id>/<uuid> », puis vérifiée, rangée et enregistrée par process-upload.
 */
export async function uploadPhoto(target: PhotoTarget, photo: PickedPhoto): Promise<UploadStatus> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return "forbidden";
  let jpeg: string;
  let bytes: Uint8Array;
  try {
    jpeg = await toJpeg(photo.uri);
    bytes = await readBytes(jpeg);
  } catch {
    return "unreadable";
  }
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_UPLOAD_BYTES) {
    removeCopy(jpeg);
    return bytes.byteLength === 0 ? "unreadable" : "too_large";
  }
  const path = `${userId}/${uploadId()}`;
  const { error: uploadError } = await supabase.storage
    .from("uploads")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  removeCopy(jpeg);
  if (uploadError) return "unavailable";

  const { data: result, error } = await supabase.functions.invoke<{ status: UploadStatus }>(
    "process-upload",
    { body: { ...target, path } },
  );
  if (error instanceof FunctionsHttpError) {
    const payload = (await error.context.json().catch(() => null)) as {
      status?: UploadStatus;
    } | null;
    return payload?.status ?? "unavailable";
  }
  return error || !result ? "unavailable" : result.status;
}
