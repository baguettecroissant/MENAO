import type { DocumentPrefill, DocumentReadingWarning, ReadableDocumentType } from "@menao/core";
import { supabase } from "./supabase";

export type DocumentReadResult =
  | { status: "ok"; fields: DocumentPrefill; warnings: DocumentReadingWarning[] }
  | { status: "unavailable" };

/**
 * Lecture automatique d'un document déjà déposé dans « uploads » (ADR 0176), par l'Edge Function
 * read-document, comme sur le site. En cas d'échec, l'artisan remplit les champs lui-même.
 */
export async function readDocument(
  path: string,
  type: ReadableDocumentType,
): Promise<DocumentReadResult> {
  const { data, error } = await supabase.functions.invoke<{
    status: string;
    fields?: DocumentPrefill;
    warnings?: DocumentReadingWarning[];
  }>("read-document", { body: { path, type } });
  if (error || data?.status !== "ok") return { status: "unavailable" };
  return { status: "ok", fields: data.fields ?? {}, warnings: data.warnings ?? [] };
}
