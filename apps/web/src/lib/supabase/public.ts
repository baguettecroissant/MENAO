import { createClient } from "@supabase/supabase-js";
import type { Database } from "@menao/db";
import { env } from "@/env";

/**
 * Client sans session, pour les données publiques (référentiels) des pages statiques :
 * n'utilise pas les cookies, la page reste servie depuis le cache (spec §4.4).
 */
export function createPublicClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
