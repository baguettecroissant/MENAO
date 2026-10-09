import { ONBOARDING_STEPS } from "@menao/core";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { Alert, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";

/** Envoie l'artisan vers la première étape disponible non terminée. */
export default async function OnboardingIndexPage() {
  const { progress } = await getOnboardingContext();
  const next = ONBOARDING_STEPS.find((s) => s.available && !progress[s.key]);
  if (next) redirect(`/pro/onboarding/${next.key}` as Route);

  return (
    <Card>
      <Alert tone="success">{fr.pro.onboarding.nextStepsSoon}</Alert>
    </Card>
  );
}
