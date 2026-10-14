import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/env";

/**
 * Lien du QR code « Suivez tous vos chantiers, depuis votre poche » : envoie vers la fiche de
 * l'application du store du téléphone (App Store sur iPhone et iPad, Google Play sur Android),
 * sinon vers l'accueil tant que l'application n'est pas publiée.
 */
export function GET(request: NextRequest) {
  const agent = request.headers.get("user-agent") ?? "";
  const store = /iPhone|iPad|iPod/i.test(agent)
    ? env.NEXT_PUBLIC_APP_STORE_URL
    : /Android/i.test(agent)
      ? env.NEXT_PUBLIC_PLAY_STORE_URL
      : (env.NEXT_PUBLIC_APP_STORE_URL ?? env.NEXT_PUBLIC_PLAY_STORE_URL);
  return NextResponse.redirect(store ?? new URL("/", request.url), 307);
}
