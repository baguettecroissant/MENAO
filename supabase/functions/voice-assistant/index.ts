// Edge Function voice-assistant (F-75, ADR 0225) : serveur des outils de la secrétaire vocale
// « Camille », appelé par Vapi pendant et après les appels (jamais par le navigateur).
// - Authentification : secret partagé dans l'en-tête X-Vapi-Secret (identifiant « Bearer Token »
//   de Vapi, sans préfixe), comparé en temps constant à VAPI_SERVER_SECRET.
// - « tool-calls » : envoyer le lien d'inscription par e-mail, envoyer l'état du dossier à
//   l'adresse du compte (rien n'est dit au téléphone : l'appelant n'est pas identifié), enregistrer
//   une demande de rappel (ticket rappel_pro). Réponse toujours en HTTP 200, une entrée par appel.
// - « end-of-call-report » : durée de l'appel dans ai_runs (jamais la transcription).
// Aucune donnée personnelle dans les journaux.
import {
  parseVoiceToolCalls,
  sameSecret,
  spokenEmail,
  spokenPhoneToE164,
  voiceCallSeconds,
  voiceText,
  type VoiceToolCall,
} from "../../../packages/core/src/voice-assistant.ts";
import { isDeliverableAddress } from "../../../packages/emails/src/address.ts";
import { renderVoiceDossier, renderVoiceSignupLink } from "../../../packages/emails/src/render.tsx";
import { logAiRuns, sha256 } from "../_shared/ai.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { env } from "../_shared/env.ts";
import { notificationProvider } from "../_shared/notifications.ts";

type Admin = ReturnType<typeof adminClient>;
type ToolResult = { toolCallId: string; result?: string; error?: string };

/** Au plus 3 e-mails par adresse et par jour, 100 par heure en tout. */
const EMAILS_PER_ADDRESS_PER_DAY = 3;
const EMAILS_PER_HOUR = 100;

function siteUrl(): string {
  return (env("SITE_URLS").split(",")[0] ?? "").trim().replace(/\/$/, "") || "https://menao.fr";
}

async function allowed(admin: Admin, key: string, max: number, seconds: number): Promise<boolean> {
  const { data } = await admin.rpc("consume_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: seconds,
  });
  return data === true;
}

/** Limites d'envoi pour une adresse ; l'adresse n'est jamais stockée en clair. */
async function canEmail(admin: Admin, email: string): Promise<boolean> {
  const hash = (await sha256(email)).slice(0, 32);
  return (
    (await allowed(admin, `voice-assistant:email:${hash}`, EMAILS_PER_ADDRESS_PER_DAY, 86_400)) &&
    (await allowed(admin, "voice-assistant:emails", EMAILS_PER_HOUR, 3600))
  );
}

async function sendSignupLink(admin: Admin, call: VoiceToolCall): Promise<ToolResult> {
  const email = spokenEmail(call.args.email);
  if (!email || !isDeliverableAddress(email)) {
    return {
      toolCallId: call.id,
      error: "Adresse e-mail invalide : redemande-la lettre par lettre, puis relis-la.",
    };
  }
  const provider = notificationProvider();
  if (!provider)
    return { toolCallId: call.id, error: "Envoi d'e-mail indisponible pour le moment." };
  if (!(await canEmail(admin, email))) {
    return {
      toolCallId: call.id,
      result: "Un e-mail a déjà été envoyé à cette adresse aujourd'hui.",
    };
  }
  const message = renderVoiceSignupLink(voiceText(call.args.prenom, 60), siteUrl());
  const sent = await provider.sendEmail({
    to: email,
    ...message,
    // Un seul envoi par appel d'outil, même si Vapi rejoue la requête.
    idempotencyKey: `voice-signup-${call.id}`,
  });
  if (!sent.ok) {
    console.error("voice-assistant : lien d'inscription non envoyé", sent.error);
    return { toolCallId: call.id, error: "L'e-mail n'a pas pu partir. Propose un rappel." };
  }
  return {
    toolCallId: call.id,
    result:
      "E-mail envoyé. Dis-lui qu'il le trouvera dans sa boîte de réception dans quelques minutes, et dans les indésirables s'il ne le voit pas.",
  };
}

async function sendDossier(admin: Admin, call: VoiceToolCall): Promise<ToolResult> {
  // Même réponse que le compte existe ou non : rien n'est révélé à l'appelant.
  const neutral = {
    toolCallId: call.id,
    result:
      "Si cette adresse correspond à un compte MENAO, l'état du dossier vient d'y être envoyé par e-mail. Ne dis rien d'autre sur le dossier.",
  };
  const email = spokenEmail(call.args.email);
  if (!email) {
    return {
      toolCallId: call.id,
      error: "Adresse e-mail invalide : redemande-la lettre par lettre.",
    };
  }
  const provider = notificationProvider();
  if (!provider)
    return { toolCallId: call.id, error: "Envoi d'e-mail indisponible pour le moment." };
  if (!(await canEmail(admin, email))) return neutral;
  const { data, error } = await admin.rpc("voice_dossier_for_email", { p_email: email });
  if (error) {
    console.error("voice-assistant : dossier illisible", error.code);
    return {
      toolCallId: call.id,
      error: "Le dossier est momentanément inaccessible. Propose un rappel.",
    };
  }
  if (!data || typeof data !== "object") return neutral;
  const d = data as {
    prenom?: string | null;
    statut?: string;
    manque_inscription?: unknown;
    manque_activation?: unknown;
  };
  const steps = (value: unknown) =>
    Array.isArray(value) ? value.filter((s): s is string => typeof s === "string") : [];
  const message = renderVoiceDossier(
    {
      firstName: d.prenom ?? null,
      status: d.statut ?? "",
      signupMissing: steps(d.manque_inscription),
      activationMissing: steps(d.manque_activation),
    },
    siteUrl(),
  );
  const sent = await provider.sendEmail({
    to: email,
    ...message,
    idempotencyKey: `voice-dossier-${call.id}`,
  });
  if (!sent.ok) console.error("voice-assistant : état du dossier non envoyé", sent.error);
  return neutral;
}

async function requestCallback(admin: Admin, call: VoiceToolCall): Promise<ToolResult> {
  const phone = spokenPhoneToE164(call.args.telephone);
  const email = spokenEmail(call.args.email);
  const firstName = voiceText(call.args.prenom, 60);
  const reason = voiceText(call.args.motif, 300);
  if (!phone)
    return { toolCallId: call.id, error: "Numéro invalide : redemande les dix chiffres." };
  if (!email)
    return {
      toolCallId: call.id,
      error: "Adresse e-mail invalide : redemande-la lettre par lettre.",
    };
  if (!firstName || !reason) {
    return { toolCallId: call.id, error: "Il manque le prénom ou le motif du rappel." };
  }
  const { error } = await admin.rpc("voice_request_callback", {
    p_first_name: firstName,
    p_phone: phone,
    p_email: email,
    p_reason: reason,
    p_moment: voiceText(call.args.moment, 100) ?? undefined,
    p_trade: voiceText(call.args.metier, 80) ?? undefined,
    p_city: voiceText(call.args.commune, 100) ?? undefined,
  });
  if (error?.code === "22023" && /déjà enregistrée/.test(error.message)) {
    return {
      toolCallId: call.id,
      result: "Une demande de rappel est déjà enregistrée pour ce numéro.",
    };
  }
  if (error) {
    console.error("voice-assistant : rappel non enregistré", error.code);
    return {
      toolCallId: call.id,
      error:
        "La demande n'a pas pu être enregistrée. Propose d'écrire à l'équipe depuis la page contact du site.",
    };
  }
  return {
    toolCallId: call.id,
    result:
      "Demande de rappel enregistrée : l'équipe rappelle sous un jour ouvré, au moment indiqué si possible.",
  };
}

async function runTool(admin: Admin, call: VoiceToolCall): Promise<ToolResult> {
  try {
    if (call.name === "envoyer_lien_inscription") return await sendSignupLink(admin, call);
    if (call.name === "envoyer_etat_dossier") return await sendDossier(admin, call);
    if (call.name === "demander_rappel") return await requestCallback(admin, call);
    return { toolCallId: call.id, error: "Outil inconnu." };
  } catch (error) {
    console.error(
      "voice-assistant : outil en échec",
      call.name,
      error instanceof Error ? error.name : "",
    );
    return { toolCallId: call.id, error: "Erreur momentanée. Propose un rappel." };
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const secret = env("VAPI_SERVER_SECRET");
  if (!secret || !sameSecret(req.headers.get("x-vapi-secret") ?? "", secret)) {
    return json({ status: "forbidden" }, 401);
  }
  const body = (await req.json().catch(() => null)) as { message?: { type?: unknown } } | null;
  const message = body?.message;
  const admin = adminClient();

  if (message?.type === "tool-calls") {
    const calls = parseVoiceToolCalls(message);
    const results = await Promise.all(calls.map((call) => runTool(admin, call)));
    return json({ results });
  }

  if (message?.type === "end-of-call-report") {
    const m = message as { call?: { assistant?: { model?: { model?: unknown } } } };
    const model = m.call?.assistant?.model?.model;
    await logAiRuns(admin, [
      {
        function_name: "voice-assistant",
        model: typeof model === "string" && model ? model.slice(0, 100) : "vapi",
        outcome: "ok",
        latency_ms: 0,
        audio_seconds: voiceCallSeconds(message),
      },
    ]);
  }
  // Autres événements : rien à répondre.
  return json({});
});
