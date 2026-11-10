// Edge Function voice-assistant (F-75, ADR 0225) : serveur des outils de la secrétaire vocale
// « Manon », appelé par Vapi pendant et après les appels (jamais par le navigateur).
// - Authentification : secret partagé dans l'en-tête X-Vapi-Secret (identifiant « Bearer Token »
//   de Vapi, sans préfixe), comparé en temps constant à VAPI_SERVER_SECRET.
// - « tool-calls » : envoyer le lien d'inscription par e-mail, envoyer l'état du dossier à
//   l'adresse du compte (rien n'est dit au téléphone : l'appelant n'est pas identifié), enregistrer
//   une demande de rappel (ticket rappel_pro), proposer puis réserver un créneau avec le conseiller
//   du secteur (ADR 0226), préparer la demande de travaux d'un particulier (ADR 0227 : session
//   anonyme, analyse par analyze-need, lien à usage unique envoyé par e-mail ; rien ne part chez
//   les artisans avant que le particulier envoie lui-même), envoyer l'état des demandes d'un
//   particulier à l'adresse de son compte (ADR 0229). Après une demande de rappel, Manon dit
//   quand l'équipe rappelle, d'après ses horaires d'accueil (ADR 0230). Secrétaire dédiée d'un
//   artisan (ADR 0232) : créneaux libres de son agenda, rendez-vous, message ; l'artisan vient du
//   jeton signé passé dans les variables de l'appel, jamais des arguments. Devis en conversation
//   (ADR 0234) : prix habituels de l'artisan, lignes proposées gardées en brouillon pour le
//   chantier du jeton. Minutes comptées à la fin de l'appel. Réponse toujours en HTTP 200.
// - « end-of-call-report » : durée de l'appel dans ai_runs (jamais la transcription).
// Aucune donnée personnelle dans les journaux.
import {
  VAT_EXEMPT_BP,
  VAT_RATES_BP,
  normalizeVoiceLines,
  quoteTotals,
  rawVoiceLinesFrom,
} from "../../../packages/core/src/quote.ts";
import {
  COMMERCIAL_SLOT_HORIZON_DAYS,
  isCommercialSlot,
  nextArtisanSlots,
  nextCommercialSlots,
  parisSlotLabel,
  parisSlotSpoken,
  parseSlotCode,
  parseVoiceToolCalls,
  quoteTotalsSpoken,
  receptionCallbackSpoken,
  sameSecret,
  slotCode,
  spokenEmail,
  spokenPhoneToE164,
  usualPriceSpoken,
  verifyVoiceQuoteSession,
  verifyVoiceSession,
  voiceCallSeconds,
  voicePreparedRequestPath,
  voiceText,
  voiceWorkDescription,
  type ReceptionStatus,
  type VoiceToolCall,
} from "../../../packages/core/src/voice-assistant.ts";
import { isDeliverableAddress } from "../../../packages/emails/src/address.ts";
import {
  renderVoiceAppointment,
  renderVoiceDossier,
  renderVoiceRequestsStatus,
  renderVoiceSignupLink,
  renderVoiceWorkRequest,
} from "../../../packages/emails/src/render.tsx";
import { createClient } from "@supabase/supabase-js";
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

/**
 * « Où en est ma demande ? » (ADR 0229) : même réponse que l'adresse ait un compte ou non ; l'état
 * part seulement vers l'adresse du compte (ou vers celle d'une demande préparée au téléphone).
 */
async function sendRequestsStatus(admin: Admin, call: VoiceToolCall): Promise<ToolResult> {
  const neutral = {
    toolCallId: call.id,
    result:
      "Si cette adresse correspond à un compte MENAO, l'état de ses demandes vient d'y être envoyé par e-mail. Ne dis rien d'autre sur ses demandes.",
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
  const { data, error } = await admin.rpc("voice_requests_for_email", { p_email: email });
  if (error) {
    console.error("voice-assistant : demandes illisibles", error.code);
    return {
      toolCallId: call.id,
      error: "Les demandes sont momentanément inaccessibles. Propose de réessayer plus tard.",
    };
  }
  if (!data || typeof data !== "object") return neutral;
  const d = data as {
    prenom?: string | null;
    compte?: boolean;
    demandes_a_verifier?: number;
    projets?: {
      resume?: string | null;
      metier?: string | null;
      commune?: string | null;
      envoye_le?: string;
      artisans?: { nom?: string | null; statut?: string }[];
    }[];
  };
  const message = renderVoiceRequestsStatus(
    {
      firstName: d.prenom ?? null,
      account: d.compte === true,
      pendingPrepared: typeof d.demandes_a_verifier === "number" ? d.demandes_a_verifier : 0,
      projects: (Array.isArray(d.projets) ? d.projets : []).map((p) => ({
        summary: p.resume ?? null,
        trade: p.metier ?? null,
        city: p.commune ?? null,
        sentAt: p.envoye_le ?? new Date().toISOString(),
        artisans: (Array.isArray(p.artisans) ? p.artisans : []).map((a) => ({
          name: a.nom ?? null,
          status: a.statut ?? "",
        })),
      })),
    },
    siteUrl(),
  );
  const sent = await provider.sendEmail({
    to: email,
    ...message,
    idempotencyKey: `voice-demandes-${call.id}`,
  });
  if (!sent.ok) console.error("voice-assistant : état des demandes non envoyé", sent.error);
  return neutral;
}

/** Quand l'équipe rappelle, d'après ses horaires d'accueil (ADR 0230). */
async function callbackWhen(admin: Admin): Promise<string> {
  const { data, error } = await admin.rpc("reception_status");
  if (error || !data || typeof data !== "object") return "L'équipe rappelle dès que possible.";
  const d = data as Partial<ReceptionStatus>;
  return receptionCallbackSpoken(
    {
      ouvert: d.ouvert === true,
      ferme_a: typeof d.ferme_a === "string" ? d.ferme_a : null,
      prochaine_ouverture: typeof d.prochaine_ouverture === "string" ? d.prochaine_ouverture : null,
    },
    new Date(),
  );
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
    result: `Demande de rappel enregistrée. ${await callbackWhen(admin)} Au moment indiqué si possible. Dis-le simplement, sans promettre d'heure précise.`,
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
      .map((at) => `${parisSlotSpoken(at)} (code ${slotCode(at)})`)
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
    result: `Rendez-vous réservé avec ${advisor.firstName} le ${parisSlotSpoken(at)} (${kind === "visite" ? "visite" : "appel"}). Une confirmation part par e-mail. Résume-le à l'artisan.`,
  };
}

const WORK_REQUEST_FAILED =
  "La demande n'a pas pu être préparée. Propose au particulier de la faire sur le site menao.fr, en quelques minutes.";

/**
 * Demande de travaux par téléphone (ADR 0227) : même chemin que le site. Une session anonyme
 * fait analyser le besoin (analyze-need crée le projet), valide les critères et compte les
 * artisans disponibles ; un jeton de transfert de 7 jours part par e-mail. Le particulier crée son
 * espace ou se connecte, vérifie et envoie lui-même.
 */
async function prepareWorkRequest(admin: Admin, call: VoiceToolCall): Promise<ToolResult> {
  const description = voiceWorkDescription(call.args);
  const phone = spokenPhoneToE164(call.args.telephone);
  const email = spokenEmail(call.args.email);
  const firstName = voiceText(call.args.prenom, 60);
  if (!description) {
    return {
      toolCallId: call.id,
      error: "Il manque la description des travaux ou la commune : redemande-les.",
    };
  }
  if (!phone)
    return { toolCallId: call.id, error: "Numéro invalide : redemande les dix chiffres." };
  if (!email || !isDeliverableAddress(email)) {
    return {
      toolCallId: call.id,
      error: "Adresse e-mail invalide : redemande-la lettre par lettre, puis relis-la.",
    };
  }
  if (!firstName) return { toolCallId: call.id, error: "Il manque le prénom." };
  const provider = notificationProvider();
  if (!provider) return { toolCallId: call.id, error: WORK_REQUEST_FAILED };
  // Vapi peut rejouer une requête : une seule demande par appel d'outil.
  if (!(await allowed(admin, `voice-assistant:travaux:${call.id}`, 1, 86_400))) {
    return {
      toolCallId: call.id,
      result: "Cette demande est déjà préparée et envoyée par e-mail.",
    };
  }
  if (!(await canEmail(admin, email))) {
    return {
      toolCallId: call.id,
      result:
        "Plusieurs e-mails sont déjà partis vers cette adresse aujourd'hui : propose au particulier d'ouvrir le dernier reçu, ou de faire sa demande sur menao.fr.",
    };
  }

  const url = env("SUPABASE_URL");
  const anonKey = env("SUPABASE_ANON_KEY");
  const visitor = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signIn, error: signInError } = await visitor.auth.signInAnonymously();
  const accessToken = signIn.session?.access_token;
  if (signInError || !accessToken) {
    console.error("voice-assistant : session anonyme impossible", signInError?.status ?? "");
    return { toolCallId: call.id, error: WORK_REQUEST_FAILED };
  }
  const analysis = await fetch(`${url}/functions/v1/analyze-need`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ description }),
  });
  const analysed = (await analysis.json().catch(() => null)) as {
    status?: string;
    projectId?: string;
  } | null;
  const projectId = analysed?.status === "ok" ? analysed.projectId : undefined;
  if (!projectId) {
    console.error("voice-assistant : analyse du besoin en échec", analysis.status);
    return { toolCallId: call.id, error: WORK_REQUEST_FAILED };
  }

  // Critères validés (métier et commune reconnus) : artisans disponibles, comme sur le site.
  const owner = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { error: criteriaError } = await owner.rpc("validate_project_criteria", {
    p_project_id: projectId,
  });
  let available = 0;
  if (!criteriaError) {
    const { data: matches } = await owner.rpc("match_artisans", {
      p_project_id: projectId,
      p_limit: 3,
    });
    available = Array.isArray(matches) ? matches.length : 0;
  }

  const { data: token, error } = await admin.rpc("voice_prepare_work_request", {
    p_project_id: projectId,
    p_first_name: firstName,
    p_email: email,
    p_phone: phone,
  });
  if (error || typeof token !== "string") {
    if (error?.code === "22023") {
      return {
        toolCallId: call.id,
        result:
          "Trois demandes ont déjà été préparées pour ce numéro aujourd'hui : propose au particulier d'utiliser les e-mails déjà reçus.",
      };
    }
    console.error("voice-assistant : demande non préparée", error?.code ?? "");
    return { toolCallId: call.id, error: WORK_REQUEST_FAILED };
  }

  const { data: project } = await admin
    .from("projects")
    .select("summary, ville_nom")
    .eq("id", projectId)
    .maybeSingle();
  const message = renderVoiceWorkRequest(
    {
      firstName,
      summary: (project?.summary as string | null | undefined) ?? null,
      city: (project?.ville_nom as string | null | undefined) ?? null,
      available,
      url: `${siteUrl()}${voicePreparedRequestPath(token)}`,
    },
    siteUrl(),
  );
  const sent = await provider.sendEmail({
    to: email,
    ...message,
    idempotencyKey: `voice-travaux-${call.id}`,
  });
  if (!sent.ok) {
    console.error("voice-assistant : demande préparée non envoyée", sent.error);
    return { toolCallId: call.id, error: WORK_REQUEST_FAILED };
  }

  const next =
    "Dis-lui qu'il vient de recevoir un e-mail : il ouvre le lien, crée son espace gratuit ou se connecte, vérifie sa demande et l'envoie lui-même. Rien ne part chez les artisans avant. Le lien est valable sept jours.";
  if (criteriaError) {
    return {
      toolCallId: call.id,
      result: `Demande préparée et e-mail envoyé, mais la commune ou le type de travaux n'a pas été reconnu : il pourra le préciser en ouvrant le lien. ${next}`,
    };
  }
  if (available === 0) {
    return {
      toolCallId: call.id,
      result: `Demande préparée et e-mail envoyé. Aucun artisan n'est encore disponible pour ces travaux dans son secteur : depuis le lien, il pourra demander à l'équipe MENAO de chercher pour lui. Ne promets rien. ${next}`,
    };
  }
  return {
    toolCallId: call.id,
    result: `Demande préparée et e-mail envoyé. ${available === 1 ? "Un artisan disponible lui est proposé" : `${available} artisans disponibles lui sont proposés`} ; il pourra changer ce choix. ${next}`,
  };
}

// ---------------------------------------------------------------------------
// Secrétaire dédiée de l'artisan (ADR 0232)
// ---------------------------------------------------------------------------

type VapiMessage = {
  call?: {
    id?: unknown;
    assistantOverrides?: { variableValues?: Record<string, unknown> };
  };
  assistant?: { variableValues?: Record<string, unknown> };
};

/** Artisan de l'appel, d'après le jeton signé des variables de l'appel (voice-session). */
async function secretaryArtisan(message: unknown): Promise<string | null> {
  const m = (message ?? {}) as VapiMessage;
  const token =
    m.call?.assistantOverrides?.variableValues?.jeton ?? m.assistant?.variableValues?.jeton;
  return await verifyVoiceSession(env("VAPI_SERVER_SECRET"), token, new Date());
}

const callId = (message: unknown) => {
  const id = (message as VapiMessage | null)?.call?.id;
  return typeof id === "string" && id ? id.slice(0, 100) : null;
};

const NO_SESSION =
  "Session expirée : prends seulement un message en notant le nom, le numéro et le motif, puis dis qu'il sera transmis.";

type SecretaryContext = {
  rendez_vous?: boolean;
  duree_visite?: number;
  droits?: { secondes_restantes?: number };
};

async function secretaryContext(admin: Admin, artisanId: string): Promise<SecretaryContext | null> {
  const { data, error } = await admin.rpc("voice_secretary_context", { p_artisan_id: artisanId });
  if (error || !data || typeof data !== "object") return null;
  return data as SecretaryContext;
}

async function secretarySlots(
  admin: Admin,
  call: VoiceToolCall,
  artisanId: string | null,
): Promise<ToolResult> {
  if (!artisanId) return { toolCallId: call.id, error: NO_SESSION };
  const context = await secretaryContext(admin, artisanId);
  if (!context) return { toolCallId: call.id, error: "Agenda indisponible : prends un message." };
  if (context.rendez_vous === false) {
    return {
      toolCallId: call.id,
      result: "L'artisan ne prend pas de rendez-vous par sa secrétaire : prends un message.",
    };
  }
  if ((context.droits?.secondes_restantes ?? 0) <= 0) {
    return { toolCallId: call.id, result: "Prends seulement un message, sans rendez-vous." };
  }
  const now = new Date();
  const { data, error } = await admin.rpc("voice_secretary_agenda", {
    p_artisan_id: artisanId,
    p_from: now.toISOString(),
    p_to: new Date(now.getTime() + 22 * 86_400_000).toISOString(),
  });
  if (error || !data || typeof data !== "object") {
    console.error("voice-assistant : agenda de l'artisan illisible", error?.code ?? "");
    return { toolCallId: call.id, error: "Agenda indisponible : prends un message." };
  }
  const agenda = data as {
    horaires?: { weekday: number; start: string; end: string }[];
    absences?: { startsOn: string; endsOn: string }[];
    occupe?: { debut: string; fin: string }[];
  };
  const slots = nextArtisanSlots({
    hours: agenda.horaires ?? [],
    absences: agenda.absences ?? [],
    busy: (agenda.occupe ?? []).map((b) => ({ start: new Date(b.debut), end: new Date(b.fin) })),
    now,
    durationMinutes: context.duree_visite ?? 60,
  });
  if (slots.length === 0) {
    return {
      toolCallId: call.id,
      result: "Aucun créneau libre dans les trois prochaines semaines : prends un message.",
    };
  }
  return {
    toolCallId: call.id,
    result: `Créneaux libres (heure de Paris), à proposer un par un : ${slots
      .map((at) => `${parisSlotSpoken(at)} (code ${slotCode(at)})`)
      .join(
        " ; ",
      )}. Pour réserver, appelle secretaire_reserver avec le code exact du créneau choisi.`,
  };
}

async function secretaryRecord(
  admin: Admin,
  call: VoiceToolCall,
  artisanId: string | null,
  id: string | null,
  kind: "message" | "rendez_vous",
): Promise<ToolResult> {
  if (!artisanId || !id) return { toolCallId: call.id, error: NO_SESSION };
  const phone = spokenPhoneToE164(call.args.telephone);
  const name = voiceText(call.args.nom, 80);
  const reason = voiceText(call.args.motif, 400);
  if (!phone)
    return { toolCallId: call.id, error: "Numéro invalide : redemande les dix chiffres." };
  if (!name || !reason) return { toolCallId: call.id, error: "Il manque le nom ou le motif." };
  const at = kind === "rendez_vous" ? parseSlotCode(call.args.creneau) : null;
  if (kind === "rendez_vous" && !at) {
    return {
      toolCallId: call.id,
      error: "Créneau inconnu : rappelle secretaire_creneaux et utilise un code donné.",
    };
  }
  if (kind === "rendez_vous") {
    const context = await secretaryContext(admin, artisanId);
    if ((context?.droits?.secondes_restantes ?? 0) <= 0) {
      return { toolCallId: call.id, error: "Prends seulement un message, sans rendez-vous." };
    }
  }
  const moment = voiceText(call.args.moment, 100);
  const { error } = await admin.rpc("voice_secretary_record", {
    p_artisan_id: artisanId,
    p_call_id: id,
    p_kind: kind,
    p_caller_name: name,
    p_caller_phone: phone,
    p_reason: moment ? `${reason} (rappel souhaité : ${moment})` : reason,
    p_city: voiceText(call.args.commune, 100) ?? undefined,
    p_urgent: call.args.urgent === true,
    p_starts_at: at ? at.toISOString() : undefined,
  });
  if (error) {
    if (error.code === "22023") {
      return {
        toolCallId: call.id,
        error: /Créneau déjà pris/.test(error.message)
          ? "Ce créneau vient d'être pris : rappelle secretaire_creneaux pour en proposer d'autres."
          : `${error.message} Prends un message à la place.`,
      };
    }
    console.error("voice-assistant : message de la secrétaire non enregistré", error.code);
    return {
      toolCallId: call.id,
      error: "L'enregistrement a échoué. Excuse-toi et propose de rappeler.",
    };
  }
  return {
    toolCallId: call.id,
    result:
      kind === "rendez_vous"
        ? `Rendez-vous réservé le ${at ? parisSlotSpoken(at) : ""}. L'artisan est prévenu. Résume-le au client.`
        : "Message transmis : l'artisan le reçoit tout de suite sur son téléphone. Dis au client qu'il sera rappelé, sans promettre d'heure.",
  };
}

// ---------------------------------------------------------------------------
// Devis dicté en conversation (ADR 0234)
// ---------------------------------------------------------------------------

/** Artisan et chantier de l'appel « devis », d'après le jeton signé (voice-session). */
async function quoteSession(message: unknown) {
  const m = (message ?? {}) as VapiMessage;
  const token =
    m.call?.assistantOverrides?.variableValues?.jeton ?? m.assistant?.variableValues?.jeton;
  return await verifyVoiceQuoteSession(env("VAPI_SERVER_SECRET"), token, new Date());
}

const NO_QUOTE_SESSION =
  "Session expirée : dis à l'artisan que les lignes déjà proposées sont dans son éditeur et qu'il peut relancer l'appel.";

async function quoteUsualPrices(
  admin: Admin,
  call: VoiceToolCall,
  session: { artisanId: string } | null,
): Promise<ToolResult> {
  if (!session) return { toolCallId: call.id, error: NO_QUOTE_SESSION };
  const query = voiceText(call.args.recherche, 100);
  if (!query) return { toolCallId: call.id, error: "Dis ce que tu cherches en quelques mots." };
  const { data, error } = await admin.rpc("voice_quote_usual_prices", {
    p_artisan_id: session.artisanId,
    p_query: query,
  });
  if (error) {
    console.error("voice-assistant : prix habituels illisibles", error.code);
    return { toolCallId: call.id, error: "Prix indisponibles : demande le prix à l'artisan." };
  }
  const prices = (data ?? []) as {
    designation: string;
    unit: string;
    unit_price_ht_cents: number;
  }[];
  if (prices.length === 0) {
    return {
      toolCallId: call.id,
      result: "Aucun prix habituel pour cela dans ses devis : demande-lui son prix.",
    };
  }
  return {
    toolCallId: call.id,
    result: `Prix de ses derniers devis, à lui proposer sans les imposer : ${prices
      .map((p) => usualPriceSpoken(p.designation, p.unit, p.unit_price_ht_cents))
      .join(" ; ")}.`,
  };
}

async function quotePropose(
  admin: Admin,
  call: VoiceToolCall,
  session: { artisanId: string; chantierId: string } | null,
  id: string | null,
): Promise<ToolResult> {
  if (!session || !id) return { toolCallId: call.id, error: NO_QUOTE_SESSION };
  const { data: artisan } = await admin
    .from("artisans")
    .select("assujetti_tva")
    .eq("id", session.artisanId)
    .maybeSingle();
  const assujettiTva = artisan?.assujetti_tva !== false;
  const lines = normalizeVoiceLines(rawVoiceLinesFrom(call.args.lignes), {
    assujettiTva,
    defaultVatBp: assujettiTva ? (VAT_RATES_BP.at(-1) ?? 2000) : VAT_EXEMPT_BP,
  });
  if (lines.length === 0) {
    return {
      toolCallId: call.id,
      error:
        "Aucune ligne utilisable : chaque ligne a besoin d'une désignation et d'une quantité positive. Renvoie toute la liste.",
    };
  }
  const { error } = await admin.rpc("voice_quote_save_draft", {
    p_artisan_id: session.artisanId,
    p_chantier_id: session.chantierId,
    p_call_id: id,
    p_lines: lines,
  });
  if (error) {
    if (error.code === "22023") {
      return { toolCallId: call.id, error: `${error.message} Dis-le à l'artisan.` };
    }
    console.error("voice-assistant : brouillon du devis non enregistré", error.code);
    return { toolCallId: call.id, error: "Enregistrement impossible : réessaie une fois." };
  }
  const missing = lines.filter((line) => line.unitPriceHtCents === 0).length;
  const skipped = rawVoiceLinesFrom(call.args.lignes).length - lines.length;
  return {
    toolCallId: call.id,
    result: [
      `${lines.length === 1 ? "Une ligne est" : `${lines.length} lignes sont`} dans l'éditeur.`,
      quoteTotalsSpoken(quoteTotals(lines)),
      missing
        ? `${missing === 1 ? "Une ligne n'a" : `${missing} lignes n'ont`} pas encore de prix : demande-les ou dis qu'elles seront à compléter.`
        : "",
      skipped > 0
        ? `${skipped} ligne(s) écartée(s) car incomplète(s) : vérifie avec l'artisan.`
        : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

async function runTool(
  admin: Admin,
  call: VoiceToolCall,
  message: unknown = null,
): Promise<ToolResult> {
  try {
    if (call.name.startsWith("devis_")) {
      const session = await quoteSession(message);
      if (call.name === "devis_prix_habituels") return await quoteUsualPrices(admin, call, session);
      if (call.name === "devis_proposer") {
        return await quotePropose(admin, call, session, callId(message));
      }
    }
    if (call.name.startsWith("secretaire_")) {
      const artisanId = await secretaryArtisan(message);
      if (call.name === "secretaire_creneaux") return await secretarySlots(admin, call, artisanId);
      if (call.name === "secretaire_reserver") {
        return await secretaryRecord(admin, call, artisanId, callId(message), "rendez_vous");
      }
      if (call.name === "secretaire_message") {
        return await secretaryRecord(admin, call, artisanId, callId(message), "message");
      }
    }
    if (call.name === "envoyer_lien_inscription") return await sendSignupLink(admin, call);
    if (call.name === "envoyer_etat_dossier") return await sendDossier(admin, call);
    if (call.name === "demander_rappel") return await requestCallback(admin, call);
    if (call.name === "proposer_creneaux") return await proposeSlots(admin, call);
    if (call.name === "reserver_creneau") return await bookSlot(admin, call);
    if (call.name === "preparer_demande_travaux") return await prepareWorkRequest(admin, call);
    if (call.name === "envoyer_etat_demandes") return await sendRequestsStatus(admin, call);
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
    const results = await Promise.all(calls.map((call) => runTool(admin, call, message)));
    return json({ results });
  }

  if (message?.type === "end-of-call-report") {
    // Secrétaire dédiée (ADR 0232) ou devis en conversation (ADR 0234) : minutes de l'artisan,
    // une seule fois par appel.
    const quote = await quoteSession(message);
    const artisanId = quote?.artisanId ?? (await secretaryArtisan(message));
    const id = callId(message);
    if (artisanId && id) {
      const { error } = await admin.rpc("voice_record_usage", {
        p_artisan_id: artisanId,
        p_call_id: id,
        p_seconds: Math.round(voiceCallSeconds(message) ?? 0),
        p_agent: quote ? "devis" : "secretaire",
      });
      if (error) console.error("voice-assistant : minutes non comptées", error.code);
    }
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
