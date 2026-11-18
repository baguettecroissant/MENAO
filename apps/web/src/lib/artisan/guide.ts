import "server-only";
import {
  guideMinutesLeft,
  guideStepPath,
  guideSteps,
  nextGuideStep,
  previousGuideStep,
  type GuideStep,
  type GuideStepKey,
} from "@menao/core";
import type { Route } from "next";
import type { OnboardingContext } from "./context";

/** Parcours guidé du dossier (ADR 0373), pour l'artisan connecté. */
export type Guide = {
  /** Dossier encore modifiable (brouillon, ou refusé à corriger) : le parcours guide l'artisan. */
  active: boolean;
  steps: GuideStep[];
  minutesLeft: number;
};

export function guideFromContext(
  context: Pick<OnboardingContext, "artisan" | "documents" | "snapshot">,
): Guide {
  const kbisFromRegistry = context.documents.some(
    (doc) => doc.type === "kbis" && doc.source === "registre" && doc.status === "valide",
  );
  const steps = guideSteps(context.snapshot, { kbisFromRegistry });
  return {
    active: context.artisan.status === "brouillon" || context.artisan.status === "refuse",
    steps,
    minutesLeft: guideMinutesLeft(steps),
  };
}

/** « Étape suivante » : la route calcule où aller après `after` (ou la première étape à faire). */
export function suiteHref(after?: GuideStepKey): Route {
  return (after ? `/pro/onboarding/suite?apres=${after}` : "/pro/onboarding/suite") as Route;
}

/** Ce que la barre du bas d'une étape annonce : l'étape d'avant, et celle qui suit. */
export function guideAround(guide: Guide, key: GuideStepKey) {
  const previous = previousGuideStep(guide.steps, key);
  return {
    backHref: (previous ? guideStepPath(previous) : "/pro/onboarding") as Route,
    next: nextGuideStep(guide.steps, key),
  };
}
