// Logo de l'entreprise sur ses documents (ADR 0038) : lu dans le bucket privé artisan-logos avec
// la clé serveur, une fois l'accès vérifié par les fonctions SQL *_document. Fichier absent ou
// illisible : le document sort sans logo plutôt qu'en erreur.
import type { SupabaseClient } from "@supabase/supabase-js";
import { detectFileType } from "../../../packages/core/src/files.ts";
import type { DocumentLogo } from "../../../packages/documents/src/pdf-layout.ts";

export async function documentLogo(
  admin: SupabaseClient,
  path: string | null | undefined,
): Promise<DocumentLogo | null> {
  if (!path) return null;
  const { data, error } = await admin.storage.from("artisan-logos").download(path);
  if (error || !data) {
    console.error("logo des documents : lecture impossible");
    return null;
  }
  const bytes = new Uint8Array(await data.arrayBuffer());
  const type = detectFileType(bytes);
  return type === "png" || type === "jpeg" ? { bytes, type } : null;
}
