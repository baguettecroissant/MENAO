// Données fictives des captures des stores (ADR 0097) : un monde de démonstration cohérent,
// servi à la place de Supabase pendant la capture. Aucune donnée réelle, aucun avis client.

export const IDS = {
  particulier: "00000000-0000-4000-8000-00000000c11e",
  artisan: "00000000-0000-4000-8000-0000000a7150",
  projet: "11111111-1111-4111-8111-111111111111",
  chantierClient: "22222222-2222-4222-8222-222222222222",
  chantierPro: "33333333-3333-4333-8333-333333333333",
  devis: "44444444-4444-4444-8444-444444444444",
};

const jour = 24 * 3600 * 1000;
/** Date ISO à `jours` de maintenant, à l'heure donnée (heure de Paris approximée en UTC+2). */
function le(now, jours, heure = 9, minute = 0) {
  const d = new Date(now.getTime() + jours * jour);
  d.setUTCHours(heure - 2, minute, 0, 0);
  return d.toISOString();
}
const date = (iso) => iso.slice(0, 10);

/** Réponses des RPC et des tables lues par les écrans capturés. */
export function donnees(now) {
  const artisans = [
    ["Noé Exemple", 14, 2.4, true, ["Recherche de fuite", "Salle de bain"]],
    ["Inès Démo", 9, 5.1, true, ["Chauffe-eau", "Sanitaires"]],
    ["Sacha Fictif", 21, 7.8, false, ["Canalisations", "Robinetterie"]],
    ["Lou Modèle", 6, 11.2, true, ["Dépannage", "Sanitaires"]],
  ].map(([name, years, km, now_, specialties], i) => ({
    artisan_id: `00000000-0000-4000-8000-00000000a${i}01`,
    display_name: name,
    experience_years: years,
    distance_km: km,
    available_now: now_,
    available_from: now_ ? null : date(le(now, 6)),
    avatar_path: null,
    specialties,
    zone_city: "Nice",
    zone_communes: [],
    zone_mode: "rayon",
    zone_radius_km: 25,
  }));

  const chantierClient = {
    chantier_id: IDS.chantierClient,
    project_id: IDS.projet,
    title: "Rénovation de la salle de bain",
    description:
      "Remplacement de la baignoire par une douche à l'italienne, nouveau meuble vasque et reprise de la faïence.",
    trade_label: "Plombier",
    adresse: "12 avenue Exemple",
    code_postal: "06000",
    ville_nom: "Nice",
    status: "en_cours",
    appointment_at: le(now, -12, 10),
    start_at: le(now, -3, 8, 30),
    finished_at: null,
    received_at: null,
    closed_at: null,
    created_at: le(now, -20),
    artisan_id: artisans[0].artisan_id,
    artisan_name: "Noé Exemple",
    artisan_phone: null,
    artisan_avatar_path: null,
    photo_path: null,
    quote_id: IDS.devis,
    quote_status: "signe",
    quote_total_ttc_cents: 486000,
    deposit_cents: 145800,
    deposit_status: "paye",
    balance_cents: 340200,
    balance_status: null,
  };

  const inbox = [
    [
      "Fuite sous l'évier de la cuisine",
      "Camille",
      "06000",
      "Nice",
      "des_que_possible",
      null,
      true,
    ],
    [
      "Remplacement d'un chauffe-eau de 200 L",
      "Dominique",
      "06200",
      "Nice",
      "date",
      date(le(now, 9)),
      false,
    ],
    ["Installation d'une douche à l'italienne", "Alex", "06300", "Nice", "inconnue", null, false],
  ].map(([summary, first, cp, ville, mode, souhaitee, urgence], i) => ({
    request_id: `00000000-0000-4000-8000-0000000e0${i}01`,
    status: "envoyee",
    summary,
    trade_label: "Plombier",
    client_first_name: first,
    code_postal: cp,
    ville_nom: ville,
    date_mode: mode,
    date_souhaitee: souhaitee,
    urgence,
    photo_path: null,
    created_at: le(now, -i * 0.3, 8),
    expires_at: le(now, 2 - i * 0.2, 18),
  }));

  const chantiersPro = [
    ["Rénovation de la salle de bain", "Camille", "Martin", "planifie", null, le(now, 1, 8, 30)],
    ["Recherche de fuite", "Dominique", "Bernard", "rdv_planifie", le(now, 2, 14), null],
    ["Pose d'un mitigeur thermostatique", "Alex", "Petit", "rdv_planifie", le(now, -1, 10), null],
  ].map(([title, first, last, status, rdv, start], i) => ({
    chantier_id: i === 2 ? IDS.chantierPro : `00000000-0000-4000-8000-0000000c0${i}01`,
    request_id: `00000000-0000-4000-8000-0000000e1${i}01`,
    particulier_id: `00000000-0000-4000-8000-0000000f0${i}01`,
    title,
    client_first_name: first,
    client_last_name: last,
    adresse: "",
    code_postal: "06000",
    ville_nom: "Nice",
    status,
    appointment_at: rdv,
    start_at: start,
    created_at: le(now, -5 - i),
  }));

  const grade = {
    xp: 420,
    level: 3,
    levels: [
      { level: 1, xp_min: 0, reward: null, reward_detail: null },
      { level: 2, xp_min: 150, reward: null, reward_detail: null },
      { level: 3, xp_min: 350, reward: null, reward_detail: null },
      { level: 4, xp_min: 600, reward: null, reward_detail: null },
      {
        level: 5,
        xp_min: 1000,
        reward: "Ensemble de chantier MENAO",
        reward_detail: "Veste et pantalon professionnels avec logo brodé",
      },
    ],
    objectives: [],
    badges: [
      {
        code: "toujours_a_l_heure",
        label: "Toujours à l'heure",
        description: "",
        target: 10,
        progress: 10,
        unlocked_at: le(now, -4),
        seen: true,
      },
    ],
    claims: [],
  };

  const lignes = [
    ["materiel", "Receveur de douche extra-plat 120 × 90 cm", 1000, "u", 38900, 1000],
    ["materiel", "Colonne de douche thermostatique", 1000, "u", 24500, 1000],
    ["main_oeuvre", "Dépose de la baignoire et évacuation", 4000, "h", 5500, 1000],
    ["main_oeuvre", "Pose du receveur et raccordements", 8000, "h", 5500, 1000],
  ].map(
    ([type, designation, quantity_milli, unit, unit_price_ht_cents, vat_rate_bp], position) => ({
      position,
      type,
      designation,
      description: null,
      quantity_milli,
      unit,
      unit_price_ht_cents,
      vat_rate_bp,
    }),
  );

  return {
    rpc: {
      my_unread_messages: 1,
      my_unread_notifications: 2,
      match_artisans: artisans,
      particulier_requests: [],
      particulier_chantiers: [chantierClient],
      artisan_inbox: inbox,
      artisan_chantiers: chantiersPro,
      my_response_stats: [{ minutes: 95, responses: 12 }],
      artisan_grade: grade,
      chantier_messages: [],
      my_conversations: [],
    },
    tables: {
      trades: null, // laissé à la vraie liste du référentiel (lecture publique)
      profiles: (role) => ({
        first_name: role === "artisan" ? "Noé" : "Camille",
        last_name: role === "artisan" ? "Exemple" : "Martin",
        // Photo de démonstration servie par le générateur (initiales, aucun visage).
        avatar_path: role === "artisan" ? "demo/noe.png" : null,
      }),
      artisans: {
        id: IDS.artisan,
        status: "valide",
        assujetti_tva: true,
        default_deposit_percent: 30,
      },
      projects: {
        trade_code: "plombier",
        ville_nom: "Nice",
        date_mode: "des_que_possible",
        date_souhaitee: null,
        work_type_codes: ["recherche-fuite"],
      },
      payments: (role) =>
        role === "artisan"
          ? [
              { amount_cents: 259300, paid_at: le(now, -2, 15), status: "paye", kind: "acompte" },
              // Même période du mois précédent, pour l'évolution d'« Encaissé ce mois ».
              { amount_cents: 214000, paid_at: le(now, -31, 15), status: "paye", kind: "solde" },
            ]
          : [
              {
                amount_cents: 145800,
                paid_at: le(now, -10, 15),
                status: "paye",
                kind: "acompte",
                quote_id: IDS.devis,
              },
            ],
      // Journal du chantier : deux messages de l'artisan.
      chantier_updates: [
        {
          id: "00000000-0000-4000-8000-00000000d001",
          kind: "message",
          message: "Le receveur est posé et raccordé. La faïence commence demain matin.",
          storage_path: null,
          created_at: le(now, 0, 8, 40),
        },
        {
          id: "00000000-0000-4000-8000-00000000d002",
          kind: "message",
          message: "Dépose de la baignoire terminée, les arrivées d'eau sont prêtes.",
          storage_path: null,
          created_at: le(now, -2, 17, 10),
        },
      ],
      invoices: [
        {
          id: "00000000-0000-4000-8000-00000000f001",
          numero: "F-2026-0042",
          kind: "acompte",
          issued_on: date(le(now, -10)),
        },
      ],
      receptions: [],
      tickets: [],
      reviews: [],
      quotes: [{ id: IDS.devis, quote_lines: lignes }],
      appointments: [{ starts_at: le(now, -1, 10) }],
    },
  };
}
