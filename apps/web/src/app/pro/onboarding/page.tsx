import { ONBOARDING_STEPS } from "@menao/core";
import { CalendarDays } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, ButtonLink, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { SubmitOnboarding } from "./submit-onboarding";

const t = fr.pro.onboarding;

/** Statut du dossier, envoi en vérification, sinon première étape disponible non terminée. */
export default async function OnboardingIndexPage() {
  const { artisan, progress, canSubmit, visibility } = await getOnboardingContext();
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
      {(artisan.status === "valide" || artisan.status === "suspendu") && (
        <Card>
          {visibility.visible ? (
            <p className="font-medium text-success">{t.visibility.visible}</p>
          ) : (
            <>
              <p className="font-medium">{t.visibility.hidden}</p>
              <ul className="mt-2 list-disc pl-6">
                {visibility.missing.map((m) => (
                  <li key={m}>{t.visibility.missing[m]}</li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}
      {(artisan.status === "valide" || artisan.status === "suspendu") && (
        <Link
          href="/pro/tableau-de-bord"
          className="inline-flex min-h-touch items-center justify-center rounded-button bg-primary px-6 font-medium text-primary-foreground hover:bg-primary-hover"
        >
          {fr.pro.space.dashboard}
        </Link>
      )}
      {(artisan.status === "valide" || artisan.status === "suspendu") && (
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-medium">{t.availability.title}</h2>
            <p className="text-muted-foreground">{t.availability.intro}</p>
          </div>
          <ButtonLink href="/pro/agenda/disponibilites" variant="outline" className="shrink-0">
            <CalendarDays aria-hidden="true" className="size-4" />
            {t.availability.manage}
          </ButtonLink>
        </Card>
      )}
      {artisan.status === "suspendu" && artisan.suspension_reason !== "documents_expires" && (
        <Alert tone="error">{t.status.suspendu}</Alert>
      )}
      {editable && canSubmit && (
        <Card>
          <h2 className="mb-2 text-lg font-medium">{t.submit.title}</h2>
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
