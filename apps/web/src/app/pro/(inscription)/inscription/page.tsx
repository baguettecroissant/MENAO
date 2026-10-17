import type { Metadata } from "next";
import { ArtisanSignupFlow } from "@/components/pro/signup/signup-flow";
import { fr } from "@/i18n/fr";
import { oauthProviders } from "@/lib/auth/oauth";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = { title: `${fr.pro.signUp.title} — MENAO` };

// Liste des métiers servie depuis le cache (référentiel, spec §4.4).
export const revalidate = 3600;

/** Inscription artisan en un seul parcours (ADR 0110). */
export default async function ArtisanSignUpPage() {
  const { data: trades } = await createPublicClient()
    .from("trades")
    .select("code, label")
    .eq("active", true)
    .order("sort_order");
  return <ArtisanSignupFlow trades={trades ?? []} providers={oauthProviders} />;
}
