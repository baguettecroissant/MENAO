import { type NextRequest, NextResponse } from "next/server";
import { COMMERCIAL_DEMO_COOKIE } from "@/lib/commercial/demo-cookie";

/** « Quitter la démo » (ADR 0344) : le cookie de la démo est retiré, retour à l'accueil du site. */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(COMMERCIAL_DEMO_COOKIE);
  response.headers.set("cache-control", "no-store");
  return response;
}
