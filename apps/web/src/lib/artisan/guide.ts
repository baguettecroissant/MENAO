import "server-only";
import {
  connectAccountStatus,
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
import { paymentsOpen } from "@/lib/launch";

/** Parcours guidé de l'inscription (ADR 0373, 0376), pour l'artisan connecté. */
export type Guide = {
  /**
   * Artisan pas encore validé (brouillon, dossier envoyé, ou refusé à corriger) : le parcours le
   * guide jusqu'à la mise en ligne, formule, attestations et paiements compris.
   */
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
  const { artisan } = context;
  const connect = connectAccountStatus({
    hasAccount: artisan.stripe_account_id !== null,
    chargesEnabled: artisan.connect_charges_enabled,
    detailsSubmitted: artisan.connect_details_submitted,
    requirementsDue: artisan.connect_requirements_due,
    requirementsPending: artisan.connect_requirements_pending,
    disabledReason: artisan.connect_disabled_reason,
  });
  const steps = guideSteps(context.snapshot, {
    kbisFromRegistry,
    // Compte transmis à Stripe, qui le vérifie : l'étape est faite côté artisan.
    paymentsStarted: connect === "verification" || connect === "actif",
    // Paiements fermés jusqu'au lancement (ADR 0387) : formule et paiements hors du parcours.
    withPayments: paymentsOpen,
  });
  return {
    active:
      artisan.status === "brouillon" ||
      artisan.status === "refuse" ||
      artisan.status === "en_verification",
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
