import {
  ARTISAN_SIGNUP_FINALIZE_PATH,
  ARTISAN_WELCOME_PATH,
  homePathForRole,
  roleFromAppMetadata,
  signupPending,
} from "@menao/core";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { ArtisanSignupFlow } from "@/components/pro/signup/signup-flow";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { signOut } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

const t = fr.pro.signUp.finalize;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * Retour de Google ou Apple depuis l'inscription artisan (ADR 0110) : le parcours reprend avec les
 * choix gardés dans le navigateur, puis le compte à finaliser devient un compte artisan en attente.
 */
export default async function ArtisanFinalizePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(ARTISAN_SIGNUP_FINALIZE_PATH)}`);
  const role = roleFromAppMetadata(user.app_metadata);

  if (!signupPending(user.app_metadata) || role !== "particulier") {
    if (role === "artisan_en_attente") redirect(ARTISAN_WELCOME_PATH as Route);
    if (role !== "particulier") redirect(homePathForRole(role) as Route);
    // Compte client déjà en service : il ne devient pas un compte pro.
    return (
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <Alert tone="info">{t.notAvailable}</Alert>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            {t.signOut}
          </Button>
        </form>
      </main>
    );
  }

  const [{ data: profile }, { data: trades }] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name").eq("user_id", user.id).maybeSingle(),
    supabase.from("trades").select("code, label").eq("active", true).order("sort_order"),
  ]);

  return (
    <ArtisanSignupFlow
      trades={trades ?? []}
      providers={[]}
      oauth={{
        providerLabel: user.app_metadata.provider === "apple" ? "Apple" : "Google",
        email: user.email ?? null,
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
      }}
    />
  );
}
