import { router } from "expo-router";
import { closeAuth } from "./navigation";
import { resumePendingRequest, sendScreenParams } from "./requests";

/**
 * Après une connexion avec Google ou Apple, ou « Finaliser mon compte » (ADR 0108) : une demande
 * commencée sans compte reprend à l'écran d'envoi (projet rattaché au compte), sinon on revient
 * là où l'on était.
 */
export async function continueAfterSignIn(): Promise<void> {
  const pending = await resumePendingRequest();
  if (pending) {
    router.replace({
      pathname: "/projet/[id]/envoyer",
      params: sendScreenParams(pending.projectId, pending.artisanIds, pending.lots),
    });
  } else {
    closeAuth();
  }
}
