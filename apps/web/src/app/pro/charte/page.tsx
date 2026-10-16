import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { SignedCharter } from "@/components/pro/charter/signed-charter";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { signOut } from "@/lib/auth/actions";
import { CharterDone } from "../onboarding/charte/charter-done";
import { CharterForm } from "../onboarding/charte/charter-form";

const t = fr.pro.charterRenewal;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * Charte qualité pour un artisan déjà inscrit (ADR 0109) : inscrit avant la charte, ou nouvelle
 * version. L'espace pro (requireProSpace) y renvoie tant qu'elle n'est pas signée ; même lecture
 * et même signature qu'à l'inscription (ADR 0104), puis retour à l'espace pro.
 */
export default async function CharterRenewalPage({
  searchParams,
}: {
  searchParams: Promise<{ relire?: string }>;
}) {
  const { supabase, userId, artisan, charter } = await getOnboardingContext();
  // En cours d'inscription : l'étape « Charte qualité » de l'inscription.
  if (artisan.status !== "valide" && artisan.status !== "suspendu") {
    redirect("/pro/onboarding/charte");
  }
  const { relire } = await searchParams;

  let content;
  if (!charter) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", userId)
      .single();
    content = (
      <>
        <Alert tone="info">{t.intro}</Alert>
        <CharterForm
          destination="espace"
          defaults={{
            name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" "),
            company: artisan.nom_commercial ?? artisan.raison_sociale ?? "",
            siret: artisan.siret ?? "",
          }}
        />
      </>
    );
  } else if (relire) {
    content = <SignedCharter backHref="/pro/charte" />;
  } else {
    content = (
      <CharterDone
        charter={charter}
        continueHref="/pro/tableau-de-bord"
        continueLabel={t.continue}
        rereadHref="/pro/charte?relire=1"
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-primary/10 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <Link href="/pro/charte" aria-label={t.title} className="rounded-md">
            <Logo />
          </Link>
          <span className="rounded-chip bg-primary-soft px-2 py-1 text-xs font-medium text-primary-strong">
            {fr.nav.pro}
          </span>
          <form action={signOut} className="ml-auto">
            <button
              type="submit"
              className="min-h-touch font-medium underline-offset-2 hover:underline"
            >
              {fr.mySpace.signOut}
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">{content}</main>
    </div>
  );
}
