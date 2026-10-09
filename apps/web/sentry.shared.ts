import type { init } from "@sentry/nextjs";

type SentryOptions = NonNullable<Parameters<typeof init>[0]>;

/**
 * Options communes client / serveur / edge.
 * CLAUDE.md règle 11 : aucune donnée personnelle envoyée à Sentry. Le SDK collecte par
 * défaut cookies (jetons de session), en-têtes, corps de requêtes et infos utilisateur :
 * tout est désactivé explicitement.
 */
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  // « production » ou « preview » sur Vercel ; « local » sur un poste de développement.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "local",
  tracesSampleRate: 0.1,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: { allow: ["user-agent", "content-type"] }, response: false },
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    stackFrameVariables: false,
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
  },
} satisfies SentryOptions;
