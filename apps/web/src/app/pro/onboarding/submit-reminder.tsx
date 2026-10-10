"use client";

import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding.submit;

/**
 * Rappel sur chaque étape quand les étapes 1 à 5 sont terminées : le dossier s'envoie depuis la
 * page d'accueil de l'onboarding (où le bouton d'envoi est déjà affiché).
 */
export function SubmitReminder() {
  const pathname = usePathname();
  if (pathname === "/pro/onboarding") return null;
  return (
    <div className="flex flex-col gap-3 rounded-card border border-primary bg-primary-softer p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-primary-strong">{t.ready}</p>
      <ButtonLink href="/pro/onboarding" size="sm" className="shrink-0 self-start sm:self-auto">
        {t.readyCta}
      </ButtonLink>
    </div>
  );
}
