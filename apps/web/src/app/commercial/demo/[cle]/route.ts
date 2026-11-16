import { type NextRequest, NextResponse } from "next/server";
import { COMMERCIAL_DEMO_COOKIE, COMMERCIAL_DEMO_MAX_AGE } from "@/lib/commercial/demo-cookie";
import { createClient } from "@/lib/supabase/server";

/**
 * Lien de démo de l'espace commercial (ADR 0344) : la clé est vérifiée, posée dans un cookie de
 * 7 jours, puis la démo s'ouvre sur l'accueil de l'espace. Clé inconnue ou lien désactivé : page
 * d'explication, sans rien révéler.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ cle: string }> }) {
  const { cle } = await params;
  const key = /^[a-f0-9]{32}$/.test(cle) ? cle : null;
  const supabase = await createClient();
  const { data } = key
    ? await supabase.rpc("commercial_demo_open", { p_key: key })
    : { data: false };
  if (data !== true || !key) {
    return NextResponse.redirect(new URL("/commercial/demo/invalide", request.url));
  }
  const response = NextResponse.redirect(new URL("/commercial", request.url));
  response.cookies.set(COMMERCIAL_DEMO_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COMMERCIAL_DEMO_MAX_AGE,
  });
  response.headers.set("cache-control", "no-store");
  return response;
}
