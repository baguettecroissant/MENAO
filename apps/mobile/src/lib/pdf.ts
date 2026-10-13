import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { fetch } from "expo/fetch";
import { env } from "./env";
import { supabase } from "./supabase";

/** Document à produire par generate-pdf : devis, facture ou PV de réception. */
export type PdfTarget = { quoteId: string } | { invoiceId: string } | { receptionId: string };

/** Nom du fichier donné par le serveur (`DEV-2026-0001.pdf`), sinon celui proposé. */
function fileName(disposition: string | null, fallback: string): string {
  const name = disposition?.match(/filename="([^"]+)"/)?.[1] ?? `${fallback}.pdf`;
  return name.replace(/[^\w.-]+/g, "-");
}

/**
 * PDF d'un document, produit par generate-pdf avec le jeton du compte (les fonctions SQL décident
 * de l'accès), puis proposé au partage du téléphone : enregistrer dans Fichiers, imprimer,
 * envoyer. Le fichier reste dans le cache de l'application.
 */
export async function sharePdf(target: PdfTarget, fallbackName: string): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token || !(await Sharing.isAvailableAsync())) return false;
    const response = await fetch(`${env.supabaseUrl}/functions/v1/generate-pdf`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.supabaseKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(target),
    });
    if (!response.ok) return false;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const file = new File(
      Paths.cache,
      fileName(response.headers.get("content-disposition"), fallbackName),
    );
    file.create({ overwrite: true });
    file.write(bytes);
    await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
    return true;
  } catch {
    return false;
  }
}
