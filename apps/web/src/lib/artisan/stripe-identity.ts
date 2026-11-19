import { type ConnectIdentityDocument, isStripeFileId } from "@menao/core";
import { identityFilesForStripe } from "./actions";

/** Dépose un fichier chez Stripe avec la clé publique ; renvoie son identifiant, sinon null. */
async function sendToStripe(publishableKey: string, url: string): Promise<string | null> {
  const blob = await (await fetch(url)).blob();
  const body = new FormData();
  body.set("purpose", "identity_document");
  body.set("file", blob, blob.type === "image/png" ? "piece.png" : "piece.jpg");
  const response = await fetch("https://files.stripe.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${publishableKey}` },
    body,
  });
  const id = ((await response.json()) as { id?: unknown }).id;
  return isStripeFileId(id) ? id : null;
}

/**
 * Pièce d'identité déjà déposée dans MENAO, transmise à Stripe par le navigateur de l'artisan
 * (ADR 0378) : le fichier va de l'espace privé de MENAO à Stripe sans autre intermédiaire, comme
 * les jetons du pré-remplissage (ADR 0204). Un échec, une pièce en PDF ou un refus de l'artisan
 * laissent simplement Stripe la redemander.
 */
export async function uploadIdentityToStripe(
  publishableKey: string,
): Promise<ConnectIdentityDocument | null> {
  try {
    const files = await identityFilesForStripe();
    if (!files) return null;
    const front = await sendToStripe(publishableKey, files.front);
    if (!front) return null;
    const back = files.back ? await sendToStripe(publishableKey, files.back) : null;
    return back ? { front, back } : { front };
  } catch {
    return null;
  }
}
