/**
 * Aide de l'inscription (lot 60, F-161, ADR 0347) : ce qu'il faut préparer, où trouver chaque
 * document, ce que Stripe demande, et le message prêt pour l'assureur. Partagée par le site et
 * l'application pour que l'artisan lise partout les mêmes mots.
 * Chemins des sites officiels relevés le 16 novembre 2026 : à revoir quand ces sites changent.
 */
import type { RequiredDocumentType } from "./onboarding";

export type PrepareItemKey = "siret" | "decennale" | "rc_pro" | "urssaf" | "identite" | "rib";

/** « Avant de commencer » : les six éléments à avoir sous la main. */
export const PREPARE_ITEMS: readonly { key: PrepareItemKey; title: string; hint: string }[] = [
  {
    key: "siret",
    title: "Votre numéro SIRET",
    hint: "Sur vos factures. MENAO vérifie le reste au registre des entreprises.",
  },
  {
    key: "decennale",
    title: "Attestation décennale",
    hint: "Chez votre assureur ou votre courtier. MENAO prépare le message.",
  },
  {
    key: "rc_pro",
    title: "Attestation de RC Pro",
    hint: "Dans l’espace client de votre assureur.",
  },
  {
    key: "urssaf",
    title: "Attestation URSSAF",
    hint: "Gratuite, dans votre espace URSSAF. Valable 6 mois.",
  },
  {
    key: "identite",
    title: "Pièce d’identité",
    hint: "Carte d’identité ou passeport du dirigeant.",
  },
  {
    key: "rib",
    title: "RIB de l’entreprise",
    hint: "Pour recevoir l’argent de vos clients, à l’étape des paiements.",
  },
];

export type DocumentHelpVariant = {
  /** Cas visé (« Micro-entrepreneur »…) ; null quand il n'y en a qu'un. */
  label: string | null;
  steps: readonly string[];
  link?: { label: string; url: string };
};

export type DocumentHelp = {
  title: string;
  variants: readonly DocumentHelpVariant[];
  note?: string;
  /** Décennale et RC Pro : MENAO prépare le message pour l'assureur. */
  insurerRequest: boolean;
};

/** « Où trouver ce document ? » : trois étapes au plus par cas, un lien officiel quand il existe. */
export const DOCUMENT_HELP: Record<RequiredDocumentType, DocumentHelp> = {
  kbis: {
    title: "Où trouver votre Kbis ?",
    variants: [
      {
        label: null,
        steps: [
          "Le dirigeant l’obtient gratuitement sur MonIdenum, le service des greffes.",
          "Activez votre identité numérique : comptez quelques heures à 48 h.",
          "Téléchargez l’extrait Kbis, puis revenez ici pour le déposer.",
        ],
        link: { label: "Ouvrir MonIdenum", url: "https://www.monidenum.fr" },
      },
    ],
    note: "Il n’est demandé que si la vérification automatique au registre n’a pas abouti.",
    insurerRequest: false,
  },
  decennale: {
    title: "Où trouver votre attestation décennale ?",
    variants: [
      {
        label: null,
        steps: [
          "Elle se demande à votre assureur ou à votre courtier, souvent depuis votre espace client.",
          "Demandez le modèle officiel, en cours de validité.",
          "Vérifiez que vos métiers figurent dans les activités couvertes.",
        ],
      },
    ],
    note: "MENAO peut préparer le message pour votre assureur : il ne reste qu’à l’envoyer.",
    insurerRequest: true,
  },
  rc_pro: {
    title: "Où trouver votre attestation de RC Pro ?",
    variants: [
      {
        label: null,
        steps: [
          "Ouvrez l’espace client de votre assureur, à la rubrique des attestations.",
          "Sinon, demandez-la à votre assureur ou à votre courtier.",
          "Elle doit être en cours de validité, au nom de votre entreprise.",
        ],
      },
    ],
    insurerRequest: true,
  },
  urssaf: {
    title: "Où trouver votre attestation URSSAF ?",
    variants: [
      {
        label: "Micro-entrepreneur",
        steps: [
          "Connectez-vous à votre espace sur autoentrepreneur.urssaf.fr.",
          "Ouvrez «\u00a0Mon compte\u00a0», puis «\u00a0Mes documents\u00a0» et «\u00a0Mes attestations\u00a0».",
          "Téléchargez l’attestation de vigilance, puis revenez ici pour la déposer.",
        ],
        link: { label: "Ouvrir mon espace URSSAF", url: "https://www.autoentrepreneur.urssaf.fr" },
      },
      {
        label: "Autre statut",
        steps: [
          "Connectez-vous à votre espace en ligne sur urssaf.fr.",
          "Ouvrez la rubrique des attestations.",
          "Téléchargez l’attestation de vigilance, puis revenez ici pour la déposer.",
        ],
        link: { label: "Ouvrir mon espace URSSAF", url: "https://www.urssaf.fr" },
      },
    ],
    note: "Elle n’est délivrée que si vos déclarations et vos cotisations sont à jour ; sinon, votre espace URSSAF indique ce qui manque. Elle vaut 6 mois.",
    insurerRequest: false,
  },
  identite: {
    title: "Quelle pièce d’identité ?",
    variants: [
      {
        label: null,
        steps: [
          "Carte d’identité (recto et verso) ou passeport du dirigeant, en cours de validité.",
          "Posez-la à plat, sans reflet, les quatre coins visibles.",
          "Une photo nette suffit : MENAO lit la date de validité.",
        ],
      },
    ],
    insurerRequest: false,
  },
};

/** « Avant Stripe » : ce que le formulaire demande, à garder sous la main. */
export const STRIPE_CHECKLIST: readonly { title: string; hint: string }[] = [
  { title: "Votre pièce d’identité", hint: "Celle du dirigeant, en cours de validité." },
  { title: "L’IBAN de l’entreprise", hint: "Il est sur votre RIB." },
  { title: "Votre téléphone", hint: "Stripe envoie un code par SMS." },
  {
    title: "Votre adresse et votre date de naissance",
    hint: "Demandées par Stripe pour vérifier votre identité.",
  },
];

/** SIRET lisible : 3, 3, 3 puis 5 chiffres ; autre chose est rendu tel quel. */
export function formatSiret(siret: string): string {
  const digits = siret.replace(/\s/g, "");
  if (!/^\d{14}$/.test(digits)) return siret.trim();
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
}

export type InsuranceDocument = "decennale" | "rc_pro";

export type InsurerRequestInput = {
  companyName: string;
  siret: string | null;
  /** Métiers de l'artisan, cités pour la décennale (activités couvertes). */
  tradeLabels: readonly string[];
  documents: readonly InsuranceDocument[];
  /** Nom du dirigeant ; à défaut, le message est signé du nom de l'entreprise. */
  signature: string | null;
};

const DECENNALE_LINE =
  "mon attestation d’assurance de responsabilité décennale en cours de validité, au modèle fixé par l’arrêté du 5 janvier 2016";
const RC_PRO_LINE = "mon attestation de responsabilité civile professionnelle en cours de validité";

/**
 * Message à l'assureur (ou au courtier), envoyé par l'artisan depuis sa propre messagerie :
 * MENAO ne l'envoie jamais à sa place. Le numéro de contrat reste à compléter par l'artisan.
 */
export function buildInsurerRequest(input: InsurerRequestInput): { subject: string; body: string } {
  const decennale = input.documents.includes("decennale");
  const rcPro = input.documents.includes("rc_pro");
  if (!decennale && !rcPro) throw new Error("Aucune attestation demandée");
  const company = input.companyName.trim();
  const subject =
    decennale && rcPro
      ? `Attestations décennale et RC Pro — ${company}`
      : decennale
        ? `Attestation décennale — ${company}`
        : `Attestation de RC Pro — ${company}`;
  const intro =
    "Je m’inscris sur MENAO, une plateforme qui vérifie les assurances de ses artisans.";
  const ask =
    decennale && rcPro
      ? [`${intro} Pourriez-vous m’envoyer :`, `• ${DECENNALE_LINE} ;`, `• ${RC_PRO_LINE}.`]
      : [`${intro} Pourriez-vous m’envoyer ${decennale ? DECENNALE_LINE : RC_PRO_LINE} ?`];
  const trades = input.tradeLabels
    .map((label) => label.trim().toLocaleLowerCase("fr"))
    .filter(Boolean);
  const lines = [
    "Bonjour,",
    "",
    ...ask,
    ...(decennale && trades.length
      ? ["", `Merci de vérifier que mes métiers y figurent : ${trades.join(", ")}.`]
      : []),
    "",
    input.siret ? `${company} · SIRET ${formatSiret(input.siret)}` : company,
    "Contrat n° : [à compléter]",
    "",
    "Bien cordialement,",
    input.signature?.trim() || company,
  ];
  return { subject, body: lines.join("\n") };
}

/** Lien qui ouvre la messagerie de l'artisan, message rempli ; l'adresse peut rester vide. */
export function insurerMailto(to: string, subject: string, body: string): string {
  return `mailto:${to.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Vidéos verticales de l'aide (lot 60, ADR 0349) : 15 à 40 secondes chacune, hébergées hors de
 * Vercel dans le compartiment public `aide-videos` du stockage Supabase (règle 13).
 */
export type HelpVideoId =
  | "v01-inscription"
  | "v02-entreprise"
  | "v03-metiers-zone"
  | "v04-charte"
  | "v05-photo"
  | "v06-decennale"
  | "v07-rc-pro"
  | "v08-urssaf"
  | "v09-identite"
  | "v10-profil"
  | "v11-stripe";

export const HELP_VIDEOS: Record<HelpVideoId, { title: string; seconds: number }> = {
  "v01-inscription": { title: "Votre inscription en quelques étapes", seconds: 27 },
  "v02-entreprise": { title: "Retrouver votre entreprise avec le SIRET", seconds: 16 },
  "v03-metiers-zone": { title: "Choisir vos métiers et votre zone", seconds: 17 },
  "v04-charte": { title: "Signer la charte qualité", seconds: 12 },
  "v05-photo": { title: "Bien photographier un document", seconds: 17 },
  "v06-decennale": { title: "Demander votre attestation décennale", seconds: 29 },
  "v07-rc-pro": { title: "Trouver votre attestation de RC Pro", seconds: 19 },
  "v08-urssaf": { title: "Trouver votre attestation URSSAF", seconds: 39 },
  "v09-identite": { title: "Déposer votre pièce d’identité", seconds: 18 },
  "v10-profil": { title: "Rédiger votre présentation", seconds: 18 },
  "v11-stripe": { title: "Le formulaire Stripe, case par case", seconds: 21 },
};

/** Vidéo de chaque pièce dans « Où trouver ce document ? » (pas de vidéo pour le Kbis). */
export const DOCUMENT_HELP_VIDEO: Record<RequiredDocumentType, HelpVideoId | null> = {
  kbis: null,
  decennale: "v06-decennale",
  rc_pro: "v07-rc-pro",
  urssaf: "v08-urssaf",
  identite: "v09-identite",
};

export const HELP_VIDEO_BUCKET = "aide-videos";

/** Adresses publiques de la vidéo et de son image d'aperçu. */
export function helpVideoUrls(
  supabaseUrl: string,
  id: HelpVideoId,
): { video: string; poster: string } {
  const base = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${HELP_VIDEO_BUCKET}/${id}`;
  return { video: `${base}.mp4`, poster: `${base}.jpg` };
}
