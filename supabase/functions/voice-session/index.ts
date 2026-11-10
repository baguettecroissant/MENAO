// Edge Function voice-session (F-83, ADR 0232) : ouvre un appel d'essai avec la secrétaire dédiée
// de l'artisan connecté (appel web depuis son espace). Vérifie que sa formule comprend la
// secrétaire, prépare le contexte de l'appel (nom annoncé, métiers, zone, horaires, consignes) et
// signe un jeton de 30 minutes qui dit pour quel artisan les outils agissent. Minutes épuisées :
// mode « message » (prise de message seulement).
// Usage « devis » (F-85, ADR 0234) : appel avec Manon depuis l'éditeur de devis d'un chantier
// de l'artisan. Droit devis_conversation et minutes restantes exigés ; contexte du chantier,
// prix habituels, jeton lié au chantier et assistante Vapi « Devis artisan ».
// Aucune donnée personnelle dans les journaux.
import { parseAiAgents } from "../../../packages/core/src/ai-agents.ts";
import {
  quoteVatText,
  secretaryHoursText,
  signVoiceQuoteSession,
  signVoiceSession,
  usualPricesText,
} from "../../../packages/core/src/voice-assistant.ts";
import { adminClient, json, teamArtisanId } from "../_shared/artisan.ts";
import { withCors } from "../_shared/cors.ts";
import { env } from "../_shared/env.ts";

const SESSION_MINUTES = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type Admin = ReturnType<typeof adminClient>;

/** Appel « devis » : contexte du chantier, jeton lié au chantier, assistante du devis. */
async function quoteSession(admin: Admin, artisanId: string, chantierId: string) {
  const { data: context, error } = await admin.rpc("voice_quote_context", {
    p_artisan_id: artisanId,
    p_chantier_id: chantierId,
  });
  if (error) {
    console.error("voice-session : contexte du devis illisible", error.code);
    return json({ status: "unavailable" }, 503);
  }
  if (!context || typeof context !== "object") return json({ status: "invalid" }, 409);
  const c = context as {
    chantier?: string;
    besoin?: string;
    metier?: string;
    commune?: string;
    assujetti_tva?: boolean;
    prix_habituels?: unknown;
    droits?: unknown;
  };
  const rights = parseAiAgents(c.droits);
  if (!rights.agents.conversationalQuote) return json({ status: "non_inclus" }, 403);
  if (rights.remainingSeconds <= 0) return json({ status: "minutes_epuisees" }, 403);
  const secret = env("VAPI_SERVER_SECRET");
  const assistantId = env("VAPI_QUOTE_ASSISTANT_ID");
  if (!secret || !assistantId) return json({ status: "unavailable" }, 503);
  const session = await signVoiceQuoteSession(
    secret,
    artisanId,
    chantierId,
    Date.now() + SESSION_MINUTES * 60_000,
  );
  return json({
    status: "ok",
    assistantId,
    variables: {
      jeton: session,
      chantier: c.chantier ?? "",
      besoin: c.besoin || "non précisée",
      metier: c.metier || "non précisé",
      commune: c.commune || "non précisée",
      tva: quoteVatText(c.assujetti_tva !== false),
      prix_habituels: usualPricesText(c.prix_habituels) || "aucun pour l'instant",
    },
  });
}

Deno.serve(
  withCors(async (req) => {
    if (req.method !== "POST") return new Response(null, { status: 405 });
    const admin = adminClient();
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    const { data: userData } = token ? await admin.auth.getUser(token) : { data: null };
    const user = userData?.user;
    if (!user) return json({ status: "forbidden" }, 401);

    // Patron ou chef d'équipe (ADR 0241) : devis et secrétaire, jamais un ouvrier.
    const artisanId = await teamArtisanId(admin, user.id, { managers: true });
    if (!artisanId) return json({ status: "forbidden" }, 403);
    const artisan = { id: artisanId };

    const body = (await req.json().catch(() => null)) as {
      usage?: unknown;
      chantierId?: unknown;
    } | null;
    if (body?.usage === "devis") {
      const chantierId = typeof body.chantierId === "string" ? body.chantierId : "";
      if (!UUID.test(chantierId)) return json({ status: "invalid" }, 400);
      return await quoteSession(admin, artisan.id as string, chantierId);
    }

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
