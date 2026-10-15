import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

// Ancienne adresse Vercel du site : redirigée vers le domaine dès que NEXT_PUBLIC_SITE_URL le désigne
// (une seule adresse pour le référencement et les cookies de session). Les déploiements de
// prévisualisation gardent leur propre adresse.
const VERCEL_HOST = "menao-web.vercel.app";

// CSP en mode « Report-Only » pendant la phase 0 : elle sera durcie (nonces) puis
// appliquée une fois les intégrations (Stripe, signature, etc.) connues.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseUrl}`,
  "font-src 'self'",
  `connect-src 'self' ${supabaseUrl} ${supabaseUrl.replace(/^http/, "ws")} https://data.geopf.fr https://*.ingest.de.sentry.io https://*.ingest.sentry.io`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  // Redirections vers Stripe Checkout et le portail client après une Server Action.
  "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Paquets internes du monorepo publiés en TypeScript source.
  transpilePackages: [
    "@menao/core",
    "@menao/validation",
    "@menao/ui-tokens",
    "@menao/db",
    "@menao/documents",
  ],
  // Spec §4.4 : pas d'optimisation d'images Vercel (images redimensionnées à l'upload).
  images: { unoptimized: true },
  typedRoutes: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    if (!siteUrl || new URL(siteUrl).host === VERCEL_HOST) return [];
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: VERCEL_HOST }],
        destination: `${siteUrl}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  // Envoi des sourcemaps seulement si un jeton Sentry est fourni au build.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
