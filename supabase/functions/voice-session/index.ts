// Edge Function voice-session (F-83, ADR 0232) : ouvre un appel d'essai avec la secrétaire dédiée
// de l'artisan connecté (appel web depuis son espace). Vérifie que sa formule comprend la
// secrétaire, prépare le contexte de l'appel (nom annoncé, métiers, zone, horaires, consignes) et
// signe un jeton de 30 minutes qui dit pour quel artisan les outils agissent. Minutes épuisées :
// mode « message » (prise de message seulement). Aucune donnée personnelle dans les journaux.
import { parseAiAgents } from "../../../packages/core/src/ai-agents.ts";
import {
  secretaryHoursText,
  signVoiceSession,
} from "../../../packages/core/src/voice-assistant.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { withCors } from "../_shared/cors.ts";
import { env } from "../_shared/env.ts";

const SESSION_MINUTES = 30;

Deno.serve(
  withCors(async (req) => {
    if (req.method !== "POST") return new Response(null, { status: 405 });
    const admin = adminClient();
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    const { data: userData } = token ? await admin.auth.getUser(token) : { data: null };
    const user = userData?.user;
    if (!user) return json({ status: "forbidden" }, 401);

    const { data: artisan } = await admin
      .from("artisans")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!artisan) return json({ status: "forbidden" }, 403);

    const { data: context, error } = await admin.rpc("voice_secretary_context", {
      p_artisan_id: artisan.id,
    });
    if (error || !context || typeof context !== "object") {
      console.error("voice-session : contexte illisible", error?.code ?? "");
      return json({ status: "unavailable" }, 503);
    }
    const c = context as {
      entreprise?: string;
      metiers?: string;
      zone?: string;
      horaires?: unknown;
      consignes?: string | null;
      rendez_vous?: boolean;
      droits?: unknown;
    };
    const rights = parseAiAgents(c.droits);
    if (!rights.agents.secretary) return json({ status: "non_inclus" }, 403);

    const secret = env("VAPI_SERVER_SECRET");
    if (!secret) return json({ status: "unavailable" }, 503);
    const session = await signVoiceSession(
      secret,
      artisan.id as string,
      Date.now() + SESSION_MINUTES * 60_000,
    );
    const hours = secretaryHoursText(c.horaires);
    return json({
      status: "ok",
      variables: {
        jeton: session,
        entreprise: c.entreprise ?? "",
        metiers: c.metiers || "non précisés",
        zone: c.zone || "non précisée",
        horaires: hours || "non renseignés",
        consignes: c.consignes || "aucune",
        rendez_vous: c.rendez_vous === false || !hours ? "non" : "oui",
        mode: rights.remainingSeconds > 0 ? "complet" : "message",
      },
    });
  }),
);
