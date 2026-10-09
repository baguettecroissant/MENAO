import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@menao/db";
import { env } from "@/env";

/** Client Supabase du navigateur (session lue dans les cookies posés côté serveur). */
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
