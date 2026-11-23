import {
  guideMinutesLeft,
  guideSteps,
  nextGuideStep,
  type GuideStep,
  type GuideStepKey,
} from "@menao/core";
import { router, type Href } from "expo-router";
import { loadDossier, type Dossier } from "./artisan-dossier";
import { PAYMENTS_OPEN } from "@menao/core";

/** Parcours guidé du dossier (ADR 0373, 0374), comme sur le site : mêmes étapes, même ordre. */
export type DossierGuide = {
  /** Dossier encore modifiable (brouillon, ou refusé à corriger) : le parcours guide l'artisan. */
  active: boolean;
  steps: GuideStep[];
  minutesLeft: number;
};

export function dossierGuide(dossier: Dossier): DossierGuide {
  const kbisFromRegistry = dossier.documents.some(
    (doc) => doc.type === "kbis" && doc.source === "registre" && doc.status === "valide",
  );
  // Pas d'étape « formule » dans l'application : aucun achat d'abonnement (règle 10).
  const steps = guideSteps(dossier.snapshot, {
    kbisFromRegistry,
    withPlan: false,
    // Paiements fermés jusqu'au lancement (ADR 0387).
    withPayments: PAYMENTS_OPEN,
  });
  return {
    // Jusqu'à la validation (ADR 0376) : les attestations et les paiements suivent l'envoi.
    active:
      dossier.status === "brouillon" ||
      dossier.status === "refuse" ||
      dossier.status === "en_verification",
    steps,
    minutesLeft: guideMinutesLeft(steps),
  };
}

/** Écran d'une étape. */
export function guideHref(key: GuideStepKey): Href {
  if (key === "entreprise") return "/pro-entreprise";
  if (key === "metiers") return "/pro-metiers";
  if (key === "zone") return "/pro-zone";
  if (key === "charte") return "/pro-charte";
  if (key === "profil") return "/pro-profil-public";
  // Les trois attestations (ADR 0376) : la liste des documents, en attendant leur écran à trois.
  if (key === "attestations") return "/pro-documents";
  if (key === "paiements") return "/pro-paiements";
  // Jamais proposée par le parcours de l'application (règle 10) : retour au dossier.
  if (key === "formule") return "/pro";
  return { pathname: "/pro-document", params: { type: key } };
}

/**
 * Après une étape : ouvre la suivante qui reste à faire, à la place de l'écran en cours (le retour
 * mène alors à « Mon dossier »). `false` s'il n'y a pas de suite — fin du parcours, ou dossier déjà
 * envoyé : l'écran appelant revient en arrière.
 */
export async function openNextStep(after: GuideStepKey | null): Promise<boolean> {
  const dossier = await loadDossier();
  if (!dossier) return false;
  const guide = dossierGuide(dossier);
  const next = guide.active ? nextGuideStep(guide.steps, after) : null;
  if (!next) return false;
  router.replace(guideHref(next));
  return true;
}
