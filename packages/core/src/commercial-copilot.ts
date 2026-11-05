/**
 * Copilote du commercial (F-74, ADR 0223) : fiche de préparation d'une visite, premier message
 * (SMS, WhatsApp, e-mail ou script d'appel) et compte rendu dicté, rédigés par l'IA à partir du
 * guide terrain et des données publiques du prospect. Le commercial relit tout et envoie lui-même :
 * MENAO n'envoie rien.
 *
 * Ici : métiers probables d'après le code APE, détecteur des promesses et formules interdites
 * (guide terrain, rubriques « Les règles à respecter » et « Ce que vous pouvez dire de l'offre »),
 * schémas et nettoyage des réponses du modèle, créneau d'appel conforme à la plage du guide,
 * assemblage du message (lien d'inscription, mention de refus).
 * Fichier autonome (aucun import) : il est aussi importé par l'Edge Function commercial-copilot.
 */

export const COPILOT_ACTIONS = ["brief", "message", "report"] as const;
export type CopilotAction = (typeof COPILOT_ACTIONS)[number];

export const COPILOT_CHANNELS = ["sms", "whatsapp", "email", "appel"] as const;
export type CopilotChannel = (typeof COPILOT_CHANNELS)[number];

export const COPILOT_INTERESTS = ["chaud", "tiede", "froid"] as const;
export type CopilotInterest = (typeof COPILOT_INTERESTS)[number];

/** Étapes du suivi d'un prospect (type public.prospect_status). */
export const COPILOT_STATUSES = ["a_contacter", "rdv_pris", "demo_faite", "pas_interesse"] as const;
export type CopilotStatus = (typeof COPILOT_STATUSES)[number];

export const COPILOT_NEXT_KINDS = ["appel", "visite", "message", "aucune"] as const;
export type CopilotNextKind = (typeof COPILOT_NEXT_KINDS)[number];

/** Compte rendu dicté ou écrit : de quoi dire l'essentiel, au plus 2 minutes de dictée. */
export const COPILOT_REPORT_MIN_LENGTH = 15;
export const COPILOT_REPORT_MAX_LENGTH = 3000;
/** Résumé gardé dans le suivi (public.prospect_reports). */
export const COPILOT_SUMMARY_MAX_LENGTH = 600;
export const COPILOT_OBJECTION_MAX_LENGTH = 120;
export const COPILOT_MAX_OBJECTIONS = 3;
export const COPILOT_NEXT_LABEL_MAX_LENGTH = 120;

/** Demande de la zone d'un prospect : recherches de ses métiers à moins de 20 km, 30 jours. */
export const PROSPECT_DEMAND_RADIUS_KM = 20;
export const PROSPECT_DEMAND_DAYS = 30;
/** Comme pour l'artisan qui s'inscrit (ADR 0182) : en dessous, le chiffre n'est pas cité. */
export const PROSPECT_DEMAND_MIN_SEARCHES = 5;

/** Longueur visée du texte rédigé, par canal (le lien et la mention de refus s'y ajoutent). */
export const COPILOT_MESSAGE_MAX_LENGTH: Record<CopilotChannel, number> = {
  sms: 320,
  whatsapp: 600,
  email: 1200,
  appel: 900,
};
/** Au-delà de la longueur visée × 1,5, la réponse est refusée et redemandée. */
const LENGTH_TOLERANCE = 1.5;

/** Emplacement du lien d'inscription dans le message rédigé, remplacé par le vrai lien. */
export const COPILOT_LINK_PLACEHOLDER = "[lien]";

/**
 * Métiers MENAO probables d'après le code APE (NAF rév. 2) du prospect. Seuls les codes sans
 * ambiguïté ; les autres (isolation, finitions, travaux spécialisés…) ne donnent aucun métier.
 */
const APE_TRADES: Readonly<Record<string, readonly string[]>> = {
  "41.20A": ["macon"],
  "43.12A": ["terrassier"],
  "43.12B": ["terrassier"],
  "43.21A": ["electricien"],
  "43.22A": ["plombier"],
  "43.22B": ["chauffagiste", "climaticien"],
  "43.31Z": ["plaquiste"],
  "43.32A": ["menuisier"],
  "43.32B": ["serrurier"],
  "43.33Z": ["carreleur"],
  "43.34Z": ["peintre"],
  "43.91A": ["charpentier"],
  "43.91B": ["couvreur"],
  "43.99C": ["macon"],
  "81.30Z": ["paysagiste"],
};

/** Métiers MENAO probables d'un code APE (« 43.22A » ou « 4322A »), sinon liste vide. */
export function prospectTradeCodes(ape: string | null | undefined): string[] {
  if (!ape) return [];
  const value = ape.trim().toUpperCase();
  const dotted = /^\d{4}[A-Z]$/.test(value) ? `${value.slice(0, 2)}.${value.slice(2)}` : value;
  return [...(APE_TRADES[dotted] ?? [])];
}

// ---------------------------------------------------------------------------------------------
// Promesses et formules interdites
// ---------------------------------------------------------------------------------------------

export type CopilotViolation =
  | "garantie"
  | "nombre_promis"
  | "revenu"
  | "concurrent"
  | "meilleurs"
  | "urgence"
  | "remise"
  | "delai_dossier"
  | "engagement_annuel"
  | "adresse_web";

const NUMBER = String.raw`(?:\d+|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|quinze|vingt|trente|cinquante|cent|des dizaines de|plusieurs dizaines de)`;
const LEADS = String.raw`(?:nouvelles?\s+|nouveaux\s+)?(?:demandes|chantiers|clients|contrats|devis signés|missions)`;

/**
 * Concurrents (plateformes de mise en relation et logiciels de devis) : le guide interdit de
 * citer un concurrent par son nom.
 */
const COMPETITORS = [
  "checkatrade",
  "trustup",
  "habitat ?presto",
  "travaux\\.com",
  "star ?of ?service",
  "quotatis",
  "my ?builder",
  "houzz",
  "angi",
  "home ?advisor",
  "thumbtack",
  "le ?bon ?coin",
  "pages ?jaunes",
  "solocal",
  "hellopro",
  "123 ?devis",
  "ootravaux",
  "hemea",
  "illiCO travaux",
  "obat",
  "tolteck",
  "batappli",
  "henrri",
  "axonaut",
  "costructor",
];

const RULES: readonly { code: CopilotViolation; pattern: RegExp }[] = [
  // « Clients garantis », « des chantiers garantis », « je vous garantis des demandes ».
  {
    code: "garantie",
    pattern:
      /\bgaranti\w*\b[^.!?\n]{0,30}\b(clients?|chantiers?|demandes?|contrats?|revenus?|travail|résultats?)\b|\b(clients?|chantiers?|demandes?|contrats?|revenus?|résultats?)\b[^.!?\n]{0,20}\bgaranti/iu,
  },
  // Un nombre de demandes, de chantiers ou de clients, promis ou donné comme repère.
  {
    code: "nombre_promis",
    pattern: new RegExp(
      String.raw`\b${NUMBER}\s+${LEADS}\b|\b(recevr\w*|aur\w*|obtiendr\w*|décrocher\w*)\s+(au moins\s+|jusqu'à\s+|plus de\s+)?${NUMBER}\s+${LEADS}`,
      "iu",
    ),
  },
  // Un revenu ou un chiffre d'affaires promis.
  {
    code: "revenu",
    pattern:
      /\b(gagner|gagnerez|gagnez|gagnerait|gagneriez|gagnera)\b[^.!?\n]{0,40}\d[\d\s.,]*\s?(€|euros?)|\bchiffre d'affaires\b[^.!?\n]{0,30}(\+\s?\d|\d+\s?%|doubl|tripl|augment)/iu,
  },
  { code: "concurrent", pattern: new RegExp(`\\b(${COMPETITORS.join("|")})\\b`, "iu") },
  { code: "meilleurs", pattern: /\b(les|des|nos) meilleur(e)?s artisans\b/iu },
  {
    code: "urgence",
    pattern:
      /\b(dernière chance|offre limitée|places? limitées?|plus que \d+ places?|dépêchez|ne tardez pas|aujourd'hui seulement|avant qu'il ne soit trop tard|offre exceptionnelle)\b/iu,
  },
  {
    code: "remise",
    pattern:
      /\b\d+\s?%\s*(de\s+)?(remise|réduction|rabais)\b|\b(remise|réduction|rabais)\s+(de\s+)?\d+\s?%|\bgratuit(e|s|es)? à vie\b/iu,
  },
  // Aucun délai de vérification du dossier n'est promis.
  {
    code: "delai_dossier",
    pattern:
      /\b(dossier|vérification|validation)\b[^.!?\n]{0,30}\b(en|sous|dans les?|d'ici)\s+(\d+|24|48|quelques|une|deux)\s*(h|heures?|jours?|minutes?)\b/iu,
  },
  // Le guide : ne jamais pousser l'année (ni son engagement, ni sa garantie) de soi-même.
  {
    code: "engagement_annuel",
    pattern: /(?<![\p{L}\d])(à l'année|annuel(le)?s?|engagement de 12 mois)(?![\p{L}])/iu,
  },
  // Le lien est ajouté par MENAO : aucune adresse recopiée ou inventée.
  { code: "adresse_web", pattern: /https?:\/\/|\bwww\.|\bmenao\.fr\/\S|\bwa\.me\b/iu },
];

/** Règles enfreintes par un texte rédigé par l'IA (liste vide : rien à redire). */
export function copilotViolations(text: string): CopilotViolation[] {
  const found = new Set<CopilotViolation>();
  for (const rule of RULES) if (rule.pattern.test(text)) found.add(rule.code);
  return [...found];
}

/** MENAO toujours en majuscules (le nom de domaine reste en minuscules). */
export function upperMenao(text: string): string {
  return text.replace(/\bmenao\b(?!\.fr)/giu, "MENAO");
}

// ---------------------------------------------------------------------------------------------
// Fiche de préparation
// ---------------------------------------------------------------------------------------------

/** Demande de la zone, calculée par la base (jamais par l'IA). */
export type ProspectDemand = {
  recherches: number;
  jours: number;
  rayonKm: number;
  metiers: string[];
};

export type RawCopilotBrief = {
  portrait: string;
  arguments: { titre: string; detail: string }[];
  objections: { objection: string; reponse: string }[];
  question_ouverture: string;
};

export type CopilotBrief = {
  portrait: string;
  arguments: { title: string; detail: string }[];
  objections: { objection: string; answer: string }[];
  openingQuestion: string;
};

/** Fiche gardée en base (public.prospect_briefs.content), avec la demande de la zone du jour. */
export type StoredCopilotBrief = CopilotBrief & { v: 1; demand: ProspectDemand | null };

export function copilotBriefJsonSchema() {
  const pair = (a: string, b: string) => ({
    type: "object",
    properties: { [a]: { type: "string" }, [b]: { type: "string" } },
    required: [a, b],
    additionalProperties: false,
  });
  return {
    type: "object",
    properties: {
      portrait: { type: "string" },
      arguments: { type: "array", items: pair("titre", "detail") },
      objections: { type: "array", items: pair("objection", "reponse") },
      question_ouverture: { type: "string" },
    },
    required: ["portrait", "arguments", "objections", "question_ouverture"],
    additionalProperties: false,
  } as const;
}

const clean = (value: string, max: number) =>
  upperMenao(value.replace(/\s+/g, " ").trim()).slice(0, max);

/** Fiche nettoyée (3 arguments et 3 objections au plus), ou null si elle est inutilisable. */
export function normalizeCopilotBrief(raw: RawCopilotBrief): CopilotBrief | null {
  const portrait = clean(raw.portrait, 400);
  const args = raw.arguments
    .map((a) => ({ title: clean(a.titre, 80), detail: clean(a.detail, 300) }))
    .filter((a) => a.title && a.detail)
    .slice(0, 3);
  const objections = raw.objections
    .map((o) => ({ objection: clean(o.objection, 140), answer: clean(o.reponse, 400) }))
    .filter((o) => o.objection && o.answer)
    .slice(0, 3);
  const openingQuestion = clean(raw.question_ouverture, 200);
  if (!portrait || args.length < 2 || objections.length < 2 || !openingQuestion) return null;
  return { portrait, arguments: args, objections, openingQuestion };
}

/**
 * Textes de la fiche que le commercial dira à l'artisan (arguments, réponses, question
 * d'ouverture), pour le détecteur de promesses interdites. Le portrait et l'énoncé des objections
 * décrivent le prospect : ils peuvent citer ses propos (« je fais déjà 20 chantiers par mois »).
 */
export function briefTexts(brief: CopilotBrief): string[] {
  return [
    ...brief.arguments.flatMap((a) => [a.title, a.detail]),
    ...brief.objections.map((o) => o.answer),
    brief.openingQuestion,
  ];
}

/** Fiche relue depuis la base (contenu JSON), ou null si elle est illisible. */
export function parseStoredBrief(value: unknown): StoredCopilotBrief | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<StoredCopilotBrief>;
  if (
    v.v !== 1 ||
    typeof v.portrait !== "string" ||
    !Array.isArray(v.arguments) ||
    !Array.isArray(v.objections) ||
    typeof v.openingQuestion !== "string"
  ) {
    return null;
  }
  const d = v.demand;
  const demand =
    d &&
    typeof d === "object" &&
    typeof d.recherches === "number" &&
    typeof d.jours === "number" &&
    typeof d.rayonKm === "number" &&
    Array.isArray(d.metiers)
      ? {
          recherches: d.recherches,
          jours: d.jours,
          rayonKm: d.rayonKm,
          metiers: d.metiers.filter((m): m is string => typeof m === "string"),
        }
      : null;
  return {
    v: 1,
    portrait: v.portrait,
    arguments: v.arguments.filter(
      (a): a is { title: string; detail: string } =>
        !!a && typeof a.title === "string" && typeof a.detail === "string",
    ),
    objections: v.objections.filter(
      (o): o is { objection: string; answer: string } =>
        !!o && typeof o.objection === "string" && typeof o.answer === "string",
    ),
    openingQuestion: v.openingQuestion,
    demand,
  };
}

/** Demande assez forte pour être citée (même seuil que l'ADR 0182). */
export function demandWorthCiting(demand: ProspectDemand | null): demand is ProspectDemand {
  return !!demand && demand.recherches >= PROSPECT_DEMAND_MIN_SEARCHES;
}

// ---------------------------------------------------------------------------------------------
// Premier message
// ---------------------------------------------------------------------------------------------

export type RawCopilotMessage = { objet: string; texte: string };
export type CopilotMessage = { subject: string | null; body: string };

export function copilotMessageJsonSchema() {
  return {
    type: "object",
    properties: { objet: { type: "string" }, texte: { type: "string" } },
    required: ["objet", "texte"],
    additionalProperties: false,
  } as const;
}

/**
 * Message nettoyé : objet seulement pour un e-mail ; un message écrit garde l'emplacement du lien
 * (ajouté à la fin s'il manque) ; un script d'appel n'en a pas. Null si le texte est vide ou bien
 * trop long.
 */
export function normalizeCopilotMessage(
  raw: RawCopilotMessage,
  channel: CopilotChannel,
): CopilotMessage | null {
  let body = upperMenao(
    raw.texte
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
  if (!body || body.length > COPILOT_MESSAGE_MAX_LENGTH[channel] * LENGTH_TOLERANCE) return null;
  if (channel === "appel") {
    body = body.replaceAll(COPILOT_LINK_PLACEHOLDER, "").trim();
  } else if (!body.includes(COPILOT_LINK_PLACEHOLDER)) {
    body = `${body}\n\n${COPILOT_LINK_PLACEHOLDER}`;
  }
  const subject = channel === "email" ? clean(raw.objet, 90) || null : null;
  return { subject, body };
}

/**
 * Message prêt à envoyer : le lien d'inscription du commercial à la place de l'emplacement (une
 * seule fois), puis la mention de refus pour un message écrit.
 */
export function composeProspectMessage(
  channel: CopilotChannel,
  body: string,
  { link, optOut }: { link: string; optOut: string },
): string {
  if (channel === "appel") return body.replaceAll(COPILOT_LINK_PLACEHOLDER, "").trim();
  const [first, ...rest] = body.split(COPILOT_LINK_PLACEHOLDER);
  const withLink = rest.length ? `${first}${link}${rest.join("")}` : `${body}\n\n${link}`;
  return optOut ? `${withLink.trim()}\n\n${optOut}` : withLink.trim();
}

/** Numéro au format international (+33…) → chiffres seuls pour wa.me, sinon null. */
function waDigits(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/[^\d]/g, "") ?? "";
  return digits.length >= 8 ? digits : null;
}

/** Ouvre WhatsApp avec le message pré-rempli, vers le numéro du prospect s'il est connu. */
export function whatsAppMessageUrl(phone: string | null | undefined, text: string): string {
  const to = waDigits(phone);
  return `https://wa.me/${to ?? ""}?text=${encodeURIComponent(text)}`;
}

/** Ouvre l'application SMS avec le message pré-rempli (forme comprise par iOS et Android). */
export function smsMessageUrl(phone: string | null | undefined, text: string): string {
  return `sms:${phone ?? ""}?&body=${encodeURIComponent(text)}`;
}

/** Ouvre la messagerie avec l'objet et le texte (le commercial choisit le destinataire). */
export function emailMessageUrl(subject: string | null, text: string): string {
  const params = [
    subject ? `subject=${encodeURIComponent(subject)}` : null,
    `body=${encodeURIComponent(text)}`,
  ].filter(Boolean);
  return `mailto:?${params.join("&")}`;
}

// ---------------------------------------------------------------------------------------------
// Compte rendu dicté
// ---------------------------------------------------------------------------------------------

export type RawCopilotReport = {
  resume: string;
  interet: string;
  objections: string[];
  statut: string;
  ne_plus_contacter: boolean;
  prochaine_action: { type: string; date: string | null; heure: string | null; libelle: string };
  message_suivi: string | null;
};

export type CopilotNextAction = {
  kind: Exclude<CopilotNextKind, "aucune">;
  /** AAAA-MM-JJ, heure de Paris. */
  date: string;
  /** HH:MM, heure de Paris. */
  time: string;
  label: string;
};

export type CopilotReport = {
  summary: string;
  interest: CopilotInterest;
  objections: string[];
  status: CopilotStatus;
  /** L'artisan a demandé à ne plus être contacté : « Ne plus contacter », rien d'autre. */
  doNotContact: boolean;
  nextAction: CopilotNextAction | null;
  followUp: string | null;
};

export function copilotReportJsonSchema() {
  return {
    type: "object",
    properties: {
      resume: { type: "string" },
      interet: { type: "string", enum: [...COPILOT_INTERESTS] },
      objections: { type: "array", items: { type: "string" } },
      statut: { type: "string", enum: [...COPILOT_STATUSES] },
      ne_plus_contacter: { type: "boolean" },
      prochaine_action: {
        type: "object",
        properties: {
          type: { type: "string", enum: [...COPILOT_NEXT_KINDS] },
          date: { anyOf: [{ type: "string" }, { type: "null" }] },
          heure: { anyOf: [{ type: "string" }, { type: "null" }] },
          libelle: { type: "string" },
        },
        required: ["type", "date", "heure", "libelle"],
        additionalProperties: false,
      },
      message_suivi: { anyOf: [{ type: "string" }, { type: "null" }] },
    },
    required: [
      "resume",
      "interet",
      "objections",
      "statut",
      "ne_plus_contacter",
      "prochaine_action",
      "message_suivi",
    ],
    additionalProperties: false,
  } as const;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function validDate(date: string): boolean {
  if (!DATE.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const at = new Date(Date.UTC(y, m - 1, d));
  return at.getUTCFullYear() === y && at.getUTCMonth() === m - 1 && at.getUTCDate() === d;
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** 0 = dimanche … 6 = samedi. */
function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Plage d'appel du guide terrain : en semaine, de 10 h à 13 h et de 14 h à 20 h. */
export const CALL_WINDOWS = [
  ["10:00", "13:00"],
  ["14:00", "20:00"],
] as const;

/** Heure HH:MM arrondie au quart d'heure supérieur (un rappel à 10 h 07 se lit mal). */
function roundQuarter(time: string): string {
  const [h, m] = time.split(":").map(Number) as [number, number];
  const total = h * 60 + Math.ceil(m / 15) * 15;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Dernier début d'appel accepté : l'appel tient avant 20 h. */
const LAST_CALL = "19:30";

/**
 * Créneau d'appel dans la plage du guide (heure de Paris) : jamais avant maintenant, jamais un
 * samedi ni un dimanche (l'heure voulue est gardée le lundi), une heure trop matinale passe à 10 h,
 * la pause de midi à 14 h, après 19 h 30 au jour de semaine suivant à 10 h.
 */
export function callSlot(
  date: string,
  time: string | null,
  now: { date: string; time: string },
): { date: string; time: string } {
  let wanted = time && TIME.test(time) ? time : "10:00";
  let day = validDate(date) && date >= now.date ? date : now.date;
  // Au plus quelques jours parcourus (fin de semaine, soirée) : borne de sécurité.
  for (let i = 0; i < 10; i++) {
    if (weekday(day) !== 0 && weekday(day) !== 6) {
      let at = roundQuarter(day === now.date && wanted < now.time ? now.time : wanted);
      if (at < "10:00") at = "10:00";
      else if (at >= "13:00" && at < "14:00") at = "14:00";
      if (at <= LAST_CALL) return { date: day, time: at };
      wanted = "10:00";
    }
    day = addDays(day, 1);
  }
  return { date: day, time: "10:00" };
}

/**
 * Compte rendu nettoyé. « Ne plus contacter » l'emporte sur tout : étape « pas intéressé », ni
 * prochaine action ni message de suivi. Un appel est ramené dans la plage du guide ; une visite ou
 * un message gardent leur date, jamais dans le passé. Null si le résumé est vide.
 */
export function normalizeCopilotReport(
  raw: RawCopilotReport,
  now: { date: string; time: string },
): CopilotReport | null {
  const summary = clean(raw.resume, COPILOT_SUMMARY_MAX_LENGTH);
  if (!summary) return null;
  const interest = COPILOT_INTERESTS.find((i) => i === raw.interet) ?? "tiede";
  const objections = raw.objections
    .map((o) => clean(o, COPILOT_OBJECTION_MAX_LENGTH))
    .filter(Boolean)
    .slice(0, COPILOT_MAX_OBJECTIONS);
  const doNotContact = raw.ne_plus_contacter === true;
  let status = COPILOT_STATUSES.find((s) => s === raw.statut) ?? "a_contacter";
  if (doNotContact) status = "pas_interesse";

  let nextAction: CopilotNextAction | null = null;
  const next = raw.prochaine_action;
  const kind = COPILOT_NEXT_KINDS.find((k) => k === next?.type);
  if (!doNotContact && kind && kind !== "aucune") {
    const label = clean(next.libelle, COPILOT_NEXT_LABEL_MAX_LENGTH);
    const fallbackDate = addDays(now.date, kind === "appel" ? 2 : 3);
    const date = next.date && validDate(next.date) ? next.date : fallbackDate;
    if (kind === "appel") {
      nextAction = { kind, label, ...callSlot(date, next.heure, now) };
    } else {
      const day = date < now.date ? now.date : date;
      const time = next.heure && TIME.test(next.heure) ? next.heure : "09:00";
      nextAction = { kind, label, date: day, time };
    }
  }
  const followUpText = raw.message_suivi
    ? upperMenao(raw.message_suivi.replace(/\r\n?/g, "\n").trim()).slice(
        0,
        COPILOT_MESSAGE_MAX_LENGTH.whatsapp * LENGTH_TOLERANCE,
      )
    : "";
  return {
    summary,
    interest,
    objections,
    status,
    doNotContact,
    nextAction,
    followUp: doNotContact || !followUpText ? null : followUpText,
  };
}

/**
 * Texte du compte rendu destiné à l'artisan (le message de suivi), pour le détecteur de promesses
 * interdites. Résumé et objections restent des notes : ils rapportent ce que l'artisan a dit.
 */
export function reportTexts(report: CopilotReport): string[] {
  return report.followUp ? [report.followUp] : [];
}
