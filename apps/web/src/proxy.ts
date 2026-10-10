import { homePathForRole, roleFromAppMetadata } from "@menao/core";
import { safeRedirectPath } from "@menao/validation";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const PROTECTED_PREFIXES = [
  "/mon-espace",
  "/pro/onboarding",
  "/pro/tableau-de-bord",
  "/pro/demandes",
  "/pro/chantiers",
  "/pro/devis",
  "/pro/factures",
  "/agenda",
  "/devis",
  "/factures",
  "/nouveau-mot-de-passe",
  "/admin",
];
// Recherche (F-05 à F-07) : accessible avec une session anonyme (ADR 0012).
const SEARCH_PREFIX = "/recherche";
const GUEST_ONLY = ["/connexion", "/inscription", "/pro/inscription"];

export async function proxy(request: NextRequest) {
  const { response, claims: sessionClaims } = await updateSession(request);
  const { pathname, search } = request.nextUrl;
  // Une session anonyme ne vaut pas compte : espaces protégés fermés, pages invité ouvertes.
  const claims = sessionClaims?.is_anonymous ? null : sessionClaims;

  if (pathname.startsWith(`${SEARCH_PREFIX}/`) && !sessionClaims) {
    return redirectWithSession(new URL("/", request.url), response);
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isProtected && !claims) {
    const url = new URL("/connexion", request.url);
    url.searchParams.set("next", safeRedirectPath(pathname + search));
    return redirectWithSession(url, response);
  }

  if (claims && GUEST_ONLY.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const home = homePathForRole(roleFromAppMetadata(claims.app_metadata));
    return redirectWithSession(new URL(home, request.url), response);
  }

  return response;
}

/**
 * Redirige en conservant les cookies de session éventuellement rafraîchis par
 * updateSession : sans eux, le refresh token déjà utilisé serait rejoué et la
 * session révoquée.
 */
function redirectWithSession(url: URL, sessionResponse: NextResponse) {
  const redirect = NextResponse.redirect(url);
  for (const cookie of sessionResponse.cookies.getAll()) redirect.cookies.set(cookie);
  const cacheControl = sessionResponse.headers.get("cache-control");
  if (cacheControl) redirect.headers.set("cache-control", cacheControl);
  return redirect;
}

// Limité aux routes qui ont besoin de la session : les pages publiques restent
// statiques et ne déclenchent aucune fonction (maîtrise des coûts, spec §4.4).
export const config = {
  matcher: [
    "/mon-espace/:path*",
    "/connexion/:path*",
    "/inscription/:path*",
    "/auth/:path*",
    "/pro/inscription",
    "/pro/onboarding/:path*",
    "/pro/tableau-de-bord",
    "/pro/demandes/:path*",
    "/pro/chantiers/:path*",
    "/pro/devis/:path*",
    "/pro/factures/:path*",
    "/agenda/:path*",
    "/devis/:path*",
    "/factures/:path*",
    "/nouveau-mot-de-passe",
    "/admin/:path*",
    "/recherche/:path*",
  ],
};
