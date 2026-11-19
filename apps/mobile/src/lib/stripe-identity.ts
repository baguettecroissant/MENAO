import { type ConnectIdentityDocument, isStripeFileId, stripeIdentitySides } from "@menao/core";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { supabase } from "./supabase";
import { myArtisanKey } from "./team";

type IdentityRow = {
  status: string;
  storage_path: string;
  mime_type: string;
  verso_path: string | null;
  verso_mime_type: string | null;
  partage_stripe: boolean;
};

/** Pièce d'identité du dossier : la validée, sinon la dernière non refusée. */
async function loadIdentity(): Promise<IdentityRow | null> {
  const { data } = await supabase
    .from("artisan_documents")
    .select("status, storage_path, mime_type, verso_path, verso_mime_type, partage_stripe")
    .eq("artisan_id", await myArtisanKey())
    .eq("type", "identite")
    .neq("status", "refuse");
  const rows = (data ?? []) as IdentityRow[];
  return rows.find((row) => row.status === "valide") ?? rows[0] ?? null;
}

/** Côtés transmissibles à Stripe (ADR 0378) : photos seulement, sauf refus de l'artisan. */
function sharedSides(row: IdentityRow | null) {
  return row
    ? stripeIdentitySides({
        share: row.partage_stripe,
        mimeType: row.mime_type,
        versoMimeType: row.verso_mime_type,
      })
    : [];
}

/** La pièce déposée pourra être transmise à Stripe (encart « Transmis pour vous »). */
export async function identityShareable(): Promise<boolean> {
  return sharedSides(await loadIdentity()).length > 0;
}

/** Dépose un fichier chez Stripe avec la clé publique ; renvoie son identifiant, sinon null. */
async function sendToStripe(publishableKey: string, url: string, mime: string) {
  const name = mime === "image/png" ? "piece.png" : "piece.jpg";
  const body = new FormData();
  body.append("purpose", "identity_document");
  let copy: File | null = null;
  if (Platform.OS === "web") {
    body.append("file", await (await fetch(url)).blob(), name);
  } else {
    // Copie temporaire sur le téléphone, retirée juste après l'envoi.
    copy = await File.downloadFileAsync(url, new Directory(Paths.cache));
    body.append("file", { uri: copy.uri, name, type: mime } as unknown as Blob);
  }
  try {
    const response = await fetch("https://files.stripe.com/v1/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${publishableKey}` },
      body,
    });
    const id = ((await response.json()) as { id?: unknown }).id;
    return isStripeFileId(id) ? id : null;
  } finally {
    try {
      copy?.delete();
    } catch {
      // Copie déjà retirée : rien à faire.
    }
  }
}

/**
 * Pièce d'identité déjà déposée dans MENAO, transmise à Stripe par l'application (ADR 0378),
 * comme sur le site : le fichier va de l'espace privé de MENAO à Stripe sans autre intermédiaire.
 * Un échec, une pièce en PDF ou un refus de l'artisan laissent Stripe la redemander.
 */
export async function uploadIdentityToStripe(
  publishableKey: string,
): Promise<ConnectIdentityDocument | null> {
  try {
    const row = await loadIdentity();
    const sides = sharedSides(row);
    if (!row || !sides.includes("recto")) return null;
    const paths =
      sides.includes("verso") && row.verso_path
        ? [row.storage_path, row.verso_path]
        : [row.storage_path];
    const { data } = await supabase.storage.from("artisan-documents").createSignedUrls(paths, 120);
    const urlOf = (path: string) => data?.find((entry) => entry.path === path)?.signedUrl ?? null;
    const frontUrl = urlOf(row.storage_path);
    if (!frontUrl) return null;
    const front = await sendToStripe(publishableKey, frontUrl, row.mime_type);
    if (!front) return null;
    const backUrl = paths.length > 1 && row.verso_path ? urlOf(row.verso_path) : null;
    const back =
      backUrl && row.verso_mime_type
        ? await sendToStripe(publishableKey, backUrl, row.verso_mime_type)
        : null;
    return back ? { front, back } : { front };
  } catch {
    return null;
  }
}
