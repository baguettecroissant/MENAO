/**
 * Politique de sécurité du contenu (CSP) du site, appliquée par next.config (ADR 0103).
 *
 * Les scripts en ligne restent autorisés ('unsafe-inline') : Next.js en insère pour l'hydratation,
 * et des nonces imposeraient un rendu dynamique de chaque page (fin des pages statiques, spec §4.4).
 * La politique ferme tout le reste : origines de scripts, d'images et de connexions limitées à
 * celles que le site utilise, aucun cadre (ni contenu ni inclusion du site ailleurs), aucun plugin,
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
};

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

export function contentSecurityPolicy({ supabaseUrl, dev, preview, sentryDsn }: CspOptions) {
  const supabase = supabaseUrl.replace(/\/+$/, "");
  const realtime = supabase.replace(/^http/, "ws");
  const live = preview ? ["https://vercel.live"] : [];
  const report = sentryReportUri(sentryDsn);
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    ["script-src", "'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), ...live],
    ["style-src", "'self'", "'unsafe-inline'", ...live],
    [
      "img-src",
      "'self'",
      "data:",
      "blob:",
      supabase,
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
      "https://*.ingest.de.sentry.io",
      "https://*.ingest.sentry.io",
      ...(preview ? [...live, "wss://ws-us3.pusher.com"] : []),
    ],
    ["worker-src", "'self'", "blob:"],
    ["frame-src", ...(preview ? live : ["'none'"])],
    ["frame-ancestors", "'none'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["manifest-src", "'self'"],
    ["form-action", "'self'", ...FORM_TARGETS, supabase, ...OAUTH_TARGETS],
    ...(report ? ([["report-uri", report]] as [string, ...string[]][]) : []),
  ];
  return directives.map((d) => d.join(" ")).join("; ");
}
