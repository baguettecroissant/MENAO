/**
 * Exemples de l'espace artisan (ADR 0184) : demandes et chantiers fictifs pour découvrir son
 * espace pendant la vérification du dossier, puis tant qu'aucune vraie demande n'est arrivée.
 * Rien n'est enregistré : les écrans affichent ces données en lecture seule, actions désactivées.
 * Mêmes formes que les fonctions de la base (artisan_inbox, artisan_chantiers,
 * artisan_request_detail, artisan_chantier_detail), dates relatives à `now`. Personnes, adresses
 * et numéros fictifs.
 */

import { HOURS_PRESETS, agendaItemsFrom, type AgendaItem, type HoursRange } from "./agenda";
import type { ActivityChantier, ActivityPayment, ActivityQuote } from "./artisan-activity";
import type { ExpenseRow } from "./expenses";
import { REQUIRED_DOCUMENT_TYPES, type ArtisanOnboardingSnapshot } from "./onboarding";
import type { ProfileHubFacts } from "./profile-hub";
import { parisToday } from "./project";
import { quoteTotals, type QuoteLineType, type QuoteUnit } from "./quote";
import type { ValueForMoney } from "./review";

const PREFIX = "00000000-0000-4000-8000-00000000e";

/** Identifiants fixes des exemples, reconnaissables (jamais générés par la base). */
export const EXAMPLE_IDS = {
  demandeSalleDeBains: `${PREFIX}101`,
  demandeFuite: `${PREFIX}102`,
  demandeChauffeEau: `${PREFIX}103`,
  demandeCuisine: `${PREFIX}104`,
  demandeSalleDEau: `${PREFIX}105`,
  chantierChauffeEau: `${PREFIX}201`,
  chantierCuisine: `${PREFIX}202`,
  chantierSalleDEau: `${PREFIX}203`,
  devisCuisine: `${PREFIX}301`,
  devisSalleDEau: `${PREFIX}302`,
  devisChauffeEau: `${PREFIX}303`,
  factureAcompte: `${PREFIX}401`,
  creneauFournisseur: `${PREFIX}601`,
  depenseCarrelage: `${PREFIX}551`,
  depenseSanitaire: `${PREFIX}552`,
  depenseCarburant: `${PREFIX}553`,
  depenseLocation: `${PREFIX}554`,
  depenseOutillage: `${PREFIX}555`,
  ficheArtisan: `${PREFIX}901`,
} as const;

const EXAMPLE_ID = /^00000000-0000-4000-8000-00000000e\d{3}$/;

export function isExampleId(id: string): boolean {
  return EXAMPLE_ID.test(id);
}

/**
 * Exemples visibles dans l'espace d'un artisan validé : tant qu'il n'a reçu aucune demande ni
 * aucun chantier, et qu'il ne les a pas masqués.
 */
export function spaceExamplesShown(input: {
  requests: number;
  chantiers: number;
  hiddenAt: string | null;
}): boolean {
  return input.requests === 0 && input.chantiers === 0 && input.hiddenAt === null;
}

/** Photos des exemples : clés traduites en images fournies avec le site et l'application. */
export type ExamplePhoto = "carrelage" | "plomberie" | "chauffage";
export const EXAMPLE_PHOTO_PREFIX = "exemple/";

export function examplePhotoKey(path: string): ExamplePhoto | null {
  if (!path.startsWith(EXAMPLE_PHOTO_PREFIX)) return null;
  const key = path.slice(EXAMPLE_PHOTO_PREFIX.length);
  return key === "carrelage" || key === "plomberie" || key === "chauffage" ? key : null;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const iso = (ms: number) => new Date(ms).toISOString();

/** Heure de Paris (« HH:MM ») d'un jour décalé de `days` par rapport à aujourd'hui, en ISO. */
function parisAt(now: Date, days: number, time: string): string {
  const [y, m, d] = parisToday(now).split("-").map(Number) as [number, number, number];
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  // Midi UTC du jour voulu, puis décalage de Paris ce jour-là (heure d'été ou d'hiver).
  const noon = new Date(Date.UTC(y, m - 1, d + days, 12));
  const parisNoon = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(noon),
  );
  const offset = parisNoon - 12;
  return iso(Date.UTC(y, m - 1, d + days, hh - offset, mm));
}

const dateOnly = (now: Date, days: number) => parisAt(now, days, "12:00").slice(0, 10);

/**
 * Décalage en jours du n-ième jour ouvré (lundi à vendredi) après (n > 0) ou avant (n < 0)
 * aujourd'hui : rendez-vous et démarrages des exemples ne tombent jamais un week-end.
 */
function workday(now: Date, n: number): number {
  const [y, m, d] = parisToday(now).split("-").map(Number) as [number, number, number];
  const step = n < 0 ? -1 : 1;
  let offset = 0;
  for (let left = Math.abs(n); left > 0;) {
    offset += step;
    const weekday = new Date(Date.UTC(y, m - 1, d + offset)).getUTCDay();
    if (weekday !== 0 && weekday !== 6) left -= 1;
  }
  return offset;
}

type Client = { first_name: string; last_name: string; phone: string; email: string };

const CLIENTS = {
  camille: {
    first_name: "Camille",
    last_name: "Morel",
    phone: "+33600000001",
    email: "camille@example.com",
  },
  sophie: {
    first_name: "Sophie",
    last_name: "Lambert",
    phone: "+33600000002",
    email: "sophie@example.com",
  },
  marc: {
    first_name: "Marc",
    last_name: "Fabre",
    phone: "+33600000003",
    email: "marc@example.com",
  },
  nathalie: {
    first_name: "Nathalie",
    last_name: "Roux",
    phone: "+33600000004",
    email: "nathalie@example.com",
  },
  thomas: {
    first_name: "Thomas",
    last_name: "Girard",
    phone: "+33600000005",
    email: "thomas@example.com",
  },
} satisfies Record<string, Client>;

const PLACE = {
  nice: { ville_nom: "Nice", code_postal: "06000", lat: 43.7, lon: 7.27 },
  antibes: { ville_nom: "Antibes", code_postal: "06600", lat: 43.58, lon: 7.12 },
  cagnes: { ville_nom: "Cagnes-sur-Mer", code_postal: "06800", lat: 43.66, lon: 7.15 },
};

type Budget = "moins_1000" | "1000_5000" | "5000_15000" | "15000_50000" | "plus_50000";
type DateMode = "des_que_possible" | "date" | "inconnue";

/** Détail d'une demande (forme de artisan_request_detail). */
export type ExampleRequestDetail = {
  id: string;
  status: "envoyee" | "acceptee";
  created_at: string;
  expires_at: string;
  refusal_reason: null;
  callback_mode: "des_que_possible" | "plage";
  callback_from: string | null;
  callback_to: string | null;
  message: string | null;
  description: string;
  summary: string | null;
  artisan_brief: string | null;
  budget: Budget | null;
  trade: string | null;
  hors_zone: boolean;
  autres_metiers: string[];
  lieu_type: "appartement" | "maison" | "jardin" | "entreprise" | null;
  surface: "moins_10" | "10_20" | "20_50" | "plus_50" | null;
  rooms: string[];
  work_types: string[];
  urgence: boolean;
  date_mode: DateMode;
  date_souhaitee: string | null;
  ville_nom: string | null;
  code_postal: string | null;
  adresse: string | null;
  lat: number | null;
  lon: number | null;
  photos: string[];
  client: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
  };
  chantier_id: string | null;
};

type ExampleChantierStatus = "rdv_planifie" | "devis_envoye" | "en_cours";

/** Détail d'un chantier (forme de artisan_chantier_detail). */
export type ExampleChantierDetail = ExampleRequestDetail & {
  chantier: {
    id: string;
    status: ExampleChantierStatus;
    title: string;
    created_at: string;
    start_at: string | null;
    cancelled_at: null;
  };
  appointment: { starts_at: string; status: "planifie"; notes: string | null } | null;
};

/** Ligne de la liste des demandes (forme de artisan_inbox). */
export type ExampleInboxRow = {
  request_id: string;
  status: "envoyee";
  created_at: string;
  expires_at: string;
  summary: string;
  trade_label: string;
  code_postal: string;
  ville_nom: string;
  client_first_name: string;
  date_mode: DateMode;
  date_souhaitee: string | null;
  urgence: boolean;
  photo_path: string | null;
};

/** Ligne de la liste des chantiers (forme de artisan_chantiers). */
export type ExampleChantierRow = {
  chantier_id: string;
  request_id: string;
  particulier_id: string;
  status: ExampleChantierStatus;
  title: string;
  created_at: string;
  appointment_at: string | null;
  start_at: string | null;
  adresse: string | null;
  code_postal: string;
  ville_nom: string;
  client_first_name: string;
  client_last_name: string;
};

/** Demandes reçues, en attente de réponse. */
export function exampleRequests(now: Date = new Date()): ExampleRequestDetail[] {
  const t = now.getTime();
  return [
    {
      id: EXAMPLE_IDS.demandeSalleDeBains,
      status: "envoyee",
      created_at: iso(t - 2 * HOUR),
      expires_at: iso(t + 46 * HOUR),
      refusal_reason: null,
      callback_mode: "plage",
      callback_from: "17:00:00",
      callback_to: "19:00:00",
      message: "Je suis disponible en fin de journée pour une visite.",
      description:
        "Je souhaite refaire ma salle de bains de 6 m² : remplacer la baignoire par une douche à l'italienne, changer le lavabo et refaire la faïence.",
      summary: "Rénovation de salle de bains",
      artisan_brief:
        "Rénovation d'une salle de bains de 6 m² en appartement : dépose de la baignoire, création d'une douche à l'italienne, remplacement du lavabo et pose de faïence.",
      budget: "5000_15000",
      trade: "Plombier",
      hors_zone: false,
      autres_metiers: ["Carreleur"],
      lieu_type: "appartement",
      surface: "moins_10",
      rooms: ["Salle de bains"],
      work_types: ["Douche à l'italienne", "Remplacement de sanitaires"],
      urgence: false,
      date_mode: "des_que_possible",
      date_souhaitee: null,
      ...PLACE.nice,
      adresse: null,
      photos: [],
      client: { first_name: CLIENTS.camille.first_name, last_name: null, phone: null, email: null },
      chantier_id: null,
    },
    {
      id: EXAMPLE_IDS.demandeFuite,
      status: "envoyee",
      created_at: iso(t - 35 * 60_000),
      expires_at: iso(t + 23 * HOUR),
      refusal_reason: null,
      callback_mode: "des_que_possible",
      callback_from: null,
      callback_to: null,
      message: null,
      description:
        "De l'eau coule sous l'évier de la cuisine depuis ce matin, j'ai fermé le robinet d'arrivée.",
      summary: "Fuite sous l'évier",
      artisan_brief:
        "Fuite d'eau sous l'évier de la cuisine, arrivée d'eau coupée par le client : recherche et réparation de la fuite.",
      budget: "moins_1000",
      trade: "Plombier",
      hors_zone: false,
      autres_metiers: [],
      lieu_type: "maison",
      surface: null,
      rooms: ["Cuisine"],
      work_types: ["Recherche de fuite"],
      urgence: true,
      date_mode: "des_que_possible",
      date_souhaitee: null,
      ...PLACE.antibes,
      adresse: null,
      photos: [],
      client: { first_name: CLIENTS.sophie.first_name, last_name: null, phone: null, email: null },
      chantier_id: null,
    },
  ];
}

const accepted = (
  client: Client,
  place: (typeof PLACE)[keyof typeof PLACE],
  street: string,
  chantierId: string,
) => ({
  status: "acceptee" as const,
  ...place,
  adresse: `${street}\n${place.code_postal} ${place.ville_nom}`,
  client: { ...client },
  chantier_id: chantierId,
});

/** Chantiers : rendez-vous demain, devis envoyé, travaux en cours (acompte payé). */
export function exampleChantiers(now: Date = new Date()): ExampleChantierDetail[] {
  const t = now.getTime();
  const base = {
    refusal_reason: null,
    callback_mode: "des_que_possible" as const,
    callback_from: null,
    callback_to: null,
    message: null,
    hors_zone: false,
    autres_metiers: [],
    date_souhaitee: null,
    photos: [],
  };
  return [
    {
      ...base,
      id: EXAMPLE_IDS.demandeChauffeEau,
      created_at: iso(t - 3 * DAY),
      expires_at: iso(t - DAY),
      description: "Mon chauffe-eau de 200 litres a 15 ans et l'eau n'est plus assez chaude.",
      summary: "Remplacement d'un chauffe-eau",
      artisan_brief: "Remplacement d'un chauffe-eau électrique de 200 litres âgé de 15 ans.",
      budget: "1000_5000",
      trade: "Plombier",
      lieu_type: "maison",
      surface: null,
      rooms: ["Buanderie"],
      work_types: ["Chauffe-eau"],
      urgence: false,
      date_mode: "des_que_possible",
      ...accepted(CLIENTS.marc, PLACE.cagnes, "8 rue de l'Exemple", EXAMPLE_IDS.chantierChauffeEau),
      chantier: {
        id: EXAMPLE_IDS.chantierChauffeEau,
        status: "rdv_planifie",
        title: "Remplacement d'un chauffe-eau",
        created_at: iso(t - 2 * DAY),
        start_at: null,
        cancelled_at: null,
      },
      appointment: {
        starts_at: parisAt(now, workday(now, 1), "10:00"),
        status: "planifie",
        notes: "Prévoir la mesure de l'emplacement et vérifier l'évacuation.",
      },
    },
    {
      ...base,
      id: EXAMPLE_IDS.demandeCuisine,
      created_at: iso(t - 9 * DAY),
      expires_at: iso(t - 7 * DAY),
      description:
        "Je fais refaire ma cuisine : il faut déplacer l'évier de deux mètres et raccorder le lave-vaisselle.",
      summary: "Plomberie d'une cuisine",
      artisan_brief:
        "Rénovation de cuisine : déplacement de l'évier d'environ deux mètres et raccordement du lave-vaisselle.",
      budget: "1000_5000",
      trade: "Plombier",
      lieu_type: "appartement",
      surface: "10_20",
      rooms: ["Cuisine"],
      work_types: ["Raccordements", "Déplacement d'évier"],
      urgence: false,
      date_mode: "date",
      ...accepted(
        CLIENTS.nathalie,
        PLACE.nice,
        "21 avenue de l'Exemple",
        EXAMPLE_IDS.chantierCuisine,
      ),
      date_souhaitee: dateOnly(now, 20),
      chantier: {
        id: EXAMPLE_IDS.chantierCuisine,
        status: "devis_envoye",
        title: "Plomberie d'une cuisine",
        created_at: iso(t - 8 * DAY),
        start_at: null,
        cancelled_at: null,
      },
      appointment: {
        starts_at: parisAt(now, workday(now, -5), "14:00"),
        status: "planifie",
        notes: null,
      },
    },
    {
      ...base,
      id: EXAMPLE_IDS.demandeSalleDEau,
      created_at: iso(t - 10 * DAY),
      expires_at: iso(t - 8 * DAY),
      description: "Création d'une salle d'eau dans une ancienne chambre : douche, lavabo et WC.",
      summary: "Création d'une salle d'eau",
      artisan_brief:
        "Création complète d'une salle d'eau dans une chambre : alimentation, évacuations, douche, lavabo et WC.",
      budget: "5000_15000",
      trade: "Plombier",
      lieu_type: "maison",
      surface: "moins_10",
      rooms: ["Salle d'eau"],
      work_types: ["Création de salle d'eau"],
      urgence: false,
      date_mode: "des_que_possible",
      ...accepted(
        CLIENTS.thomas,
        PLACE.antibes,
        "3 chemin de l'Exemple",
        EXAMPLE_IDS.chantierSalleDEau,
      ),
      chantier: {
        id: EXAMPLE_IDS.chantierSalleDEau,
        status: "en_cours",
        title: "Création d'une salle d'eau",
        created_at: iso(t - 9 * DAY),
        start_at: parisAt(now, workday(now, -1), "08:00"),
        cancelled_at: null,
      },
      appointment: {
        starts_at: parisAt(now, workday(now, -7), "09:30"),
        status: "planifie",
        notes: null,
      },
    },
  ];
}

/** Liste des demandes (artisan_inbox). */
export function exampleInbox(now: Date = new Date()): ExampleInboxRow[] {
  return exampleRequests(now).map((r) => ({
    request_id: r.id,
    status: "envoyee",
    created_at: r.created_at,
    expires_at: r.expires_at,
    summary: r.summary ?? "",
    trade_label: r.trade ?? "",
    code_postal: r.code_postal ?? "",
    ville_nom: r.ville_nom ?? "",
    client_first_name: r.client.first_name ?? "",
    date_mode: r.date_mode,
    date_souhaitee: r.date_souhaitee,
    urgence: r.urgence,
    photo_path: null,
  }));
}

/** Liste des chantiers (artisan_chantiers), du plus récent au plus ancien. */
export function exampleChantierRows(now: Date = new Date()): ExampleChantierRow[] {
  return exampleChantiers(now).map((c) => ({
    chantier_id: c.chantier.id,
    request_id: c.id,
    // Un client fictif par chantier (compte des clients en attente de devis).
    particulier_id: c.id,
    status: c.chantier.status,
    title: c.chantier.title,
    created_at: c.chantier.created_at,
    appointment_at:
      c.chantier.status === "rdv_planifie" ? (c.appointment?.starts_at ?? null) : null,
    start_at: c.chantier.start_at,
    adresse: c.adresse,
    code_postal: c.code_postal ?? "",
    ville_nom: c.ville_nom ?? "",
    client_first_name: c.client.first_name ?? "",
    client_last_name: c.client.last_name ?? "",
  }));
}

export function exampleRequest(id: string, now: Date = new Date()): ExampleRequestDetail | null {
  return exampleRequests(now).find((r) => r.id === id) ?? null;
}

export function exampleChantier(id: string, now: Date = new Date()): ExampleChantierDetail | null {
  return exampleChantiers(now).find((c) => c.chantier.id === id) ?? null;
}

/** Devis envoyé du chantier « Plomberie d'une cuisine », en attente de réponse. */
export function exampleSentQuote(now: Date = new Date()) {
  return {
    id: EXAMPLE_IDS.devisCuisine,
    status: "envoye" as const,
    numero: "DEVIS-EXEMPLE-0002",
    total_ttc_cents: 186_120,
    sent_at: iso(now.getTime() - 2 * DAY),
    valid_until: dateOnly(now, 28),
    refusal_reason: null,
    client_message: null,
    signed_at: null,
  };
}

/** Données du suivi du chantier « Création d'une salle d'eau » (travaux en cours). */
export function exampleFollowUp(now: Date = new Date()) {
  const t = now.getTime();
  const total = 792_000;
  const deposit = 237_600;
  const signedAt = iso(t - 4 * DAY);
  const depositPaidAt = iso(t - 3 * DAY);
  return {
    quote: {
      id: EXAMPLE_IDS.devisSalleDEau,
      status: "signe" as const,
      numero: "DEVIS-EXEMPLE-0001",
      sent_at: iso(t - 6 * DAY),
      signed_at: signedAt,
      total_ttc_cents: total,
      start_date: dateOnly(now, workday(now, -1)),
    },
    payments: [
      {
        quote_id: EXAMPLE_IDS.devisSalleDEau,
        kind: "acompte" as const,
        status: "paye" as const,
        amount_cents: deposit,
        paid_at: depositPaidAt,
      },
    ],
    invoices: [
      {
        id: EXAMPLE_IDS.factureAcompte,
        numero: "FAC-EXEMPLE-0001",
        kind: "acompte" as const,
        issued_on: depositPaidAt.slice(0, 10),
      },
    ],
    updates: [
      {
        id: `${PREFIX}501`,
        kind: "photo" as const,
        message: null,
        storage_path: `${EXAMPLE_PHOTO_PREFIX}plomberie`,
        created_at: iso(t - 5 * HOUR),
      },
      {
        id: `${PREFIX}502`,
        kind: "message" as const,
        message: "Évacuations posées et testées. Demain : pose du receveur de douche.",
        storage_path: null,
        created_at: iso(t - 4 * HOUR),
      },
      {
        id: `${PREFIX}503`,
        kind: "message" as const,
        message: "Ancienne cloison déposée, arrivées d'eau en place.",
        storage_path: null,
        created_at: iso(t - 26 * HOUR),
      },
    ],
    conversation: { last_at: iso(t - 3 * HOUR), unread: 1, closed: false },
  };
}

/** Paiements encaissés des exemples (« Encaissé ce mois » du tableau de bord). */
export function examplePayments(now: Date = new Date()) {
  return exampleFollowUp(now).payments.map((p) => ({
    amountCents: p.amount_cents,
    paidAt: p.paid_at,
  }));
}

// ---------------------------------------------------------------------------------------------
// Autres rubriques de l'espace : devis, messages, agenda, factures, avis, grade, profil, fiche
// ---------------------------------------------------------------------------------------------

type ExampleQuoteLine = {
  type: QuoteLineType;
  designation: string;
  description: string;
  quantityMilli: number;
  unit: QuoteUnit;
  unitPriceHtCents: number;
  vatRateBp: number;
};

/** Brouillon du devis « Remplacement d'un chauffe-eau » (éditeur de devis, après la visite). */
export function exampleQuoteDraftLines(): ExampleQuoteLine[] {
  return [
    {
      type: "materiel",
      designation: "Chauffe-eau électrique 200 litres",
      description: "Chauffe-eau vertical mural, résistance stéatite.",
      quantityMilli: 1000,
      unit: "u",
      unitPriceHtCents: 68_000,
      vatRateBp: 1000,
    },
    {
      type: "main_oeuvre",
      designation: "Dépose de l'ancien chauffe-eau et pose du nouveau",
      description: "",
      quantityMilli: 3000,
      unit: "h",
      unitPriceHtCents: 5_500,
      vatRateBp: 1000,
    },
    {
      type: "materiel",
      designation: "Groupe de sécurité et raccords",
      description: "",
      quantityMilli: 1000,
      unit: "forfait",
      unitPriceHtCents: 4_500,
      vatRateBp: 1000,
    },
    {
      type: "autre",
      designation: "Évacuation de l'ancien appareil",
      description: "",
      quantityMilli: 1000,
      unit: "forfait",
      unitPriceHtCents: 3_000,
      vatRateBp: 1000,
    },
  ];
}

/** Ligne de la liste des devis (forme de artisan_quotes). */
export type ExampleQuoteRow = {
  quote_id: string;
  chantier_id: string;
  status: "brouillon" | "envoye" | "signe";
  title: string;
  client_name: string;
  line_count: number;
  total_ttc_cents: number;
  numero: string | null;
  sent_at: string | null;
  appointment_at: string | null;
  version: number;
  updated_at: string;
};

/** Devis : brouillon à envoyer, devis envoyé, devis signé. */
export function exampleQuoteRows(now: Date = new Date()): ExampleQuoteRow[] {
  const [chauffeEau, cuisine, salleDEau] = exampleChantiers(now);
  const sent = exampleSentQuote(now);
  const signed = exampleFollowUp(now).quote;
  const draft = exampleQuoteDraftLines();
  const client = (c: ExampleChantierDetail | undefined) =>
    [c?.client.first_name, c?.client.last_name].filter(Boolean).join(" ");
  return [
    {
      quote_id: EXAMPLE_IDS.devisChauffeEau,
      chantier_id: EXAMPLE_IDS.chantierChauffeEau,
      status: "brouillon",
      title: "Remplacement d'un chauffe-eau",
      client_name: client(chauffeEau),
      line_count: draft.length,
      total_ttc_cents: quoteTotals(draft).totalTtcCents,
      numero: null,
      sent_at: null,
      appointment_at: chauffeEau?.appointment?.starts_at ?? null,
      version: 1,
      updated_at: iso(now.getTime() - HOUR),
    },
    {
      quote_id: EXAMPLE_IDS.devisCuisine,
      chantier_id: EXAMPLE_IDS.chantierCuisine,
      status: "envoye",
      title: "Plomberie d'une cuisine",
      client_name: client(cuisine),
      line_count: 5,
      total_ttc_cents: sent.total_ttc_cents,
      numero: sent.numero,
      sent_at: sent.sent_at,
      appointment_at: cuisine?.appointment?.starts_at ?? null,
      version: 1,
      updated_at: sent.sent_at,
    },
    {
      quote_id: EXAMPLE_IDS.devisSalleDEau,
      chantier_id: EXAMPLE_IDS.chantierSalleDEau,
      status: "signe",
      title: "Création d'une salle d'eau",
      client_name: client(salleDEau),
      line_count: 9,
      total_ttc_cents: signed.total_ttc_cents,
      numero: signed.numero,
      sent_at: signed.sent_at,
      appointment_at: salleDEau?.appointment?.starts_at ?? null,
      version: 1,
      updated_at: signed.signed_at,
    },
  ];
}

/** Conversation de la liste des messages (forme de my_conversations). */
export type ExampleConversationRow = {
  chantier_id: string;
  closed: boolean;
  last_at: string;
  last_body: string;
  last_hidden: boolean;
  last_kind: "texte";
  last_mine: boolean;
  other_avatar_path: string;
  other_name: string;
  title: string;
  unread: number;
};

/** Message d'une conversation d'exemple (forme de chantier_messages). */
export type ExampleMessage = {
  id: string;
  mine: boolean;
  body: string;
  created_at: string;
  read: boolean;
};

/** Messages de chaque chantier d'exemple, du plus ancien au plus récent. */
export function exampleMessages(chantierId: string, now: Date = new Date()): ExampleMessage[] {
  const t = now.getTime();
  const at = (hoursAgo: number) => iso(t - hoursAgo * HOUR);
  const messages: Record<string, [mine: boolean, body: string, hoursAgo: number][]> = {
    [EXAMPLE_IDS.chantierSalleDEau]: [
      [false, "Bonjour, à quelle heure arrivez-vous pour le démarrage ?", 50],
      [true, "Bonjour Thomas, je serai là à 8 h avec le matériel.", 49],
      [true, "Les évacuations sont posées, je vous ai mis des photos dans le suivi.", 4],
      [false, "Parfait, merci pour les photos !", 3],
    ],
    [EXAMPLE_IDS.chantierCuisine]: [
      [true, "Bonjour Nathalie, je vous ai envoyé le devis suite à la visite.", 48],
      [false, "Merci, je le regarde ce week-end.", 24],
    ],
    [EXAMPLE_IDS.chantierChauffeEau]: [
      [true, "Bonjour Marc, c'est noté pour la visite, je mesurerai l'emplacement.", 22],
      [false, "Très bien, le portail sera ouvert.", 20],
    ],
  };
  return (messages[chantierId] ?? []).map(([mine, body, hoursAgo], i) => ({
    id: `${chantierId}-${i}`,
    mine,
    body,
    created_at: at(hoursAgo),
    // Le dernier message du client n'est pas encore lu sur le chantier en cours.
    read: mine || chantierId !== EXAMPLE_IDS.chantierSalleDEau || hoursAgo > 3,
  }));
}

/** Conversations : une par chantier, la plus récente en premier. */
export function exampleConversations(now: Date = new Date()): ExampleConversationRow[] {
  return exampleChantiers(now)
    .map((c) => {
      const messages = exampleMessages(c.chantier.id, now);
      const last = messages.at(-1);
      return {
        chantier_id: c.chantier.id,
        closed: false,
        last_at: last?.created_at ?? c.chantier.created_at,
        last_body: last?.body ?? "",
        last_hidden: false,
        last_kind: "texte" as const,
        last_mine: last?.mine ?? false,
        other_avatar_path: "",
        other_name: [c.client.first_name, c.client.last_name].filter(Boolean).join(" "),
        title: c.chantier.title,
        unread: messages.filter((m) => !m.mine && !m.read).length,
      };
    })
    .sort((a, b) => b.last_at.localeCompare(a.last_at));
}

/** Horaires de travail des exemples : du lundi au vendredi, 8 h – 12 h et 13 h 30 – 17 h 30. */
export const EXAMPLE_HOURS: readonly HoursRange[] = HOURS_PRESETS.semaine;

/**
 * Agenda entre deux instants : visites des trois chantiers (passées et à venir), démarrage du
 * chantier en cours, créneau bloqué.
 */
export function exampleAgendaItems(from: Date, to: Date, now: Date = new Date()): AgendaItem[] {
  const blockedDay = workday(now, 2);
  return agendaItemsFrom({
    chantiers: exampleChantiers(now).map((c) => ({
      chantierId: c.chantier.id,
      status: c.chantier.status,
      title: c.chantier.title,
      codePostal: c.code_postal,
      villeNom: c.ville_nom,
      appointmentAt: c.appointment?.starts_at ?? null,
      startAt: c.chantier.start_at,
    })),
    blocked: [
      {
        id: EXAMPLE_IDS.creneauFournisseur,
        startsAt: parisAt(now, blockedDay, "14:00"),
        endsAt: parisAt(now, blockedDay, "15:30"),
        label: "Retrait de matériel chez le fournisseur",
      },
    ],
    from,
    to,
  });
}

/** Facture d'acompte du chantier en cours (forme de la table invoices). */
export function exampleInvoices(now: Date = new Date()) {
  const followUp = exampleFollowUp(now);
  return followUp.invoices.map((invoice) => ({
    ...invoice,
    total_ttc_cents: followUp.payments[0]?.amount_cents ?? 0,
    document: {
      client: { first_name: CLIENTS.thomas.first_name, last_name: CLIENTS.thomas.last_name },
      chantier: { title: "Création d'une salle d'eau" },
    },
  }));
}

/**
 * Dépenses (F-62) : deux achats du chantier de la salle d'eau (un à payer, un payé comptant), une
 * location en retard et deux tickets à classer. Fournisseurs fictifs.
 */
export function exampleExpenses(now: Date = new Date()): ExpenseRow[] {
  const salleDEau = {
    chantier_id: EXAMPLE_IDS.chantierSalleDEau,
    chantier_title: "Création d'une salle d'eau",
  };
  const aClasser = { chantier_id: null, chantier_title: null };
  const expense = (
    id: string,
    title: string,
    supplier: string,
    reference: string | null,
    kind: ExpenseRow["kind"],
    category: ExpenseRow["category"],
    issuedDays: number,
    dueDays: number | null,
    paidDays: number | null,
    ht: number,
    tva: number,
    chantier: { chantier_id: string | null; chantier_title: string | null },
  ): ExpenseRow => ({
    id,
    title,
    supplier_name: supplier,
    reference,
    kind,
    category,
    issued_on: dateOnly(now, issuedDays),
    due_on: dueDays === null ? null : dateOnly(now, dueDays),
    paid_on: paidDays === null ? null : dateOnly(now, paidDays),
    total_ht_cents: ht,
    total_tva_cents: tva,
    total_ttc_cents: ht + tva,
    ...chantier,
    document_mime: null,
  });
  return [
    expense(
      EXAMPLE_IDS.depenseCarburant,
      "Carburant du véhicule",
      "Station Exemple",
      null,
      "ticket",
      "carburant",
      -2,
      null,
      -2,
      7_000,
      1_400,
      aClasser,
    ),
    expense(
      EXAMPLE_IDS.depenseCarrelage,
      "Carrelage et faïence de la salle d'eau",
      "Négoce Exemple",
      "FA-EX-0412",
      "facture",
      "materiaux",
      -6,
      24,
      null,
      112_800,
      22_560,
      salleDEau,
    ),
    expense(
      EXAMPLE_IDS.depenseSanitaire,
      "Receveur de douche et mitigeur thermostatique",
      "Sanitaire Exemple",
      "FA-EX-2981",
      "facture",
      "materiaux",
      -9,
      null,
      -9,
      48_650,
      9_730,
      salleDEau,
    ),
    expense(
      EXAMPLE_IDS.depenseOutillage,
      "Petit outillage",
      "Quincaillerie Exemple",
      null,
      "ticket",
      "outillage",
      -14,
      null,
      -14,
      3_990,
      798,
      aClasser,
    ),
    expense(
      EXAMPLE_IDS.depenseLocation,
      "Location d'une carotteuse",
      "Location Exemple",
      "LOC-EX-77",
      "facture",
      "location",
      -40,
      -10,
      null,
      14_500,
      2_900,
      aClasser,
    ),
  ];
}

/** Avis reçus (forme de la table reviews) : un sans réponse, deux avec réponse. */
export function exampleReviews(now: Date = new Date()) {
  const t = now.getTime();
  const review = (
    n: number,
    author: string,
    notes: [quality: number, delays: number, communication: number, cleanliness: number],
    valueForMoney: ValueForMoney,
    comment: string,
    daysAgo: number,
    reply: string | null,
  ) => {
    const [quality, delays, communication, cleanliness] = notes;
    return {
      id: `${PREFIX}7${String(n).padStart(2, "0")}`,
      chantier_id: `${PREFIX}2${String(10 + n)}`,
      author_name: author,
      score: Math.round((quality + delays + communication + cleanliness) / 4),
      quality,
      delays,
      communication,
      cleanliness,
      value_for_money: valueForMoney,
      comment,
      experience_on: dateOnly(now, -daysAgo - 2),
      status: "publie" as const,
      moderation_reason: null,
      reply,
      created_at: iso(t - daysAgo * DAY),
    };
  };
  return [
    review(
      1,
      "Claire B.",
      [98, 95, 96, 95],
      "excellent",
      "Intervention rapide et soignée pour le remplacement de notre mitigeur. Artisan ponctuel, de bon conseil, et chantier laissé propre.",
      6,
      null,
    ),
    review(
      2,
      "Paul R.",
      [95, 90, 96, 92],
      "excellent",
      "Très bon travail sur la rénovation de notre salle d'eau, délais respectés et explications claires à chaque étape. Je recommande.",
      40,
      "Merci beaucoup Paul, ce fut un plaisir de travailler avec vous !",
    ),
    review(
      3,
      "Sandrine L.",
      [94, 95, 93, 90],
      "convenable",
      "Recherche de fuite efficace : le problème a été trouvé et réparé dans la journée, au prix annoncé sur le devis.",
      75,
      "Merci Sandrine pour votre confiance.",
    ),
  ];
}

/** Score MENAO des avis d'exemple (forme de la table artisan_scores). */
export function exampleScore() {
  return {
    review_count: 3,
    quality: 96,
    delays: 93,
    communication: 95,
    value_for_money: 92,
    global_score: 94,
  };
}

type GradeLike = {
  xp: number;
  level: number;
  levels: readonly { level: number; xp_min: number }[];
  objectives: readonly { target: number; progress: number; achieved_at: string | null }[];
  badges: readonly {
    target: number;
    progress: number;
    unlocked_at: string | null;
    seen: boolean;
  }[];
  claims: readonly unknown[];
};

/**
 * Grade d'exemple : le vrai barème (niveaux, objectifs, badges de la base) avec une progression
 * fictive de niveau 2 (trois objectifs atteints, deux badges débloqués, déjà vus).
 */
export function exampleGrade<G extends GradeLike>(grade: G, now: Date = new Date()): G {
  const xp = (grade.levels.find((l) => l.level === 2)?.xp_min ?? 0) + 50;
  const level = grade.levels.reduce((best, l) => (l.xp_min <= xp ? l.level : best), 1);
  const ago = (days: number) => iso(now.getTime() - days * DAY);
  return {
    ...grade,
    xp,
    level,
    objectives: grade.objectives.map((o, i) =>
      i < 3
        ? { ...o, progress: o.target, achieved_at: ago(30 - i * 7) }
        : { ...o, progress: Math.min(o.target - 1, Math.ceil(o.target / 2)), achieved_at: null },
    ),
    badges: grade.badges.map((b, i) =>
      i < 2
        ? { ...b, progress: b.target, unlocked_at: ago(20 - i * 6), seen: true }
        : {
            ...b,
            progress: Math.min(b.target - 1, Math.floor(b.target / 3)),
            unlocked_at: null,
            seen: true,
          },
    ),
    claims: [],
  };
}

/**
 * Fiche publique d'exemple, au nom de l'artisan : présentation, métiers, photos, assurances
 * vérifiées et score des avis d'exemple (forme de my_public_profile).
 */
export function exampleProfile(name: string | null, now: Date = new Date()) {
  const score = exampleScore();
  return {
    id: EXAMPLE_IDS.ficheArtisan,
    display_name: name ?? "Votre nom",
    company_name: "Votre entreprise",
    avatar_path: null,
    experience_years: 12,
    presentation:
      "Plombier chauffagiste depuis 12 ans à Nice et alentours : dépannage, remplacement de chauffe-eau, création et rénovation de salles de bains. Je me déplace pour une visite avant chaque devis, je vous explique les solutions possibles et je m'engage sur les délais annoncés. Chantier protégé et laissé propre, garantie décennale.",
    paused: false,
    available_from: null,
    response_minutes: 38,
    zone: { mode: "rayon" as const, radius_km: 20, city: "Nice", communes: [] },
    trades: [{ code: "plombier", label: "Plombier" }],
    work_types: [
      { code: "chauffe-eau", label: "Chauffe-eau", trade: "plombier" },
      { code: "salle-de-bains", label: "Salle de bains", trade: "plombier" },
      { code: "recherche-de-fuite", label: "Recherche de fuite", trade: "plombier" },
    ],
    verified: true,
    decennale_exempt: false,
    decennale: { valid_until: dateOnly(now, 200), insurer: "Assureur de l'exemple" },
    rc_pro: { valid_until: dateOnly(now, 200), insurer: "Assureur de l'exemple" },
    certifications: [],
    rge: [],
    photos: [
      `${EXAMPLE_PHOTO_PREFIX}plomberie`,
      `${EXAMPLE_PHOTO_PREFIX}carrelage`,
      `${EXAMPLE_PHOTO_PREFIX}chauffage`,
    ],
    menao_score: null,
    diplome: null,
    google: null,
    partners: [],
    recommended_by: null,
    score: {
      review_count: score.review_count,
      quality: score.quality,
      delays: score.delays,
      communication: score.communication,
      value_for_money: score.value_for_money,
      global: score.global_score,
    },
  };
}

/** Dossier complet et vérifié (« Mon profil » d'exemple). */
export function exampleHubFacts(now: Date = new Date()): ProfileHubFacts {
  const today = parisToday(now);
  const documents = Object.fromEntries(
    REQUIRED_DOCUMENT_TYPES.map((type) => [
      type,
      { status: "valide", dateEmission: dateOnly(now, -20), dateFin: dateOnly(now, 200) },
    ]),
  );
  const snapshot: ArtisanOnboardingSnapshot = {
    siretVerified: true,
    sireneActive: true,
    raisonSociale: "Votre entreprise",
    assujettiTva: true,
    tradeCount: 1,
    zoneMode: "rayon",
    radiusKm: 20,
    hasBaseLocation: true,
    communeCount: 0,
    documents,
    presentationLength: exampleProfile(null, now).presentation.length,
    hasAvatar: true,
    subscriptionActive: true,
    connectChargesEnabled: true,
    charterAccepted: true,
    decennaleExempt: false,
  };
  return {
    snapshot,
    validated: true,
    documents: REQUIRED_DOCUMENT_TYPES.map((type) => ({
      type,
      status: "valide",
      date_fin: dateOnly(now, 200),
    })),
    photoCount: 3,
    reviewsToAnswer: 1,
    reviewCount: 3,
    level: 2,
    hasRge: false,
    paused: false,
    availableFrom: null,
    today,
  };
}

/**
 * Activité d'exemple du tableau de bord : les chantiers d'exemple, un historique fictif de neuf
 * chantiers terminés (un par mois, acompte puis solde), un chantier réceptionné dont le solde
 * reste à recevoir et deux devis refusés (taux de signature).
 */
export function exampleActivityInput(now: Date = new Date()): {
  payments: ActivityPayment[];
  quotes: ActivityQuote[];
  chantiers: ActivityChantier[];
} {
  const [y, m] = parisToday(now).split("-").map(Number) as [number, number];
  const day = (monthsAgo: number, d: number) => iso(Date.UTC(y, m - 1 - monthsAgo, d, 9));
  const history: [monthsAgo: number, totalCents: number, title: string, client: string][] = [
    [9, 320_000, "Rénovation de salle de bains", "Hélène Vidal"],
    [8, 185_000, "Remplacement d'un ballon d'eau chaude", "Louis Perrin"],
    [7, 640_000, "Plomberie d'une maison neuve", "Inès Garnier"],
    [6, 245_000, "Douche à l'italienne", "Marc Lemoine"],
    [5, 410_000, "Rénovation de cuisine", "Julie Fontaine"],
    [4, 158_000, "Réparation d'une fuite encastrée", "Hugo Bernard"],
    [3, 520_000, "Salle d'eau dans les combles", "Chloé Mercier"],
    [2, 290_000, "Remplacement des colonnes d'eau", "Antoine Robin"],
    [1, 365_000, "Rénovation d'un WC et d'un lave-mains", "Emma Faure"],
  ];
  const id = (n: number) => `${PREFIX}8${String(n).padStart(2, "0")}`;
  const past = history.map(([monthsAgo, total, title, client], i) => {
    const deposit = Math.round(total * 0.3);
    return {
      chantier: {
        chantierId: id(i),
        status: "cloture" as const,
        title,
        clientName: client,
        startAt: null,
      },
      quote: {
        quoteId: id(i + 20),
        chantierId: id(i),
        status: "signe",
        totalTtcCents: total,
        sentAt: day(monthsAgo, 1),
        title,
        clientName: client,
      },
      payments: [
        {
          chantierId: id(i),
          quoteId: id(i + 20),
          kind: "acompte" as const,
          status: "paye",
          amountCents: deposit,
          paidAt: day(monthsAgo, 5),
        },
        {
          chantierId: id(i),
          quoteId: id(i + 20),
          kind: "solde" as const,
          status: "paye",
          amountCents: total - deposit,
          paidAt: day(monthsAgo, 22),
        },
      ],
    };
  });
  // Chantier réceptionné : acompte payé, solde à recevoir.
  const received = {
    chantierId: id(40),
    quoteId: id(41),
    title: "Remplacement d'un mitigeur et des joints",
    client: "Claire Besson",
    total: 84_000,
  };
  const followUp = exampleFollowUp(now);
  const refused = (n: number, daysAgo: number, total: number): ActivityQuote => ({
    quoteId: id(50 + n),
    chantierId: id(60 + n),
    status: "refuse",
    totalTtcCents: total,
    sentAt: iso(now.getTime() - daysAgo * DAY),
    title: "Devis refusé",
    clientName: null,
  });
  const name = (c: ExampleChantierRow) =>
    [c.client_first_name, c.client_last_name].filter(Boolean).join(" ") || null;
  return {
    payments: [
      ...past.flatMap((p) => p.payments),
      {
        chantierId: received.chantierId,
        quoteId: received.quoteId,
        kind: "acompte",
        status: "paye",
        amountCents: Math.round(received.total * 0.3),
        paidAt: iso(now.getTime() - 12 * DAY),
      },
      ...followUp.payments.map((p) => ({
        chantierId: EXAMPLE_IDS.chantierSalleDEau,
        quoteId: p.quote_id,
        kind: p.kind,
        status: p.status,
        amountCents: p.amount_cents,
        paidAt: p.paid_at,
      })),
    ],
    quotes: [
      ...past.map((p) => p.quote),
      {
        quoteId: received.quoteId,
        chantierId: received.chantierId,
        status: "signe",
        totalTtcCents: received.total,
        sentAt: iso(now.getTime() - 20 * DAY),
        title: received.title,
        clientName: received.client,
      },
      ...exampleQuoteRows(now).map((q) => ({
        quoteId: q.quote_id,
        chantierId: q.chantier_id,
        status: q.status,
        totalTtcCents: q.total_ttc_cents,
        sentAt: q.sent_at,
        title: q.title,
        clientName: q.client_name,
      })),
      refused(1, 40, 210_000),
      refused(2, 95, 130_000),
    ],
    chantiers: [
      ...past.map((p) => p.chantier),
      {
        chantierId: received.chantierId,
        status: "receptionne",
        title: received.title,
        clientName: received.client,
        startAt: null,
      },
      ...exampleChantierRows(now).map((c) => ({
        chantierId: c.chantier_id,
        status: c.status,
        title: c.title,
        clientName: name(c),
        startAt: c.start_at,
      })),
    ],
  };
}
