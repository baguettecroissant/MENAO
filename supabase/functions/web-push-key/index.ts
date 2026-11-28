// Edge Function web-push-key (F-196, ADR 0396) : clé publique VAPID des notifications sur le
// téléphone, lue par le navigateur pour s'abonner. La clé est publique ; la clé privée reste dans
// les secrets de notify. Sans clé, l'activation n'est pas proposée.
import { withCors } from "../_shared/cors.ts";
import { env } from "../_shared/env.ts";

Deno.serve(
  withCors(async (req) => {
    if (req.method !== "POST") return new Response(null, { status: 405 });
    const key = env("VAPID_PUBLIC_KEY");
    return new Response(JSON.stringify(key ? { status: "ok", key } : { status: "unavailable" }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
);
