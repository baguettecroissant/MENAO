import { Check } from "lucide-react";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";

const t = fr.pro.onboarding.dossier.essai.validated;

/** Compte d'essai validé tout de suite à l'envoi (lot 82, ADR 0392), à la place de « Dossier envoyé ». */
export default async function TestValidatedPage() {
  const { artisan } = await getOnboardingContext();
  if (!artisan.compte_essai || artisan.status !== "valide") redirect("/pro/onboarding");
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 text-center">
      <span className="flex size-18 items-center justify-center rounded-full bg-success-soft text-success">
        <Check aria-hidden="true" className="size-9" strokeWidth={3} />
      </span>
      <h1 className="text-3xl tracking-tight">{t.title}</h1>
      <p className="text-[0.9375rem] text-label">{t.text}</p>
      <div className="flex w-full flex-col gap-2 rounded-card bg-violet-soft p-4 text-left text-sm text-violet">
        <b>{t.fictiveTitle}</b>
        <ul className="flex list-disc flex-col gap-1 pl-4">
          {t.fictive.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <ButtonLink href="/pro/tableau-de-bord" size="lg" block className="!rounded-pill">
        {t.cta}
      </ButtonLink>
    </div>
  );
}
