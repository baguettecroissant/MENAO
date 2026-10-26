import { spaceExamplesShown } from "@menao/core";
import { useSyncExternalStore } from "react";
import { clearScreenCache, setScreenCachePersistence } from "./screen-cache";
import { supabase } from "./supabase";

/**
 * Mode exemples de l'application (ADR 0184) : l'espace pro rempli de demandes et de chantiers
 * fictifs, comme les pages « Découvrir mon espace » du site. Tant qu'il est actif, les écrans de
 * l'espace pro lisent les données d'exemple (example-data.ts) au lieu de la base, un bandeau orange
 * le rappelle et les boutons qui écriraient quelque chose sont inactifs. Rien n'est enregistré.
 */
let active = false;
const listeners = new Set<() => void>();

export function examplesActive(): boolean {
  return active;
}

/** Entre dans le mode exemples ou en sort ; les écrans repartent de zéro (cache vidé). */
export function setExamplesActive(on: boolean): void {
  if (active === on) return;
  active = on;
  // Les exemples ne sont jamais gardés sur le téléphone à la place des vraies données.
  setScreenCachePersistence(!on);
  clearScreenCache();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Mode exemples actif, relu à chaque changement. */
export function useExamplesActive(): boolean {
  return useSyncExternalStore(subscribe, examplesActive, examplesActive);
}

/**
 * Exemples dans l'espace d'un artisan validé : tant qu'il n'a reçu aucune demande ni aucun
 * chantier et qu'il ne les a pas masqués (même règle que le site, `spaceExamplesShown`). Jamais
 * pendant le mode exemples, où toutes les listes sont déjà des exemples.
 */
export async function loadSpaceExamplesShown(): Promise<boolean> {
  if (active) return false;
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return false;
  const [{ data: artisan }, { data: inbox }, { data: chantiers }] = await Promise.all([
    supabase
      .from("artisans")
      .select("status, examples_hidden_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.rpc("artisan_inbox"),
    supabase.rpc("artisan_chantiers"),
  ]);
  return (
    artisan?.status === "valide" &&
    spaceExamplesShown({
      requests: inbox?.length ?? 0,
      chantiers: chantiers?.length ?? 0,
      hiddenAt: artisan.examples_hidden_at,
    })
  );
}

/** « Masquer les exemples » : choix gardé sur la fiche, le même sur le site. */
export async function hideSpaceExamples(): Promise<boolean> {
  const { error } = await supabase.rpc("hide_space_examples");
  if (!error) clearScreenCache();
  return !error;
}
