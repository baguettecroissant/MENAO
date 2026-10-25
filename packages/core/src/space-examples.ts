/**
 * Exemples de l'espace artisan (ADR 0184) : demandes et chantiers fictifs pour découvrir son
 * espace pendant la vérification du dossier, puis tant qu'aucune vraie demande n'est arrivée.
 * Rien n'est enregistré : les écrans affichent ces données en lecture seule, actions désactivées.
 * Mêmes formes que les fonctions de la base (artisan_inbox, artisan_chantiers,
 * artisan_request_detail, artisan_chantier_detail), dates relatives à `now`. Personnes, adresses
 * et numéros fictifs.
 */

import { parisToday } from "./project";

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
  factureAcompte: `${PREFIX}401`,
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
export type ExamplePhoto = "carrelage" | "plomberie";
export const EXAMPLE_PHOTO_PREFIX = "exemple/";

export function examplePhotoKey(path: string): ExamplePhoto | null {
  if (!path.startsWith(EXAMPLE_PHOTO_PREFIX)) return null;
  const key = path.slice(EXAMPLE_PHOTO_PREFIX.length);
  return key === "carrelage" || key === "plomberie" ? key : null;
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
        starts_at: parisAt(now, 1, "10:00"),
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
      appointment: { starts_at: parisAt(now, -5, "14:00"), status: "planifie", notes: null },
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
        start_at: parisAt(now, -1, "08:00"),
        cancelled_at: null,
      },
      appointment: { starts_at: parisAt(now, -8, "09:30"), status: "planifie", notes: null },
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
      start_date: dateOnly(now, -1),
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
