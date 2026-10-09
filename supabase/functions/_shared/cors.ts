// CORS des fonctions appelées directement par le navigateur (recherche IA, photos de projet).
// Sur Supabase hébergé, la fonction répond elle-même à la requête préalable OPTIONS ; seules les
// origines de SITE_URLS sont autorisées. (En local, la passerelle de la CLI le fait déjà.)
import { env } from "./env.ts";

function allowedOrigins(): string[] {
  return env("SITE_URLS")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  if (!allowedOrigins().includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** Enveloppe un gestionnaire : répond aux OPTIONS et ajoute les en-têtes CORS aux réponses. */
export function withCors(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const headers = corsHeaders(req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const response = await handler(req);
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
    return response;
  };
}
