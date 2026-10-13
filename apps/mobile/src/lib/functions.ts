import { FunctionsHttpError } from "@supabase/supabase-js";
import { fr } from "@/i18n/fr";

/** Page hébergée ouverte par une Edge Function (signature, paiement), ou message d'erreur. */
export type Opened = { url: string } | { error: string };

/** Message d'une fonction refusée pour une règle métier (409), sinon le message proposé. */
export async function functionError(error: unknown, fallback: string): Promise<string> {
  if (!(error instanceof FunctionsHttpError) || error.context.status !== 409) return fallback;
  const body = (await error.context.json().catch(() => null)) as { message?: string } | null;
  return body?.message ?? fallback;
}

/** Erreur SQL : message des règles métier (code 22023), sinon message générique. */
export const sqlError = (error: { code?: string; message: string }) =>
  error.code === "22023" ? error.message : fr.errors.generic;
