import { homePathForRole, roleFromAppMetadata, signupPending } from "@menao/core";
import { safeRedirectPath } from "@menao/validation";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { signOut } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { CompleteSignupForm } from "./complete-signup-form";

const t = fr.completeSignup;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * « Finaliser mon compte » (ADR 0108) : après une première connexion avec Google ou Apple, le
 * client vérifie son nom, ajoute son téléphone s'il le souhaite et accepte les CGU, comme à
 * l'inscription par e-mail. Le garde (proxy.ts) y ramène tant que ce n'est pas fait.
 */
export default async function CompleteSignupPage({ searchParams }: PageProps<"/finaliser-compte">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeRedirectPath(params.next) : null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  if (!signupPending(user.app_metadata)) {
    redirect((next ?? homePathForRole(roleFromAppMetadata(user.app_metadata))) as Route);
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("user_id", user.id)
    .maybeSingle();
  const provider = user.app_metadata.provider === "apple" ? "Apple" : "Google";

  return (
    <PageShell title={t.title}>
      <p className="mb-6 text-muted-foreground">{t.intro(provider, user.email ?? null)}</p>
      <CompleteSignupForm
        next={next}
        firstName={profile?.first_name ?? ""}
        lastName={profile?.last_name ?? ""}
      />
      <form action={signOut} className="mt-6 text-center">
        <button type="submit" className="text-sm font-medium text-primary-strong underline">
          {t.notYou}
        </button>
      </form>
    </PageShell>
  );
}
