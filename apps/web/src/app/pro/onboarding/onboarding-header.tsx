"use client";

import {
  ONBOARDING_STEPS,
  guidePosition,
  guideStepPath,
  isGuideStepKey,
  previousGuideStep,
  type GuideStep,
  type GuideStepKey,
  type HelpVideoId,
  type OnboardingStep,
} from "@menao/core";
import { ArrowLeft, ListChecks } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { HelpVideo } from "@/components/pro/help-video";
import { focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding;
const g = t.guide;

// Vidéo de chaque étape (les documents ont la leur dans « Où trouver ce document ? »).
const STEP_VIDEOS: Partial<Record<OnboardingStep, HelpVideoId>> = {
  entreprise: "v02-entreprise",
  metiers: "v03-metiers-zone",
  zone: "v03-metiers-zone",
  charte: "v04-charte",
  profil: "v10-profil",
};

/** Parcours guidé (ADR 0373), transmis par la mise en page tant que le dossier se remplit. */
export type GuideHeader = {
  steps: GuideStep[];
  minutesLeft: number;
  /** Tout est fait : « Mon dossier » devient le récapitulatif avant l'envoi. */
  ready: boolean;
};

/**
 * En-tête du dossier (ADR 0111) : sur la page du dossier, son titre ; sur une étape, le nom de
 * l'étape et le retour au dossier. Pendant le parcours guidé (ADR 0373) : l'étape précédente,
 * l'avancement « Étape 2 sur 6 », le temps restant et « Mon dossier ».
 */
export function OnboardingHeader({
  inProSpace,
  actions,
  guide,
}: {
  /** Artisan validé : « Mon dossier » dans l'espace pro. */
  inProSpace: boolean;
  actions?: ReactNode;
  guide?: GuideHeader;
}) {
  const pathname = usePathname();
  const type = useSearchParams().get("type");
  const step = ONBOARDING_STEPS.find((s) => pathname.startsWith(`/pro/onboarding/${s.key}`))?.key;
  // « Dossier envoyé » a son propre titre.
  if (pathname.startsWith("/pro/onboarding/envoye")) return null;
  const guideKey: GuideStepKey | null = !guide
    ? null
    : step === "documents"
      ? isGuideStepKey(type)
        ? type
        : null
      : isGuideStepKey(step)
        ? step
        : null;
  const position = guide && guideKey ? guidePosition(guide.steps, guideKey) : null;
  // La charte à signer se lit partie par partie, avec son propre avancement.
  if (guide && guideKey === "charte" && !guide.steps.find((s) => s.key === "charte")?.done)
    return null;

  // Étapes refaites (lot 47) : titre complet et chapeau, comme les maquettes.
  const page = step ? t.stepPages[step] : undefined;
  const document = step === "documents" && guideKey && position ? guideKey : null;
  const title = document
    ? t.documents.types[document as keyof typeof t.documents.types]
    : step
      ? (page?.title ?? t.steps[step as OnboardingStep])
      : inProSpace
        ? fr.pro.space.file
        : guide?.ready
          ? g.readyTitle
          : t.dossier.title;
  const previous = guide && guideKey ? previousGuideStep(guide.steps, guideKey) : null;

  return (
    <div className="flex flex-col gap-2">
      {guide && guideKey && position ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <Link
              href={(previous ? guideStepPath(previous) : "/pro/onboarding") as Route}
              aria-label={g.back}
              className={`flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong transition-colors hover:bg-primary-soft/70 ${focusRing}`}
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </Link>
            <div
              role="progressbar"
              aria-label={g.progressLabel}
              aria-valuemin={1}
              aria-valuemax={position.total}
              aria-valuenow={position.index}
              className="flex min-w-0 flex-1 gap-1.5"
            >
              {guide.steps.map((s, i) => (
                <span
                  key={s.key}
                  className={`h-1.5 flex-1 rounded-pill ${
                    i < position.index ? "bg-foreground" : "bg-border-strong/60"
                  }`}
                />
              ))}
            </div>
            <Link
              href="/pro/onboarding"
              className={`inline-flex min-h-touch shrink-0 items-center gap-1.5 rounded-sm text-sm font-semibold text-primary-strong underline-offset-2 hover:underline ${focusRing}`}
            >
              <ListChecks aria-hidden="true" className="size-4" />
              {g.dossier}
            </Link>
          </div>
          <div className="flex flex-wrap justify-between gap-x-4 text-[0.8125rem] font-semibold text-muted-foreground">
            <span>{g.step(position.index, position.total, g.names[guideKey])}</span>
            {guide.minutesLeft > 0 && <span>{g.left(guide.minutesLeft)}</span>}
          </div>
        </div>
      ) : (
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
      )}
      <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{title}</h1>
      {page && !document && <p className="text-base text-label">{page.lead}</p>}
      {/* Vidéo de l'étape pendant l'inscription (ADR 0349). */}
      {step && STEP_VIDEOS[step] && !inProSpace && (
        <div className="mt-2 max-w-md">
          <HelpVideo id={STEP_VIDEOS[step]} />
        </div>
      )}
    </div>
  );
}
