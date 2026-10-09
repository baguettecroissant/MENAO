import { safeRedirectPath } from "@menao/validation";
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const PROTECTED_PREFIXES = ["/mon-espace"];
const GUEST_ONLY = ["/connexion", "/inscription"];

export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isProtected && !claims) {
    const url = new URL("/connexion", request.url);
    url.searchParams.set("next", safeRedirectPath(pathname + search));
    return NextResponse.redirect(url);
  }

  if (claims && GUEST_ONLY.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL("/mon-espace", request.url));
  }

  return response;
}

// Limité aux routes qui ont besoin de la session : les pages publiques restent
// statiques et ne déclenchent aucune fonction (maîtrise des coûts, spec §4.4).
export const config = {
  matcher: ["/mon-espace/:path*", "/connexion/:path*", "/inscription/:path*", "/auth/:path*"],
};
