import { SignedCharter } from "@/components/pro/charter/signed-charter";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { CharterDone } from "./charter-done";
import { CharterForm } from "./charter-form";

const t = fr.pro.onboarding.charter;

/**
 * Étape « Charte qualité » de l'inscription pro (ADR 0104) : lecture et signature, puis écran de
 * bienvenue avec le récapitulatif. « Relire la charte » affiche la version signée.
 */
export default async function CharterPage({
  searchParams,
}: {
  searchParams: Promise<{ relire?: string }>;
}) {
  const { supabase, userId, artisan, charter } = await getOnboardingContext();
  const { relire } = await searchParams;

  if (!charter) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", userId)
      .single();
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
    return (
      <CharterForm
        defaults={{
          name,
          company: artisan.nom_commercial ?? artisan.raison_sociale ?? "",
          siret: artisan.siret ?? "",
        }}
      />
    );
  }

  if (relire) return <SignedCharter backHref="/pro/onboarding/charte" />;

  return (
    <CharterDone
      charter={charter}
      continueHref="/pro/onboarding/documents"
      continueLabel={t.next}
      rereadHref="/pro/onboarding/charte?relire=1"
    />
  );
}
