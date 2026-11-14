"use client";

import { ONBOARDING_STEPS, type OnboardingStep } from "@menao/core";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding;

/**
 * En-tête du dossier (ADR 0111) : sur la page du dossier, son titre ; sur une étape, le nom de
 * l'étape et le retour au dossier. Remplace la barre des 8 étapes.
 */
export function OnboardingHeader({
  inProSpace,
  actions,
}: {
  /** Artisan validé : « Mon dossier » dans l'espace pro. */
  inProSpace: boolean;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const step = ONBOARDING_STEPS.find((s) => pathname.startsWith(`/pro/onboarding/${s.key}`))?.key;
  // Étapes refaites (lot 47) : titre complet et chapeau, comme les maquettes.
  const page = step ? t.stepPages[step] : undefined;
  const title = step
    ? (page?.title ?? t.steps[step as OnboardingStep])
    : inProSpace
      ? fr.pro.space.file
      : t.dossier.title;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
        {step ? (
          <Link
            href="/pro/onboarding"
            className={`inline-flex min-h-touch items-center gap-1.5 rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground ${focusRing}`}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t.dossier.back}
          </Link>
        ) : (
          <span />
        )}
        {actions}
      </div>
      <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{title}</h1>
      {page && <p className="text-base text-label">{page.lead}</p>}
    </div>
  );
}
