import type { Metadata } from "next";
import { ArtisanSignupFlow } from "@/components/pro/signup/signup-flow";
import { fr } from "@/i18n/fr";
import { oauthProviders } from "@/lib/auth/oauth";
import { baseTradesLimit } from "@/lib/artisan/plan-limits";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = { title: `${fr.pro.signUp.title} — MENAO` };

// Liste des métiers servie depuis le cache (référentiel, spec §4.4).
export const revalidate = 3600;

/** Inscription artisan en un seul parcours (ADR 0110). */
export default async function ArtisanSignUpPage() {
  const supabase = createPublicClient();
  const [{ data: trades }, { data: base }] = await Promise.all([
    supabase.from("trades").select("code, label").eq("active", true).order("sort_order"),
    // Limite de métiers de la formule de Base (ADR 0290), comme la base à l'inscription.
    supabase.from("plans").select("limites").eq("code", "base").maybeSingle(),
  ]);
  return (
    <ArtisanSignupFlow
      trades={trades ?? []}
      providers={oauthProviders}
      maxTrades={baseTradesLimit(base?.limites)}
    />
  );
}
