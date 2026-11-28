"use client";

import { useEffect } from "react";
import { markHomeScreen } from "@/lib/commercial/onboarding-actions";

const KEY = "menao_ecran_accueil";

/**
 * Étape « MENAO sur l'écran d'accueil » (ADR 0394) : quand l'espace s'ouvre en plein écran depuis
 * l'icône, on le note une fois (le navigateur s'en souvient ensuite). Rien n'est lu d'autre.
 */
export function HomeScreenDetector({ done }: { done: boolean }) {
  useEffect(() => {
    if (done) return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {
      // Stockage indisponible : on enregistre quand même, la base ignore les doublons.
    }
    void markHomeScreen().then(() => {
      try {
        localStorage.setItem(KEY, "1");
      } catch {
        // Rien à garder : le prochain lancement réessaiera.
      }
    });
  }, [done]);
  return null;
}
