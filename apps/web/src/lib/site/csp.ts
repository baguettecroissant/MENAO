/**
 * Politique de sécurité du contenu (CSP) du site, appliquée par next.config (ADR 0103).
 *
 * Les scripts en ligne restent autorisés ('unsafe-inline') : Next.js en insère pour l'hydratation,
 * et des nonces imposeraient un rendu dynamique de chaque page (fin des pages statiques, spec §4.4).
 * La politique ferme tout le reste : origines de scripts, d'images et de connexions limitées à
 * celles que le site utilise, aucun cadre hors du stockage Supabase (PDF du back-office, ADR 0120)
 * et aucune inclusion du site ailleurs (sauf le widget des partenaires, ADR 0138), aucun plugin,
 * envois de formulaires limités au site, aux pages de paiement et de signature, et à la connexion
 * avec Google ou Apple.
 */
export type CspOptions = {
  supabaseUrl: string;
  /** « development » : React a besoin d'eval pour le rechargement à chaud. */
  dev: boolean;
  /** Déploiements de prévisualisation Vercel : barre d'outils de commentaires (vercel.live). */
  preview: boolean;
  /** DSN Sentry : les violations y sont signalées. */
  sentryDsn?: string;
  /**
   * Page intégrable chez les partenaires (widget, ADR 0138) : affichable dans un cadre sur tout
   * site en HTTPS. Partout ailleurs, le site ne s'affiche jamais dans un cadre.
   */
  embeddable?: boolean;
  /**
   * Page du formulaire Stripe intégré (ADR 0215) : scripts, cadres et images de Stripe autorisés.
   * Page toujours chargée en entier ; le reste du site garde la politique stricte.
   */
  stripeConnect?: boolean;
  /**
   * Appels web de la secrétaire vocale (ADR 0225), quand elle est configurée : API Vapi et
   * transport audio Daily (scripts et connexions). Sur tout le site, pour la même raison que les
   * cadres : la page garde la politique du premier document chargé.
   */
  voiceCalls?: boolean;
};

// Appels web de la secrétaire vocale : API Vapi, transport audio Daily (WebRTC).
const VOICE_SCRIPT_ORIGINS = ["https://*.daily.co"];
const VOICE_CONNECT_ORIGINS = [
  "https://api.vapi.ai",
  "https://*.daily.co",
  "wss://*.daily.co",
  "https://*.pluot.blue",
  "wss://*.pluot.blue",
];

// Composants Connect de Stripe (formulaire d'inscription intégré, ADR 0215).
const STRIPE_CONNECT_ORIGINS = ["https://connect-js.stripe.com", "https://js.stripe.com"];

// Pages externes atteintes après l'envoi d'un formulaire (redirection d'une Server Action sans
// JavaScript) : paiement Stripe (Checkout, portail, Connect) et signature DocuSeal (UE).
const FORM_TARGETS = [
  "https://checkout.stripe.com",
  "https://billing.stripe.com",
  "https://connect.stripe.com",
  "https://docuseal.eu",
  "https://docuseal.com",
];
// Connexion avec Google ou Apple (ADR 0108) : le bouton envoie un formulaire, redirigé vers
// Supabase Auth puis vers la page du fournisseur.
const OAUTH_TARGETS = ["https://accounts.google.com", "https://appleid.apple.com"];

/** Adresse de signalement des violations de Sentry, déduite du DSN (`…/api/<projet>/security/`). */
export function sentryReportUri(dsn: string | undefined): string | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const project = url.pathname.replace(/^\/+/, "");
    if (!url.username || !project) return null;
    return `${url.protocol}//${url.host}/api/${project}/security/?sentry_key=${url.username}`;
  } catch {
    return null;
  }
}

export function contentSecurityPolicy({
  supabaseUrl,
  dev,
  preview,
  sentryDsn,
  embeddable = false,
  stripeConnect = false,
  voiceCalls = false,
}: CspOptions) {
  const supabase = supabaseUrl.replace(/\/+$/, "");
  const realtime = supabase.replace(/^http/, "ws");
  const live = preview ? ["https://vercel.live"] : [];
  const report = sentryReportUri(sentryDsn);
  const stripe = stripeConnect ? STRIPE_CONNECT_ORIGINS : [];
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    [
      "script-src",
      "'self'",
      "'unsafe-inline'",
      ...(dev ? ["'unsafe-eval'"] : []),
      ...stripe,
      ...(voiceCalls ? VOICE_SCRIPT_ORIGINS : []),
      ...live,
    ],
    ["style-src", "'self'", "'unsafe-inline'", ...live],
    [
      "img-src",
      "'self'",
      "data:",
      "blob:",
      supabase,
      // Tuiles du Plan IGN, aperçu de la zone d'intervention (ADR 0126).
      "https://data.geopf.fr",
      ...(stripeConnect ? ["https://*.stripe.com"] : []),
      ...(preview ? [...live, "https://vercel.com"] : []),
    ],
    ["font-src", "'self'", ...live],
    ["media-src", "'self'", "blob:", supabase],
    [
      "connect-src",
      "'self'",
      supabase,
      realtime,
      "https://data.geopf.fr",
      // Recherche de l'entreprise à l'inscription artisan (ADR 0110).
      "https://recherche-entreprises.api.gouv.fr",
      // Jetons Stripe du pré-remplissage du compte de paiement, créés par le navigateur (ADR 0204).
      "https://api.stripe.com",
      "https://*.ingest.de.sentry.io",
      "https://*.ingest.sentry.io",
      ...(voiceCalls ? VOICE_CONNECT_ORIGINS : []),
      ...(preview ? [...live, "wss://ws-us3.pusher.com"] : []),
    ],
    ["worker-src", "'self'", "blob:"],
    // Cadres : le stockage Supabase seulement (ADR 0120), pour les PDF des artisans vérifiés côte à
    // côte dans le back-office. Sur tout le site : lors d'une navigation interne, la page garde la
    // politique du premier document chargé (une règle propre à /admin ne s'appliquerait pas).
    ["frame-src", supabase, ...stripe, ...live],
    ["frame-ancestors", ...(embeddable ? ["https:"] : ["'none'"])],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["manifest-src", "'self'"],
    ["form-action", "'self'", ...FORM_TARGETS, supabase, ...OAUTH_TARGETS],
    ...(report ? ([["report-uri", report]] as [string, ...string[]][]) : []),
  ];
  return directives.map((d) => d.join(" ")).join("; ");
}
