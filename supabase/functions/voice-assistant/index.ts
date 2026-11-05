// Edge Function voice-assistant (F-75, ADR 0225) : serveur des outils de la secrétaire vocale
// « Camille », appelé par Vapi pendant et après les appels (jamais par le navigateur).
// - Authentification : secret partagé dans l'en-tête X-Vapi-Secret (identifiant « Bearer Token »
//   de Vapi, sans préfixe), comparé en temps constant à VAPI_SERVER_SECRET.
// - « tool-calls » : envoyer le lien d'inscription par e-mail, envoyer l'état du dossier à
//   l'adresse du compte (rien n'est dit au téléphone : l'appelant n'est pas identifié), enregistrer
//   une demande de rappel (ticket rappel_pro), proposer puis réserver un créneau avec le conseiller
//   du secteur (ADR 0226). Réponse toujours en HTTP 200, une entrée par appel.
// - « end-of-call-report » : durée de l'appel dans ai_runs (jamais la transcription).
// Aucune donnée personnelle dans les journaux.
import {
  COMMERCIAL_SLOT_HORIZON_DAYS,
  isCommercialSlot,
  nextCommercialSlots,
  parisSlotLabel,
  parseSlotCode,
  parseVoiceToolCalls,
  sameSecret,
  slotCode,
  spokenEmail,
  spokenPhoneToE164,
  voiceCallSeconds,
  voiceText,
  type VoiceToolCall,
} from "../../../packages/core/src/voice-assistant.ts";
import { isDeliverableAddress } from "../../../packages/emails/src/address.ts";
import {
  renderVoiceAppointment,
  renderVoiceDossier,
  renderVoiceSignupLink,
} from "../../../packages/emails/src/render.tsx";
import { geocodeCommune } from "../_shared/geocoding.ts";
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

type Advisor = { id: string; firstName: string; city: string; postcode: string };

/** Conseiller du secteur d'une commune dictée (code postal par la Base Adresse Nationale). */
async function advisorFor(
  admin: Admin,
  commune: string | null,
): Promise<Advisor | "inconnue" | null> {
  if (!commune) return "inconnue";
  const found = await geocodeCommune(commune, null);
  if (!found?.postcode) return "inconnue";
  const { data, error } = await admin.rpc("voice_commercial_for_postcode", {
    p_postcode: found.postcode,
  });
  if (error) throw new Error(`secteur ${error.code}`);
  const row = (data as { commercial_id: string; prenom: string }[] | null)?.[0];
  return row
    ? { id: row.commercial_id, firstName: row.prenom, city: found.nom, postcode: found.postcode }
    : null;
}

async function busyTimes(admin: Admin, advisorId: string, now: Date): Promise<Date[]> {
  const { data, error } = await admin.rpc("voice_commercial_busy", {
    p_commercial_id: advisorId,
    p_from: now.toISOString(),
    p_to: new Date(now.getTime() + (COMMERCIAL_SLOT_HORIZON_DAYS + 1) * 86_400_000).toISOString(),
  });
  if (error) throw new Error(`agenda ${error.code}`);
  return ((data as string[] | null) ?? []).map((iso) => new Date(iso));
}

const NO_ADVISOR =
  "Aucun conseiller ne couvre encore cette commune. Propose une demande de rappel par l'équipe (outil demander_rappel).";
const UNKNOWN_CITY =
  "Commune introuvable : redemande le nom de la commune, et le code postal si besoin.";

async function proposeSlots(admin: Admin, call: VoiceToolCall): Promise<ToolResult> {
  const advisor = await advisorFor(admin, voiceText(call.args.commune, 100));
  if (advisor === "inconnue") return { toolCallId: call.id, error: UNKNOWN_CITY };
  if (!advisor) return { toolCallId: call.id, result: NO_ADVISOR };
  const now = new Date();
  const slots = nextCommercialSlots(now, await busyTimes(admin, advisor.id, now));
  if (slots.length === 0) {
    return {
      toolCallId: call.id,
      result: `${advisor.firstName} n'a pas de créneau libre ces deux prochaines semaines. Propose une demande de rappel (outil demander_rappel).`,
    };
  }
  return {
    toolCallId: call.id,
    result: `Conseiller du secteur de ${advisor.city} : ${advisor.firstName}. Créneaux libres (heure de Paris), à proposer un par un : ${slots
      .map((at) => `${parisSlotLabel(at)} (code ${slotCode(at)})`)
      .join(" ; ")}. Pour réserver, appelle reserver_creneau avec le code exact du créneau choisi.`,
  };
}

const displayPhone = (e164: string) =>
  e164.replace(/^\+33(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, "0$1 $2 $3 $4 $5");

async function bookSlot(admin: Admin, call: VoiceToolCall): Promise<ToolResult> {
  const at = parseSlotCode(call.args.creneau);
  const kind = call.args.type === "visite" ? "visite" : "appel";
  const phone = spokenPhoneToE164(call.args.telephone);
  const email = spokenEmail(call.args.email);
  const firstName = voiceText(call.args.prenom, 60);
  const reason = voiceText(call.args.motif, 300) ?? "Inscription accompagnée";
  const address = voiceText(call.args.adresse, 200);
  if (!at || !isCommercialSlot(at)) {
    return {
      toolCallId: call.id,
      error: "Créneau inconnu : rappelle proposer_creneaux et utilise un code donné.",
    };
  }
  if (!phone)
    return { toolCallId: call.id, error: "Numéro invalide : redemande les dix chiffres." };
  if (!email || !isDeliverableAddress(email)) {
    return {
      toolCallId: call.id,
      error: "Adresse e-mail invalide : redemande-la lettre par lettre.",
    };
  }
  if (!firstName) return { toolCallId: call.id, error: "Il manque le prénom." };
  if (kind === "visite" && !address) {
    return {
      toolCallId: call.id,
      error: "Pour une visite, demande l'adresse de l'entreprise (numéro et rue).",
    };
  }
  const advisor = await advisorFor(admin, voiceText(call.args.commune, 100));
  if (advisor === "inconnue") return { toolCallId: call.id, error: UNKNOWN_CITY };
  if (!advisor) return { toolCallId: call.id, result: NO_ADVISOR };

  const { error } = await admin.rpc("voice_book_commercial_appointment", {
    p_commercial_id: advisor.id,
    p_starts_at: at.toISOString(),
    p_kind: kind,
    p_first_name: firstName,
    p_phone: phone,
    p_email: email,
    p_city: advisor.city,
    p_reason: reason,
    p_postcode: advisor.postcode,
    p_address: address ?? undefined,
    p_trade: voiceText(call.args.metier, 80) ?? undefined,
  });
  if (error) {
    if (error.code === "23505" || /déjà pris/.test(error.message)) {
      return {
        toolCallId: call.id,
        error: /Rendez-vous déjà pris/.test(error.message)
          ? "Un rendez-vous est déjà pris pour ce numéro : inutile d'en prendre un autre."
          : "Ce créneau vient d'être pris : rappelle proposer_creneaux pour en proposer d'autres.",
      };
    }
    if (error.code === "22023") {
      return {
        toolCallId: call.id,
        error: `Réservation refusée (${error.message}). Propose un autre créneau ou un rappel.`,
      };
    }
    console.error("voice-assistant : rendez-vous non enregistré", error.code);
    return {
      toolCallId: call.id,
      error: "La réservation a échoué. Propose une demande de rappel.",
    };
  }

  const when = parisSlotLabel(at);
  const provider = notificationProvider();
  if (provider && (await canEmail(admin, email))) {
    const message = renderVoiceAppointment(
      {
        firstName,
        advisor: advisor.firstName,
        when,
        kind,
        phone: kind === "appel" ? displayPhone(phone) : null,
        address: kind === "visite" ? `${address}, ${advisor.city}` : null,
      },
      siteUrl(),
    );
    const sent = await provider.sendEmail({
      to: email,
      ...message,
      idempotencyKey: `voice-rdv-${call.id}`,
    });
    if (!sent.ok) console.error("voice-assistant : confirmation non envoyée", sent.error);
  }
  return {
    toolCallId: call.id,
    result: `Rendez-vous réservé avec ${advisor.firstName} le ${when} (${kind === "visite" ? "visite" : "appel"}). Une confirmation part par e-mail. Résume-le à l'artisan.`,
  };
}

async function runTool(admin: Admin, call: VoiceToolCall): Promise<ToolResult> {
  try {
    if (call.name === "envoyer_lien_inscription") return await sendSignupLink(admin, call);
    if (call.name === "envoyer_etat_dossier") return await sendDossier(admin, call);
    if (call.name === "demander_rappel") return await requestCallback(admin, call);
    if (call.name === "proposer_creneaux") return await proposeSlots(admin, call);
    if (call.name === "reserver_creneau") return await bookSlot(admin, call);
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
