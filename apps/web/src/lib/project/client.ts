import { FunctionsHttpError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type BrowserClient = ReturnType<typeof createClient>;

/**
 * Session du visiteur : celle du compte connecté, sinon une session anonyme Supabase (ADR 0012).
 * Le projet est rattaché à cet utilisateur et le restera s'il crée son compte.
 */
export async function ensureSession(): Promise<{ supabase: BrowserClient; userId: string } | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (data.session) return { supabase, userId: data.session.user.id };
  const { data: anonymous, error } = await supabase.auth.signInAnonymously();
  if (error || !anonymous.user) return null;
  return { supabase, userId: anonymous.user.id };
}

/** Appelle une Edge Function et renvoie son corps JSON, y compris en cas d'erreur HTTP. */
export async function invokeFunction<T extends { status: string }>(
  supabase: BrowserClient,
  name: string,
  body: Record<string, unknown>,
): Promise<T | { status: "unavailable" }> {
  const { data, error } = await supabase.functions.invoke<T>(name, { method: "POST", body });
  if (error instanceof FunctionsHttpError) {
    const payload = (await error.context.json().catch(() => null)) as T | null;
    return payload?.status ? payload : { status: "unavailable" };
  }
  return error || !data ? { status: "unavailable" } : data;
}
