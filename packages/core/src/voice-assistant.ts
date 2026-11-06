/**
 * Secrétaire vocale « Camille » (F-75, ADR 0225) : assistante IA qui répond aux artisans par la
 * voix (appel web depuis le site pendant les essais, numéro de téléphone ensuite), sur la
 * plateforme Vapi. Pendant la conversation, Vapi appelle nos outils (Edge Function
 * voice-assistant) : envoyer le lien d'inscription par e-mail, envoyer l'état du dossier à
 * l'adresse du compte, enregistrer une demande de rappel. Côté particuliers (F-77, ADR 0227) :
 * préparer une demande de travaux, envoyée ensuite par le particulier lui-même.
 *
 * Ici : noms des outils et leur définition pour Vapi, lecture défensive des messages de Vapi,
 * numéros et adresses dictés à l'oral, durée d'un appel terminé.
 * Fichier autonome (aucun import) : il est aussi importé par l'Edge Function voice-assistant.
 */

export const VOICE_TOOLS = [
  "envoyer_lien_inscription",
  "envoyer_etat_dossier",
  "demander_rappel",
  "proposer_creneaux",
  "reserver_creneau",
  "preparer_demande_travaux",
  "envoyer_etat_demandes",
  "secretaire_creneaux",
  "secretaire_reserver",
  "secretaire_message",
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
    {
      name: "proposer_creneaux",
      description:
        "Trouve les prochains créneaux libres du conseiller MENAO qui couvre la commune de l'artisan, pour un rendez-vous par téléphone (appel) ou sur place (visite). À utiliser quand l'artisan veut être accompagné par un conseiller. Propose ensuite ces créneaux un par un, sans en inventer d'autres.",
      parameters: {
        type: "object",
        properties: {
          commune: text("Commune où travaille l'artisan."),
          type: {
            type: "string",
            enum: ["appel", "visite"],
            description: "Rendez-vous par téléphone (appel) ou sur place (visite).",
          },
        },
        required: ["commune", "type"],
      },
    },
    {
      name: "reserver_creneau",
      description:
        "Réserve le créneau choisi par l'artisan avec le conseiller du secteur, après proposer_creneaux. Demande d'abord son prénom, son numéro, son adresse e-mail et, pour une visite, l'adresse de son entreprise, et relis-les.",
      parameters: {
        type: "object",
        properties: {
          creneau: text(
            "Code exact du créneau choisi, tel que donné par proposer_creneaux (par exemple 2026-11-10T10:00).",
          ),
          type: {
            type: "string",
            enum: ["appel", "visite"],
            description: "Le même type que pour proposer_creneaux.",
          },
          commune: text("La même commune que pour proposer_creneaux."),
          prenom: text("Prénom de l'artisan."),
          telephone: text("Numéro de l'artisan, en chiffres, par exemple 0612345678."),
          email: text("Adresse e-mail de l'artisan, en minuscules, sans espace."),
          adresse: text("Pour une visite : adresse de l'entreprise (numéro et rue)."),
          metier: text("Métier de l'artisan, s'il l'a donné."),
          motif: text("Objet du rendez-vous, en une phrase (« inscription accompagnée »)."),
        },
        required: ["creneau", "type", "commune", "prenom", "telephone", "email", "motif"],
      },
    },
    {
      name: "preparer_demande_travaux",
      description:
        "Pour un particulier qui a des travaux : prépare sa demande sur MENAO et lui envoie un e-mail pour la vérifier et l'envoyer lui-même aux artisans. Rien n'est envoyé aux artisans pendant l'appel. N'appelle cet outil qu'après le récapitulatif, quand le particulier a dit oui, avec son prénom, son numéro et son adresse e-mail relus.",
      parameters: {
        type: "object",
        properties: {
          besoin: text(
            "Description des travaux en quelques phrases, avec les mots du particulier : quoi, où dans le logement, depuis quand, ce qu'il a déjà constaté. Sans nom, sans numéro, sans adresse e-mail.",
          ),
          commune: text("Commune des travaux."),
          delai: text("Délai souhaité, tel que dit (« au plus vite », « avant l'été »)."),
          prenom: text("Prénom du particulier."),
          telephone: text("Numéro du particulier, en chiffres, par exemple 0612345678."),
          email: text("Adresse e-mail du particulier, en minuscules, sans espace."),
        },
        required: ["besoin", "commune", "prenom", "telephone", "email"],
      },
    },
    {
      name: "envoyer_etat_demandes",
      description:
        "Pour un particulier qui demande où en est sa demande de travaux : envoie l'état de ses demandes (réponse de chaque artisan) à l'adresse e-mail de son compte MENAO. Rien n'est dit au téléphone : l'information part seulement vers cette adresse. Demande l'adresse et relis-la lettre par lettre avant d'appeler cet outil.",
      parameters: {
        type: "object",
        properties: {
          email: text("Adresse e-mail du compte MENAO, en minuscules, sans espace."),
        },
        required: ["email"],
      },
    },
    {
      name: "secretaire_creneaux",
      description:
        "Secrétaire d'un artisan : trouve les prochains créneaux libres dans son agenda pour un rendez-vous (visite ou devis sur place). Propose-les un par un, sans en inventer d'autres.",
      parameters: { type: "object", properties: {}, required: [] },
    },
    {
      name: "secretaire_reserver",
      description:
        "Secrétaire d'un artisan : réserve le créneau choisi par le client dans l'agenda de l'artisan, après secretaire_creneaux. Demande d'abord son nom, son numéro et le motif, et relis-les.",
      parameters: {
        type: "object",
        properties: {
          creneau: text("Code exact du créneau choisi, tel que donné par secretaire_creneaux."),
          nom: text("Nom du client (prénom et nom)."),
          telephone: text("Numéro du client, en chiffres, par exemple 0612345678."),
          motif: text("Objet du rendez-vous, en une phrase, avec les mots du client."),
          commune: text("Commune des travaux, si elle a été donnée."),
        },
        required: ["creneau", "nom", "telephone", "motif"],
      },
    },
    {
      name: "secretaire_message",
      description:
        "Secrétaire d'un artisan : transmet un message à l'artisan (demande de devis, question, rappel souhaité, urgence). Demande le nom, le numéro et le motif, et relis-les avant d'appeler cet outil.",
      parameters: {
        type: "object",
        properties: {
          nom: text("Nom du client (prénom et nom)."),
          telephone: text("Numéro du client, en chiffres, par exemple 0612345678."),
          motif: text("Le message, en une ou deux phrases, avec les mots du client."),
          commune: text("Commune, si elle a été donnée."),
          moment: text("Meilleur moment pour rappeler, tel que dit."),
          urgent: {
            type: "boolean",
            description: "Vrai seulement pour une urgence (fuite, panne, danger).",
          },
        },
        required: ["nom", "telephone", "motif"],
      },
    },
  ];
}

/**
 * Page du lien envoyé par e-mail pour une demande préparée au téléphone (ADR 0227), en dehors de
 * /recherche : sans session, le proxy y renvoie vers l'accueil. Seule source de ce chemin, pour
 * l'Edge Function comme pour le site.
 */
export function voicePreparedRequestPath(token: string): string {
  return `/demande-preparee/${token}`;
}

/** Besoin dicté : au moins quelques mots, borné avant l'analyse. */
const WORK_NEED_MIN = 10;
const WORK_NEED_MAX = 1500;

/**
 * Demande de travaux par téléphone (F-77, ADR 0227) : texte remis à l'analyse du besoin
 * (analyze-need), comme si le particulier l'avait écrit sur le site. Null si le besoin est trop
 * court ou la commune absente.
 */
export function voiceWorkDescription(args: Record<string, unknown>): string | null {
  const need = voiceText(args.besoin, WORK_NEED_MAX);
  const city = voiceText(args.commune, 100);
  if (!need || need.length < WORK_NEED_MIN || !city) return null;
  const delay = voiceText(args.delai, 100);
  return [need, `Commune des travaux : ${city}.`, delay ? `Délai souhaité : ${delay}.` : null]
    .filter(Boolean)
    .join("\n");
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

// ---------------------------------------------------------------------------------------------
// Rendez-vous avec le commercial du secteur (ADR 0226)
// ---------------------------------------------------------------------------------------------

export const VOICE_APPOINTMENT_KINDS = ["appel", "visite"] as const;
export type VoiceAppointmentKind = (typeof VOICE_APPOINTMENT_KINDS)[number];

/** Durée d'un rendez-vous et écart minimal avec un autre (trajet compris). */
export const COMMERCIAL_APPOINTMENT_MINUTES = 30;
export const COMMERCIAL_APPOINTMENT_GAP_MINUTES = 60;
/** Débuts possibles, heure de Paris, en semaine : le matin et l'après-midi (plage d'appel du guide). */
export const COMMERCIAL_SLOT_STARTS = [
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
] as const;
/** Délai minimal avant un rendez-vous, et horizon des créneaux proposés. */
export const COMMERCIAL_SLOT_MIN_DELAY_MINUTES = 120;
export const COMMERCIAL_SLOT_HORIZON_DAYS = 14;

const PARIS = "Europe/Paris";

/** Décalage de Paris par rapport à UTC (minutes) à un instant donné. */
function parisOffsetMinutes(at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: PARIS,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
  );
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** Instant correspondant à une date et une heure de Paris (« 2026-11-10 », « 10:00 »). */
export function parisInstant(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [h, min] = time.split(":").map(Number) as [number, number];
  const guess = new Date(Date.UTC(y, m - 1, d, h, min));
  // Deux passes : le décalage peut changer à l'heure du changement d'heure.
  const first = new Date(guess.getTime() - parisOffsetMinutes(guess) * 60_000);
  return new Date(guess.getTime() - parisOffsetMinutes(first) * 60_000);
}

/** Date de Paris (AAAA-MM-JJ) d'un instant. */
function parisDate(at: Date): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: PARIS }).format(at);
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Prochains créneaux libres du commercial : en semaine, aux débuts prévus, au moins deux heures
 * après maintenant, à plus d'une heure de tout rendez-vous déjà pris, sur deux semaines. Au plus
 * un créneau par demi-journée, pour offrir du choix.
 */
export function nextCommercialSlots(now: Date, busy: readonly Date[], count = 3): Date[] {
  const earliest = now.getTime() + COMMERCIAL_SLOT_MIN_DELAY_MINUTES * 60_000;
  const gap = COMMERCIAL_APPOINTMENT_GAP_MINUTES * 60_000;
  const slots: Date[] = [];
  const today = parisDate(now);
  for (let i = 0; i <= COMMERCIAL_SLOT_HORIZON_DAYS && slots.length < count; i++) {
    const day = addDays(today, i);
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    for (const half of ["matin", "apres-midi"] as const) {
      const starts = COMMERCIAL_SLOT_STARTS.filter((s) =>
        half === "matin" ? s < "13:00" : s >= "13:00",
      );
      for (const start of starts) {
        const at = parisInstant(day, start);
        if (at.getTime() < earliest) continue;
        if (busy.some((b) => Math.abs(b.getTime() - at.getTime()) < gap)) continue;
        slots.push(at);
        break;
      }
      if (slots.length >= count) break;
    }
  }
  return slots;
}

/** Le créneau demandé est-il un début prévu, en semaine, à l'heure de Paris ? */
export function isCommercialSlot(at: Date): boolean {
  const day = parisDate(at);
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return COMMERCIAL_SLOT_STARTS.some((s) => parisInstant(day, s).getTime() === at.getTime());
}

const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** « mardi 10 novembre à 10 h 30 » (heure de Paris), pour les e-mails et la consigne. */
export function parisSlotLabel(at: Date): string {
  const day = parisDate(at);
  const [, m, d] = day.split("-").map(Number) as [number, number, number];
  const weekday = WEEKDAYS[new Date(`${day}T12:00:00Z`).getUTCDay()] ?? "";
  const time = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
  const [h, min] = time.split(":");
  return `${weekday} ${d} ${MONTHS[m - 1]} à ${Number(h)} h${min === "00" ? "" : ` ${min}`}`;
}

/** Créneau renvoyé par le modèle (« 2026-11-10T10:00 », heure de Paris, ou ISO avec fuseau). */
export function parseSlotCode(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  const local = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(v);
  if (local) return parisInstant(local[1] as string, local[2] as string);
  const at = new Date(v);
  return /T\d{2}:\d{2}/.test(v) && !Number.isNaN(at.getTime()) ? at : null;
}

/** Code d'un créneau à rendre au modèle (« 2026-11-10T10:00 », heure de Paris). */
export function slotCode(at: Date): string {
  const time = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
  return `${parisDate(at)}T${time}`;
}

const UNITS = [
  "zéro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
];
const TENS: Record<number, string> = { 20: "vingt", 30: "trente", 40: "quarante", 50: "cinquante" };

/** Nombre de 0 à 59 en toutes lettres (« vingt et un », « dix-sept »). */
export function frenchNumberWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 59) return String(n);
  if (n <= 16) return UNITS[n] as string;
  if (n < 20) return `dix-${UNITS[n - 10]}`;
  const tens = Math.floor(n / 10) * 10;
  const unit = n % 10;
  if (unit === 0) return TENS[tens] as string;
  return unit === 1 ? `${TENS[tens]} et un` : `${TENS[tens]}-${UNITS[unit]}`;
}

/**
 * « vendredi six novembre à quatorze heures trente » : créneau à lire au téléphone (ADR 0226), tout
 * en lettres, pour que la voix ne lise jamais un chiffre à l'anglaise.
 */
export function parisSlotSpoken(at: Date): string {
  const label = parisSlotLabel(at); // « vendredi 6 novembre à 14 h 30 »
  const match = /^(\S+) (\d+) (\S+) à (\d+) h(?: (\d+))?$/.exec(label);
  if (!match) return label;
  const [, weekday, day, month, hour, minute] = match;
  const d = Number(day);
  const h = Number(hour);
  const hours =
    h === 0 ? "minuit" : h === 12 ? "midi" : `${frenchNumberWords(h)} heure${h > 1 ? "s" : ""}`;
  const minutes = minute ? ` ${frenchNumberWords(Number(minute))}` : "";
  return `${weekday} ${d === 1 ? "premier" : frenchNumberWords(d)} ${month} à ${hours}${minutes}`;
}

/**
 * Une seule Camille (F-78, ADR 0228) : les deux assistantes Vapi (artisans et particuliers) forment
 * un groupe dans chaque appel. Celle de la page répond ; si l'appelant est de l'autre côté, elle
 * passe la main sans rien dire (même voix, même prénom) et la conversation continue : la consigne
 * est remplacée, l'historique est gardé.
 * Les noms sont ceux des assistantes dans Vapi (le passage de relais les désigne par leur nom).
 */
export type VoiceSide = "pro" | "client";

export const VOICE_ASSISTANT_NAMES: Record<VoiceSide, string> = {
  pro: "Camille MENAO",
  client: "Camille particuliers",
};

const VOICE_HANDOFF_DESCRIPTIONS: Record<VoiceSide, string> = {
  pro: "Camille côté artisans : pour un artisan ou une entreprise du bâtiment (inscription, dossier, formules, rendez-vous avec un conseiller).",
  client:
    "Camille côté particuliers : pour un particulier qui a des travaux chez lui (préparer une demande de travaux).",
};

const otherSide = (side: VoiceSide): VoiceSide => (side === "pro" ? "client" : "pro");

export function voiceSquad(start: VoiceSide, ids: Record<VoiceSide, string>) {
  const member = (side: VoiceSide, starts: boolean) => ({
    assistantId: ids[side],
    assistantDestinations: [
      {
        type: "assistant" as const,
        assistantName: VOICE_ASSISTANT_NAMES[otherSide(side)],
        message: "",
        transferMode: "swap-system-message-in-history" as const,
        description: VOICE_HANDOFF_DESCRIPTIONS[otherSide(side)],
      },
    ],
    ...(starts
      ? {}
      : {
          assistantOverrides: {
            firstMessageMode: "assistant-speaks-first-with-model-generated-message" as const,
          },
        }),
  });
  return { members: [member(start, true), member(otherSide(start), false)] };
}

/**
 * Horaires d'accueil de l'équipe (F-81, ADR 0230), calculés en base (`reception_status`) : accueil
 * ouvert maintenant, heure de fermeture du jour, prochaine ouverture (jours fériés et fermetures
 * comprises). Dates ISO.
 */
export type ReceptionStatus = {
  ouvert: boolean;
  ferme_a: string | null;
  prochaine_ouverture: string | null;
};

const parisDay = (at: Date) => at.toLocaleDateString("en-CA", { timeZone: PARIS });
/** « dix-sept heures », « neuf heures trente ». */
const spokenHour = (at: Date) => parisSlotSpoken(at).split(" à ")[1] ?? "";

/** Phrase lue par Camille après une demande de rappel : quand l'équipe pourra rappeler. */
export function receptionCallbackSpoken(status: ReceptionStatus, now: Date): string {
  const close = status.ferme_a ? new Date(status.ferme_a) : null;
  if (status.ouvert && close && !Number.isNaN(close.getTime())) {
    return `L'équipe est joignable aujourd'hui jusqu'à ${spokenHour(close)} : elle rappelle dès que possible.`;
  }
  const next = status.prochaine_ouverture ? new Date(status.prochaine_ouverture) : null;
  if (!next || Number.isNaN(next.getTime())) return "L'équipe rappelle dès que possible.";
  const day = parisDay(next);
  const when =
    day === parisDay(now)
      ? `aujourd'hui à partir de ${spokenHour(next)}`
      : day === parisDay(new Date(now.getTime() + 86_400_000))
        ? `demain à partir de ${spokenHour(next)}`
        : parisSlotSpoken(next).replace(" à ", " à partir de ");
  return `L'équipe est fermée pour le moment : elle rappelle ${when}.`;
}

// ---------------------------------------------------------------------------
// Secrétaire dédiée de l'artisan (F-83, ADR 0232)
// ---------------------------------------------------------------------------

const SESSION_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(\d{10,16})\.([A-Za-z0-9_-]{20,100})$/;

async function hmacBase64Url(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Jeton d'un appel de la secrétaire : identifiant de l'artisan et échéance, signés avec le secret
 * du serveur des outils. Il passe par les variables de l'appel Vapi ; les outils ne font
 * confiance qu'à lui pour savoir pour quel artisan agir.
 */
export async function signVoiceSession(
  secret: string,
  artisanId: string,
  expiresAt: number,
): Promise<string> {
  const payload = `${artisanId}.${Math.floor(expiresAt)}`;
  return `${payload}.${await hmacBase64Url(secret, payload)}`;
}

/** Artisan d'un jeton valide et non expiré ; null sinon. */
export async function verifyVoiceSession(
  secret: string,
  token: unknown,
  now: Date,
): Promise<string | null> {
  if (!secret || typeof token !== "string") return null;
  const match = SESSION_PATTERN.exec(token);
  if (!match) return null;
  const [, artisanId, expiresAt, signature] = match as unknown as [string, string, string, string];
  if (Number(expiresAt) < now.getTime()) return null;
  const expected = await hmacBase64Url(secret, `${artisanId}.${expiresAt}`);
  return sameSecret(signature, expected) ? artisanId : null;
}

const SECRETARY_DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** « lundi de 08:00 à 12:00 et de 13:30 à 17:30 ; mardi … », d'après les horaires de l'artisan. */
export function secretaryHoursText(raw: unknown): string {
  if (!Array.isArray(raw)) return "";
  const ranges = raw.flatMap((item) => {
    const r = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return typeof r.jour === "number" && typeof r.debut === "string" && typeof r.fin === "string"
      ? [{ day: r.jour, start: r.debut, end: r.fin }]
      : [];
  });
  return SECRETARY_DAYS.flatMap((name, index) => {
    const day = ranges
      .filter((r) => r.day === index + 1)
      .sort((a, b) => a.start.localeCompare(b.start));
    return day.length ? [`${name} ${day.map((r) => `de ${r.start} à ${r.end}`).join(" et ")}`] : [];
  }).join(" ; ");
}

export type ArtisanHours = { weekday: number; start: string; end: string };

/**
 * Prochains créneaux libres de l'artisan pour sa secrétaire : ses horaires, hors absences et
 * moments occupés, au moins deux heures plus tard, par pas de 30 minutes ; au plus un le matin et
 * un l'après-midi. Sans horaires : aucun créneau (la secrétaire prend alors un message).
 */
export function nextArtisanSlots({
  hours,
  absences,
  busy,
  now,
  durationMinutes,
  count = 3,
  horizonDays = 21,
}: {
  hours: readonly ArtisanHours[];
  absences: readonly { startsOn: string; endsOn: string }[];
  busy: readonly { start: Date; end: Date }[];
  now: Date;
  durationMinutes: number;
  count?: number;
  horizonDays?: number;
}): Date[] {
  const earliest = now.getTime() + 2 * 60 * 60_000;
  const duration = durationMinutes * 60_000;
  const today = parisDate(now);
  const minutes = (time: string) => {
    const [h, m] = time.split(":").map(Number) as [number, number];
    return h * 60 + m;
  };
  const clock = (total: number) =>
    `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  const slots: Date[] = [];
  for (let i = 0; i <= horizonDays && slots.length < count; i++) {
    const day = addDays(today, i);
    if (absences.some((a) => day >= a.startsOn && day <= a.endsOn)) continue;
    const jsDay = new Date(`${day}T12:00:00Z`).getUTCDay();
    const weekday = jsDay === 0 ? 7 : jsDay;
    const starts = hours
      .filter((h) => h.weekday === weekday)
      .flatMap((h) => {
        const list: number[] = [];
        for (let m = minutes(h.start); m + durationMinutes <= minutes(h.end); m += 30) list.push(m);
        return list;
      })
      .sort((a, b) => a - b);
    for (const [from, to] of [
      [0, 12 * 60],
      [12 * 60, 24 * 60],
    ] as const) {
      if (slots.length >= count) break;
      for (const m of starts) {
        if (m < from || m >= to) continue;
        const at = parisInstant(day, clock(m));
        const end = at.getTime() + duration;
        if (at.getTime() < earliest) continue;
        if (busy.some((b) => b.start.getTime() < end && b.end.getTime() > at.getTime())) continue;
        slots.push(at);
        break;
      }
    }
  }
  return slots;
}
