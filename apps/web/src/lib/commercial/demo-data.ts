import "server-only";
import { parisLocalToDate, parisToday } from "@menao/core";
import type { Database } from "@menao/db";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Données fictives de la démo de l'espace commercial (F-65, lot 57, ADR 0344) : une conseillère,
 * Sarah K., ses prospects du 06, sa journée, ses résultats et ses primes, datés d'après le jour
 * d'ouverture. Rien n'est lu ni écrit en base. Numéros de téléphone pris dans les plages réservées
 * par l'Arcep à la fiction ; SIRET et adresses inventés.
 */
type Fn = Database["public"]["Functions"];
type ProspectRow = Fn["commercial_prospects"]["Returns"][number];
type ProspectDetail = Fn["commercial_prospect"]["Returns"][number];
type ProspectStatus = Database["public"]["Enums"]["prospect_status"];

const id = (n: number) => `d0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** Prospect suivi par Sarah dont la fiche du copilote est montrée depuis l'accueil (Thermo Azur). */
export const DEMO_COPILOT_PROSPECT = id(100);

/** Jour de Paris décalé de `days` jours (AAAA-MM-JJ). */
function day(days: number): string {
  const [y, m, d] = parisToday().split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
const at = (days: number, time: string) => parisLocalToDate(day(days), time).toISOString();

const PLACES = [
  ["Nice", "06000", 43.7031, 7.2661],
  ["Nice", "06100", 43.723, 7.261],
  ["Nice", "06200", 43.689, 7.234],
  ["Nice", "06300", 43.702, 7.285],
  ["Antibes", "06600", 43.5808, 7.1239],
  ["Cannes", "06400", 43.5528, 7.0174],
  ["Cagnes-sur-Mer", "06800", 43.6638, 7.1488],
  ["Grasse", "06130", 43.6589, 6.9223],
  ["Menton", "06500", 43.7747, 7.4975],
  ["Saint-Laurent-du-Var", "06700", 43.673, 7.19],
  ["Vence", "06140", 43.7225, 7.1119],
  ["Le Cannet", "06110", 43.5769, 7.0191],
] as const;

type Seed = {
  nom: string;
  ape: string;
  place: number;
  rge?: boolean;
  /** Suivi par Sarah : statut et prochaine action (jours, heure). */
  mine?: { status: ProspectStatus; next?: [number, string] };
  other?: boolean;
  stage?: "inscrit" | "valide" | "abonne";
  created: string;
  staff?: string;
};

// Codes APE : 43.22A plomberie, 43.21A électricité, 43.34Z peinture, 43.99C maçonnerie,
// 43.33Z carrelage, 43.91B couverture, 43.32A menuiserie, 43.29A isolation.
const SEEDS: Seed[] = [
  {
    nom: "Thermo Azur",
    ape: "4322A",
    place: 0,
    rge: true,
    mine: { status: "rdv_pris", next: [0, "09:30"] },
    created: "2009-03-12",
    staff: "03",
  },
  {
    nom: "Électricité Riviera",
    ape: "4321A",
    place: 6,
    mine: { status: "rdv_pris", next: [0, "15:00"] },
    created: "2015-06-01",
    staff: "02",
  },
  {
    nom: "Peinture du Sud",
    ape: "4334Z",
    place: 4,
    mine: { status: "a_contacter", next: [0, "11:00"] },
    created: "2018-09-20",
    staff: "01",
  },
  {
    nom: "Maçonnerie Bellet",
    ape: "4399C",
    place: 2,
    mine: { status: "a_contacter", next: [-2, "10:00"] },
    created: "2004-01-15",
    staff: "11",
  },
  {
    nom: "Couverture Niçoise",
    ape: "4391B",
    place: 3,
    rge: true,
    mine: { status: "a_contacter", next: [0, "17:30"] },
    created: "2011-11-03",
    staff: "02",
  },
  {
    nom: "Carrelages de la Baie",
    ape: "4333Z",
    place: 5,
    mine: { status: "demo_faite", next: [3, "10:00"] },
    stage: "inscrit",
    created: "2016-02-08",
    staff: "01",
  },
  {
    nom: "Plomberie des Oliviers",
    ape: "4322A",
    place: 7,
    rge: true,
    mine: { status: "demo_faite" },
    stage: "abonne",
    created: "2012-05-22",
    staff: "03",
  },
  {
    nom: "Menuiserie Vençoise",
    ape: "4332A",
    place: 10,
    mine: { status: "pas_interesse" },
    created: "1998-10-10",
    staff: "02",
  },
  { nom: "Clim Confort", ape: "4322B", place: 9, other: true, created: "2019-04-01", staff: "01" },
  {
    nom: "Isolation Côte d'Azur",
    ape: "4329A",
    place: 11,
    rge: true,
    other: true,
    created: "2014-07-14",
    staff: "12",
  },
  { nom: "Bâti Menton", ape: "4399C", place: 8, other: true, created: "2007-03-30", staff: "03" },
  {
    nom: "Aqua Levant",
    ape: "4322A",
    place: 1,
    stage: "inscrit",
    created: "2020-01-06",
    staff: "00",
  },
  {
    nom: "Riviera Bains",
    ape: "4322A",
    place: 5,
    stage: "valide",
    created: "2013-09-17",
    staff: "01",
  },
  { nom: "Peintures Cagnoises", ape: "4334Z", place: 6, created: "2017-05-02", staff: "00" },
  { nom: "Électro Grasse", ape: "4321A", place: 7, rge: true, created: "2010-12-01", staff: "02" },
  { nom: "Toitures du Var", ape: "4391B", place: 9, created: "2006-08-19", staff: "03" },
  { nom: "Sols et Murs d'Antibes", ape: "4333Z", place: 4, created: "2021-03-15", staff: "00" },
  { nom: "Menuiseries Cannoises", ape: "4332A", place: 5, created: "2003-06-25", staff: "11" },
  {
    nom: "Chauffage Mentonnais",
    ape: "4322B",
    place: 8,
    rge: true,
    created: "2008-02-11",
    staff: "02",
  },
  { nom: "Rénov' Nice Nord", ape: "4399C", place: 1, created: "2019-10-07", staff: "01" },
  { nom: "Peinture Vence Déco", ape: "4334Z", place: 10, created: "2022-04-04", staff: "00" },
  { nom: "Élec Saint-Laurent", ape: "4321A", place: 9, created: "2016-11-21", staff: "01" },
  { nom: "Carrelage Le Cannet", ape: "4333Z", place: 11, created: "2012-01-30", staff: "02" },
  { nom: "Maçons du Port", ape: "4399C", place: 3, rge: true, created: "2001-09-09", staff: "12" },
];

const PROSPECTS = SEEDS.map((s, i) => {
  const [commune, codePostal, lat, lon] = PLACES[s.place] ?? PLACES[0];
  return {
    seed: s,
    row: {
      id: id(100 + i),
      nom: s.nom,
      ape_code: s.ape,
      code_postal: codePostal,
      commune,
      // Écarts réguliers : les entreprises d'une même commune ne se superposent pas sur la carte.
      lat: lat + ((i % 5) - 2) * 0.004,
      lon: lon + ((i % 3) - 1) * 0.005,
      rge: !!s.rge,
      mine: !!s.mine,
      followed_by_other: !!s.other,
      status: (s.mine?.status ?? null) as ProspectStatus,
      next_action_at: (s.mine?.next ? at(s.mine.next[0], s.mine.next[1]) : null) as string,
      stage: (s.stage ?? null) as string,
      total: 0,
    } satisfies ProspectRow,
  };
});

function prospects(args: Record<string, unknown> = {}): ProspectRow[] {
  const search = typeof args.p_search === "string" ? args.p_search.toLowerCase() : "";
  const filter = typeof args.p_filter === "string" ? args.p_filter : "zone";
  const limit = typeof args.p_limit === "number" ? args.p_limit : 25;
  const offset = typeof args.p_offset === "number" ? args.p_offset : 0;
  const today = day(0);
  const rows = PROSPECTS.map((p) => p.row).filter((r) => {
    if (search && !`${r.nom} ${r.commune} ${r.code_postal}`.toLowerCase().includes(search)) {
      return false;
    }
    if (filter === "miens") return r.mine;
    if (filter === "relances")
      return r.mine && !!r.next_action_at && r.next_action_at.slice(0, 10) <= today;
    if (filter === "libres") return !r.mine && !r.followed_by_other;
    return true;
  });
  return rows.slice(offset, offset + limit).map((r) => ({ ...r, total: rows.length }));
}

function prospect(args: Record<string, unknown> = {}): ProspectDetail[] {
  const found = PROSPECTS.findIndex((p) => p.row.id === args.p_id);
  const p = PROSPECTS[found];
  if (!p) return [];
  return [
    {
      ...p.row,
      denomination: p.row.nom.toUpperCase(),
      enseigne: p.row.nom,
      adresse: `${12 + found * 3} avenue des Fleurs, ${p.row.code_postal} ${p.row.commune}`,
      siret: `99900${String(100 + found).padStart(4, "0")}00012`,
      est_siege: true,
      nature_juridique: found % 3 === 0 ? "5499" : found % 3 === 1 ? "5710" : "1000",
      date_creation: p.seed.created,
      tranche_effectif: (p.seed.staff ?? null) as string,
      phone: `04657100${String(10 + found).padStart(2, "0")}`,
      notes: (p.row.mine
        ? "Préfère être appelé tôt le matin, avant ses chantiers."
        : null) as string,
    },
  ];
}

const DAY_ITEMS = () =>
  PROSPECTS.filter(
    (p) => p.row.mine && p.row.next_action_at && p.row.next_action_at.slice(0, 10) <= day(0),
  )
    .sort((a, b) => a.row.next_action_at.localeCompare(b.row.next_action_at))
    .map((p, i) => ({
      id: p.row.id,
      nom: p.row.nom,
      commune: p.row.commune,
      phone: `04657100${String(30 + i).padStart(2, "0")}`,
      status: p.row.status,
      next_action_at: p.row.next_action_at,
      kind:
        p.row.status === "rdv_pris" && p.row.next_action_at.slice(0, 10) === day(0)
          ? "rdv"
          : "relance",
    })) satisfies Fn["commercial_day"]["Returns"];

const SIGNUPS = (): Fn["my_commercial_signups"]["Returns"] =>
  (
    [
      ["Plomberie des Oliviers", -40, "valide", []],
      ["Riviera Bains", -33, "valide", []],
      ["Électricité Mougins", -29, "valide", []],
      ["Façades Grassoises", -21, "valide", []],
      ["Clim Antibes", -12, "valide", []],
      ["Carrelages de la Baie", -6, "valide", []],
      ["Aqua Levant", -5, "en_verification", []],
      ["Sols d'Azur", -4, "en_verification", []],
      ["Couvreurs de Cimiez", -3, "en_verification", []],
      ["Peinture Riquier", -3, "brouillon", ["documents", "charte"]],
      ["Menuiserie du Paillon", -2, "brouillon", ["documents"]],
      ["Bâtiment Saint-Roch", -2, "brouillon", ["entreprise", "metiers", "zone"]],
      ["Électricité Magnan", -1, "brouillon", ["paiements"]],
      ["", 0, "brouillon", ["entreprise", "charte"]],
    ] as const
  ).map(([raison, d, status, manque]) => ({
    raison_sociale: raison as string,
    signed_up_at: at(d, "10:00"),
    status,
    manque: [...manque],
  }));

const month = (offset: number) =>
  day(0)
    .slice(0, 7)
    .replace(/^(\d+)-(\d+)$/, (_, y, m) => {
      const date = new Date(Date.UTC(Number(y), Number(m) - 1 + offset, 15));
      return date.toISOString().slice(0, 7);
    });

const RESULTS = () => ({
  signups: 14,
  validated: 6,
  subscribed: 2,
  signups_month: 3,
  validated_month: 2,
  subscribed_month: 1,
  by_month: [
    { month: month(0), signups: 3, validated: 2, subscribed: 1 },
    { month: month(-1), signups: 6, validated: 3, subscribed: 1 },
    { month: month(-2), signups: 5, validated: 1, subscribed: 0 },
  ],
  pipeline: { followed: 8, a_contacter: 3, rdv_pris: 2, demo_faite: 2, pas_interesse: 1 },
  bonuses: { pending: 2, validated_cents: 25_000, paid_cents: 44_000 },
  prime_validation_centimes: 11_000,
  prime_abonnement_centimes: 3_000,
  prime_abonnement_premium_centimes: 10_000,
  prime_abonnement_entreprise_centimes: 20_000,
  // Indépendants : pas d'objectif imposé dans la démo.
  objectif_valides_mois: null,
});

const BONUSES = (): Fn["commercial_bonuses_list"]["Returns"] =>
  (
    [
      ["Aqua Levant", "validation", "en_attente", 11_000, -5],
      ["Sols d'Azur", "validation", "en_attente", 11_000, -4],
      ["Carrelages de la Baie", "validation", "validee", 11_000, -6],
      ["Clim Antibes", "validation", "validee", 11_000, -12],
      ["Plomberie des Oliviers", "abonnement", "validee", 3_000, -8],
      ["Façades Grassoises", "validation", "payee", 11_000, -21],
      ["Électricité Mougins", "validation", "payee", 11_000, -29],
      ["Riviera Bains", "validation", "payee", 11_000, -33],
      ["Plomberie des Oliviers", "validation", "payee", 11_000, -40],
    ] as const
  ).map(([artisan, kind, status, cents, d], i) => ({
    id: id(300 + i),
    artisan,
    kind,
    status,
    amount_cents: cents,
    created_at: at(d, "12:00"),
    validate_after: at(d + 30, "04:15"),
    validated_at: (status === "en_attente" ? null : at(d + 30, "04:15")) as string,
    paid_at: (status === "payee" ? at(d + 35, "09:00") : null) as string,
  }));

const LAUNCH_PLAN = () => ({
  member: { id: id(400), nom: "Sarah K.", mission: null, kind: "commercial" },
  tasks: [
    ["Préparer ma liste de plombiers de Nice ouest", 0, "en_cours", true, false],
    ["Déposer des cartes chez les grossistes de Saint-Laurent", 2, "a_faire", true, false],
    ["Relancer les dossiers à compléter", 1, "a_faire", true, false],
    ["Salon de l'habitat de Nice", 6, "a_faire", false, true],
  ].map(([titre, d, statut, own, jalon], i) => ({
    id: id(410 + i),
    titre,
    detail: null,
    phase: "pre_ouverture",
    categorie: "terrain",
    debut: null,
    echeance: day(d as number),
    recurrence: null,
    jalon,
    partage: !own,
    statut,
    fait_le: null,
    own,
  })),
});

/** Fiche du copilote déjà préparée, pour les prospects suivis par Sarah. */
function brief(prospectId: unknown) {
  const p = PROSPECTS.find((x) => x.row.id === prospectId);
  if (!p) return null;
  const metier = p.row.ape_code.startsWith("4321")
    ? "electricien"
    : p.row.ape_code.startsWith("4322")
      ? "plombier"
      : p.row.ape_code.startsWith("4334")
        ? "peintre"
        : p.row.ape_code.startsWith("4333")
          ? "carreleur"
          : p.row.ape_code.startsWith("4391")
            ? "couvreur"
            : p.row.ape_code.startsWith("4332")
              ? "menuisier"
              : "macon";
  return {
    content: {
      v: 1,
      portrait: `${p.row.nom} est installée à ${p.row.commune} depuis ${p.seed.created.slice(0, 4)}${p.row.rge ? ", avec la mention RGE" : ""}. Une petite équipe qui travaille surtout pour des particuliers du secteur.`,
      arguments: [
        {
          title: "Des demandes près de chez lui",
          detail: "Des particuliers de son secteur, 3 artisans au plus par demande.",
        },
        {
          title: "Un abonnement fixe",
          detail: "Aucune commission sur ses chantiers : ses clients le paient directement.",
        },
        {
          title: "Le devis à la voix",
          detail: "Devis, signature et acompte depuis son téléphone, entre deux chantiers.",
        },
      ],
      objections: [
        {
          objection: "Encore une plateforme…",
          answer: "Ici, rien n'est revendu : abonnement fixe, 3 artisans au plus par demande.",
        },
        {
          objection: "Je n'ai pas le temps",
          answer: "Dix minutes suffisent pour voir l'espace ; les 2 premiers mois sont gratuits.",
        },
      ],
      openingQuestion: "Aujourd'hui, comment vous arrivent vos nouveaux clients ?",
      demand: {
        recherches: 18 + (p.row.lat > 43.65 ? 28 : 9),
        jours: 30,
        rayonKm: 10,
        metiers: [metier],
      },
    },
    created_at: at(0, "08:12"),
  };
}

function reports(prospectId: unknown) {
  const p = PROSPECTS.find((x) => x.row.id === prospectId);
  if (!p?.row.mine) return [];
  return [
    {
      id: id(500),
      summary:
        "Appel : intéressé par les demandes près de chez lui, rendez-vous fixé pour une démo.",
      interest: "chaud",
      objections: ["Déjà déçu par une plateforme"],
      next_action_label: "Visite et démo",
      created_at: at(-3, "18:05"),
    },
  ];
}

const TRADES: Record<string, string> = {
  plombier: "Plombier",
  electricien: "Électricien",
  peintre: "Peintre",
  carreleur: "Carreleur",
  couvreur: "Couvreur",
  menuisier: "Menuisier",
  macon: "Maçon",
};

/** Lignes d'une table lue par les écrans (filtres `eq` et `in` appliqués). */
function table(name: string, eq: Record<string, unknown>, inList: Record<string, unknown[]>) {
  switch (name) {
    case "commercial_appointments":
      return [
        {
          id: id(600),
          starts_at: at(1, "10:00"),
          kind: "visite",
          first_name: "Julien",
          phone: "0639980012",
          email: "julien.renov@example.com",
          address: "8 rue des Mimosas",
          city: "Nice",
          trade: "plombier",
          reason: "Veut voir comment recevoir des demandes de salle de bains.",
        },
        {
          id: id(601),
          starts_at: at(2, "18:30"),
          kind: "appel",
          first_name: "Nadia",
          phone: "0639980013",
          email: "nadia.peinture@example.com",
          address: null,
          city: "Antibes",
          trade: "peintre",
          reason: "Rappel après sa journée : questions sur l'abonnement.",
        },
      ];
    case "commercial_trainings":
      return [
        { id: id(700), persona: "mefiant", score: 16, created_at: at(-1, "19:10") },
        { id: id(701), persona: "presse", score: 14, created_at: at(-4, "12:20") },
        { id: id(702), persona: "patron", score: 12, created_at: at(-9, "18:00") },
      ];
    case "prospect_briefs":
      return brief(eq.prospect_id);
    case "prospect_reports":
      return reports(eq.prospect_id);
    case "trades":
      return (inList.code ?? Object.keys(TRADES)).map((code) => ({
        code,
        label: TRADES[String(code)] ?? String(code),
      }));
    default:
      return [];
  }
}

/** Communes de départ d'une tournée d'exemple (F-194, ADR 0394). */
const TOUR_STARTS = [
  { commune: "NICE", code_postal: "06300", lat: 43.7009, lng: 7.2797, prospects: 1240 },
  { commune: "ANTIBES", code_postal: "06600", lat: 43.5808, lng: 7.1251, prospects: 410 },
  { commune: "CANNES", code_postal: "06400", lat: 43.5528, lng: 7.0174, prospects: 520 },
  { commune: "GRASSE", code_postal: "06130", lat: 43.6588, lng: 6.9237, prospects: 330 },
];
const TOUR_NAMES = [
  ["Thermo Azur", "43.22B"],
  ["Plomberie du Port", "43.22A"],
  ["Riquier Électricité", "43.21A"],
  ["Bains & Co", "43.22A"],
  ["Carrelages du Paillon", "43.33Z"],
  ["Élec Garibaldi", "43.21A"],
  ["Chauffage des Collines", "43.22B"],
  ["Sanitaires Bonaparte", "43.22A"],
  ["Lumière & Réseaux", "43.21A"],
  ["Plomberie Ségurane", "43.22A"],
  ["Clim Riviera", "43.22B"],
  ["Électricité du Château", "43.21A"],
  ["Dépannage Saint-Roch", "43.22A"],
  ["Énergies Pasteur", "43.22B"],
  ["Câblage Cimiez", "43.21A"],
  ["Eau Chaude Riquier", "43.22A"],
  ["Thermique Arson", "43.22B"],
  ["Volts du Port", "43.21A"],
] as const;

/** Prospects fictifs autour du point choisi, pour essayer la préparation d'une tournée. */
function tourCandidates(args: Record<string, unknown> = {}) {
  const lat = Number(args.p_lat) || 43.7;
  const lng = Number(args.p_lng) || 7.28;
  const ape = Array.isArray(args.p_ape) ? (args.p_ape as string[]) : [];
  return TOUR_NAMES.map(([nom, code], i) => {
    const angle = i * 2.4;
    const r = 0.0012 + i * 0.00045;
    return {
      id: id(900 + i),
      nom,
      ape_code: code,
      adresse: `${i + 2} rue de l'Exemple`,
      commune: "NICE",
      lat: lat + Math.sin(angle) * r,
      lng: lng + Math.cos(angle) * r * 1.4,
      rge: i % 4 === 0,
      tranche_effectif: i % 3 === 0 ? "02" : "NN",
      date_creation: `${2008 + (i % 14)}-03-01`,
      mine: i === 3,
      distance_m: Math.round(r * 111_000),
    };
  }).filter((c) => ape.length === 0 || ape.includes(c.ape_code));
}

function rpc(name: string, args?: Record<string, unknown>): unknown {
  switch (name) {
    case "commercial_tour_starts":
      return TOUR_STARTS;
    case "commercial_artisan_alerts":
      return [
        {
          kind: "fin_essai",
          subject: `fin_essai:${id(960)}`,
          artisan_id: id(960),
          prepared_id: null,
          entreprise: "Plomberie des Oliviers",
          first_name: "Marc",
          phone: "+33639980030",
          at: at(7, "10:00"),
          steps: [],
        },
        {
          kind: "bloque",
          subject: `bloque:${id(961)}`,
          artisan_id: id(961),
          prepared_id: null,
          entreprise: "Thermo Azur",
          first_name: "Paul",
          phone: "+33639980031",
          at: at(-3, "09:00"),
          steps: ["decennale"],
        },
      ];
    case "commercial_next_celebration":
      return null;
    case "commercial_prepared_signups":
      return [
        {
          id: id(950),
          key: "d".repeat(32),
          siret: "00000183500012",
          company_name: "Bains & Co",
          first_name: "Karim",
          phone: "+33639980020",
          created_at: at(0, "10:52"),
          expires_at: at(7, "10:52"),
          opened_at: at(0, "10:54"),
          converted_at: at(0, "10:56"),
          artisan_status: "brouillon",
          manque: ["documents", "paiements"],
        },
        {
          id: id(951),
          key: "e".repeat(32),
          siret: "00000183600010",
          company_name: "Carrelages du Paillon",
          first_name: "Nadia",
          phone: "+33639980021",
          created_at: at(-3, "16:10"),
          expires_at: at(4, "16:10"),
          opened_at: null,
          converted_at: null,
          artisan_status: null,
          manque: [],
        },
      ];
    case "commercial_tour_candidates":
      return tourCandidates(args);
    case "my_commercial_signups":
      return SIGNUPS();
    case "commercial_day":
      return DAY_ITEMS();
    case "commercial_prospects":
      return prospects(args);
    case "commercial_prospect":
      return prospect(args);
    case "commercial_results":
      return RESULTS();
    case "commercial_bonuses_list":
      return BONUSES();
    case "my_launch_plan":
      return LAUNCH_PLAN();
    default:
      return null;
  }
}

/**
 * Faux client de base pour la démo : `rpc` et `from(...)…` renvoient les données fictives, comme
 * le vrai client (objet `{ data, error }`), sans réseau. Toute écriture renvoie une erreur.
 */
export function demoClient(): SupabaseClient<Database> {
  const query = (name: string) => {
    const eq: Record<string, unknown> = {};
    const inList: Record<string, unknown[]> = {};
    let single = false;
    let write = false;
    const builder: Record<string, unknown> = {};
    const chain =
      (fn?: (...a: unknown[]) => void) =>
      (...a: unknown[]) => {
        fn?.(...a);
        return proxy;
      };
    const proxy: unknown = new Proxy(builder, {
      get(_, prop) {
        if (prop === "then") {
          const rows = table(name, eq, inList);
          const data = write
            ? null
            : single
              ? Array.isArray(rows)
                ? (rows[0] ?? null)
                : rows
              : Array.isArray(rows)
                ? rows
                : rows
                  ? [rows]
                  : [];
          const result = write
            ? { data: null, error: { message: "Démo : rien n'est enregistré.", code: "demo" } }
            : { data, error: null };
          return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject);
        }
        if (prop === "eq") return chain((col, value) => (eq[String(col)] = value));
        if (prop === "in")
          return chain((col, values) => (inList[String(col)] = values as unknown[]));
        if (prop === "maybeSingle" || prop === "single") return chain(() => (single = true));
        if (prop === "insert" || prop === "update" || prop === "upsert" || prop === "delete") {
          return chain(() => (write = true));
        }
        return chain();
      },
    });
    return proxy;
  };
  const client = {
    rpc: (name: string, args?: Record<string, unknown>) => {
      const data = rpc(name, args);
      return Promise.resolve(
        data === null
          ? { data: null, error: { message: "Démo : rien n'est enregistré.", code: "demo" } }
          : { data, error: null },
      );
    },
    from: query,
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
  };
  return client as unknown as SupabaseClient<Database>;
}
