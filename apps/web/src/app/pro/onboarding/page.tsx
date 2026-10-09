import { ONBOARDING_STEPS } from "@menao/core";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { Alert, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { SubmitOnboarding } from "./submit-onboarding";

const t = fr.pro.onboarding;

/** Statut du dossier, envoi en vérification, sinon première étape disponible non terminée. */
export default async function OnboardingIndexPage() {
  const { artisan, progress, canSubmit } = await getOnboardingContext();
  const editable = artisan.status === "brouillon" || artisan.status === "refuse";

  if (editable && !canSubmit) {
    const next = ONBOARDING_STEPS.find((s) => s.available && !progress[s.key]);
    if (next) redirect(`/pro/onboarding/${next.key}` as Route);
  }

  return (
    <div className="flex flex-col gap-6">
      {artisan.status === "refuse" && (
        <Alert tone="error">{t.status.refuse(artisan.refusal_reason)}</Alert>
      )}
      {artisan.status === "en_verification" && (
        <Alert tone="success">{t.status.en_verification}</Alert>
      )}
      {artisan.status === "valide" && <Alert tone="success">{t.status.valide}</Alert>}
      {artisan.status === "suspendu" && <Alert tone="error">{t.status.suspendu}</Alert>}
      {editable && canSubmit && (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">{t.submit.title}</h2>
          <p className="mb-4">{t.submit.intro}</p>
          <SubmitOnboarding />
        </Card>
      )}
      <Card>
        <p className="text-muted-foreground">{t.nextStepsSoon}</p>
      </Card>
    </div>
  );
}
