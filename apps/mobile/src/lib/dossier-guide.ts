import {
  guideMinutesLeft,
  guideSteps,
  nextGuideStep,
  type GuideStep,
  type GuideStepKey,
} from "@menao/core";
import { router, type Href } from "expo-router";
import { loadDossier, type Dossier } from "./artisan-dossier";

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
  const steps = guideSteps(dossier.snapshot, { kbisFromRegistry });
  return {
    active: dossier.status === "brouillon" || dossier.status === "refuse",
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
