import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@menao/db";
import { cookies } from "next/headers";
import { env } from "@/env";

/** Client Supabase côté serveur (Server Components, Server Actions, Route Handlers). */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Appel depuis un Server Component : les cookies ne sont pas modifiables.
            // Le proxy rafraîchit la session, on peut ignorer.
          }
        },
      },
    },
  );
}
