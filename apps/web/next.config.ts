import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import { contentSecurityPolicy } from "./src/lib/site/csp";
import { prelaunchRewrites } from "./src/lib/site/prelaunch";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

// Ancienne adresse Vercel du site : redirigée vers le domaine dès que NEXT_PUBLIC_SITE_URL le désigne
// (une seule adresse pour le référencement et les cookies de session). Les déploiements de
// prévisualisation gardent leur propre adresse.
const VERCEL_HOST = "menao-web.vercel.app";

// CSP appliquée (ADR 0103) : voir src/lib/site/csp.ts.
const cspOptions = {
  supabaseUrl,
  dev: process.env.NODE_ENV !== "production",
  preview: (process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV) === "preview",
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
};
const csp = contentSecurityPolicy(cspOptions);

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Content-Security-Policy", value: csp },
];

// Widget des partenaires (ADR 0138) : seule page affichable dans un cadre, sur un site en HTTPS
// (frame-ancestors), sans X-Frame-Options.
const widgetHeaders = [
  ...securityHeaders.filter(
    (h) => h.key !== "X-Frame-Options" && h.key !== "Content-Security-Policy",
  ),
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy({ ...cspOptions, embeddable: true }),
  },
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
    return [
      { source: "/:path((?!widget(?:/|$)).*)", headers: securityHeaders },
      { source: "/widget/:path*", headers: widgetHeaders },
    ];
  },
  // Mode pré-lancement (ADR 0101) : page d'attente sans le cookie des testeurs.
  async rewrites() {
    return {
      beforeFiles: prelaunchRewrites(process.env.PRELAUNCH_ACCESS_CODE),
      afterFiles: [],
      fallback: [],
    };
  },
  async redirects() {
    // Programme Partenaires (F-59, ADR 0136) : liens courts sans fonction serveur ni traceur ; le
    // code suit l'adresse jusqu'à la demande de travaux ou l'inscription artisan.
    const partnerLinks = [
      {
        source: "/p/:code([a-z0-9-]{3,32})",
        destination: "/recherche?p=:code",
        permanent: false,
      },
      {
        source: "/p/:code([a-z0-9-]{3,32})/pro",
        destination: "/pro/inscription?p=:code",
        permanent: false,
      },
    ];
    if (!siteUrl || new URL(siteUrl).host === VERCEL_HOST) return partnerLinks;
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: VERCEL_HOST }],
        destination: `${siteUrl}/:path*`,
        permanent: true,
      },
      ...partnerLinks,
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
