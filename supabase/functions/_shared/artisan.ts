import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.ts";

export function adminClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

export function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export type ArtisanRow = {
  id: string;
  status: string;
  raison_sociale: string | null;
  stripe_customer_id: string | null;
};

/** Utilisateur connecté (jeton vérifié auprès de Supabase Auth) et sa fiche artisan. */
export async function currentArtisan(req: Request, admin: SupabaseClient) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  if (!data?.user) return null;
  const { data: artisan } = await admin
    .from("artisans")
    .select("id, status, raison_sociale, stripe_customer_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  return artisan ? { user: data.user, artisan: artisan as ArtisanRow } : null;
}
