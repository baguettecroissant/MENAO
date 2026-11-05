/**
 * Secrétaire vocale « Camille » (F-75, ADR 0225) : assistante IA qui répond aux artisans par la
 * voix (appel web depuis le site pendant les essais, numéro de téléphone ensuite), sur la
 * plateforme Vapi. Pendant la conversation, Vapi appelle nos outils (Edge Function
 * voice-assistant) : envoyer le lien d'inscription par e-mail, envoyer l'état du dossier à
 * l'adresse du compte, enregistrer une demande de rappel.
 *
 * Ici : noms des outils et leur définition pour Vapi, lecture défensive des messages de Vapi,
 * numéros et adresses dictés à l'oral, durée d'un appel terminé.
 * Fichier autonome (aucun import) : il est aussi importé par l'Edge Function voice-assistant.
 */

export const VOICE_TOOLS = [
  "envoyer_lien_inscription",
  "envoyer_etat_dossier",
  "demander_rappel",
] as const;
export type VoiceTool = (typeof VOICE_TOOLS)[number];

/**
 * Définition des outils à déclarer dans Vapi (onglet « Tools », type « Function »), avec l'adresse
 * de l'Edge Function. Les descriptions sont lues par le modèle : elles disent quand appeler l'outil.
 */
export function voiceToolDefinitions() {
  const text = (description: string) => ({ type: "string", description });
  return [
    {
      name: "envoyer_lien_inscription",
      description:
        "Envoie par e-mail le lien pour s'inscrire sur MENAO à un artisan qui veut s'inscrire. Demande d'abord son adresse e-mail et relis-la lui lettre par lettre avant d'appeler cet outil.",
      parameters: {
        type: "object",
        properties: {
          email: text("Adresse e-mail de l'artisan, en minuscules, sans espace."),
          prenom: text("Prénom de l'artisan, s'il l'a donné."),
          metier: text("Métier de l'artisan, s'il l'a donné."),
          commune: text("Commune où il travaille, s'il l'a donnée."),
        },
        required: ["email"],
      },
    },
    {
      name: "envoyer_etat_dossier",
      description:
        "Pour un artisan déjà inscrit qui demande où en est son dossier : envoie l'état du dossier et ce qui manque à l'adresse e-mail de son compte MENAO. Rien n'est dit au téléphone : l'information part seulement vers la boîte du compte.",
      parameters: {
        type: "object",
        properties: { email: text("Adresse e-mail du compte MENAO, en minuscules, sans espace.") },
        required: ["email"],
      },
    },
    {
      name: "demander_rappel",
      description:
        "Enregistre une demande de rappel pour l'équipe MENAO : quand l'artisan veut parler à quelqu'un, être accompagné pour l'inscription, ou quand tu ne peux pas répondre. Demande le numéro et l'adresse e-mail, et relis-les avant d'appeler cet outil.",
      parameters: {
        type: "object",
        properties: {
          prenom: text("Prénom de la personne."),
          telephone: text("Numéro à rappeler, en chiffres, par exemple 0612345678."),
          motif: text("Motif du rappel, en une phrase."),
          moment: text("Meilleur moment pour rappeler, tel que dit (« demain matin »)."),
          metier: text("Métier, s'il l'a donné."),
          commune: text("Commune, si elle a été donnée."),
          email: text("Adresse e-mail de la personne, en minuscules, sans espace."),
        },
        required: ["prenom", "telephone", "email", "motif"],
      },
    },
  ];
}

export type VoiceToolCall = { id: string; name: string; args: Record<string, unknown> };

/** Appels d'outils d'un message « tool-calls » de Vapi ; arguments en objet ou en texte JSON. */
export function parseVoiceToolCalls(message: unknown): VoiceToolCall[] {
  if (!message || typeof message !== "object") return [];
  const list = (message as { toolCallList?: unknown }).toolCallList;
  if (!Array.isArray(list)) return [];
  const calls: VoiceToolCall[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const { id, function: fn } = item as { id?: unknown; function?: unknown };
    if (typeof id !== "string" || !id || !fn || typeof fn !== "object") continue;
    const { name, arguments: raw } = fn as { name?: unknown; arguments?: unknown };
    if (typeof name !== "string") continue;
    let args: unknown = raw;
    if (typeof raw === "string") {
      try {
        args = JSON.parse(raw);
      } catch {
        args = {};
      }
    }
    calls.push({
      id,
      name,
      args:
        args && typeof args === "object" && !Array.isArray(args)
          ? (args as Record<string, unknown>)
          : {},
    });
  }
  return calls;
}

/** Texte d'un argument, nettoyé et borné ; null s'il est absent ou vide. */
export function voiceText(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/\s+/g, " ").trim().slice(0, max);
  return clean || null;
}

/**
 * Numéro dicté au format international : chiffres seuls, numéro français à 10 chiffres (0612…),
 * avec indicatif (33…, 0033…, +33…), ou autre numéro international écrit avec « + ». Null sinon.
 */
export function spokenPhoneToE164(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const plus = value.trim().startsWith("+");
  const digits = value.replace(/\D/g, "");
  let e164: string;
  if (/^0[1-9]\d{8}$/.test(digits)) e164 = `+33${digits.slice(1)}`;
  else if (/^0033[1-9]\d{8}$/.test(digits)) e164 = `+${digits.slice(2)}`;
  else if (/^33[1-9]\d{8}$/.test(digits)) e164 = `+${digits}`;
  else if (plus) e164 = `+${digits}`;
  else return null;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

/**
 * Adresse dictée : minuscules, sans espace, « arobase » et « point » remplacés s'ils sont restés
 * en toutes lettres. Null si ce n'est pas une adresse plausible.
 */
export function spokenEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value
    .toLowerCase()
    .replace(/\s*arobase\s*/g, "@")
    .replace(/\s+at\s+/g, "@")
    .replace(/\s+point\s+/g, ".")
    .replace(/\s+/g, "")
    .replace(/\.$/, "");
  return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email) && email.length <= 254 ? email : null;
}

/** Durée d'un appel terminé (message « end-of-call-report »), en secondes ; null si inconnue. */
export function voiceCallSeconds(message: unknown): number | null {
  if (!message || typeof message !== "object") return null;
  const m = message as {
    durationSeconds?: unknown;
    startedAt?: unknown;
    endedAt?: unknown;
    call?: { startedAt?: unknown; endedAt?: unknown };
  };
  if (typeof m.durationSeconds === "number" && Number.isFinite(m.durationSeconds)) {
    return Math.max(0, Math.round(m.durationSeconds * 10) / 10);
  }
  const start = m.startedAt ?? m.call?.startedAt;
  const end = m.endedAt ?? m.call?.endedAt;
  if (typeof start !== "string" || typeof end !== "string") return null;
  const seconds = (Date.parse(end) - Date.parse(start)) / 1000;
  return Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds * 10) / 10 : null;
}

/** Comparaison en temps constant (secret partagé avec Vapi). */
export function sameSecret(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
