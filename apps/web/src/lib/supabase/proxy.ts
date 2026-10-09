import { createServerClient } from "@supabase/ssr";
import type { Database } from "@menao/db";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/env";

/**
 * Rafraîchit la session Supabase (cookies) et renvoie les claims vérifiés du JWT.
 * Doit être appelé avant toute autre logique dans le proxy.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    },
  );

  // getClaims() vérifie la signature du JWT : ne jamais se fier à getSession() côté serveur.
  const { data } = await supabase.auth.getClaims();
  return { response, claims: data?.claims ?? null };
}
