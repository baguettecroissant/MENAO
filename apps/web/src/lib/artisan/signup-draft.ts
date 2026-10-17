"use client";

import {
  ARTISAN_SIGNUP_DRAFT_KEY,
  emptySignupDraft,
  parseSignupDraft,
  type ArtisanSignupDraft,
} from "@menao/core";
import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Brouillon de l'inscription artisan (ADR 0110), gardé dans le stockage local du navigateur :
 * l'artisan retrouve ses choix s'il revient plus tard, ou après la connexion avec Google ou Apple.
 * Rien d'autre n'y est gardé (jamais le mot de passe). Sans stockage (navigation privée,
 * stockage bloqué), le brouillon reste en mémoire le temps de la visite.
 */
let memory: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function readSnapshot(): string | null {
  try {
    return window.localStorage.getItem(ARTISAN_SIGNUP_DRAFT_KEY) ?? memory;
  } catch {
    return memory;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function write(draft: ArtisanSignupDraft) {
  memory = JSON.stringify(draft);
  try {
    window.localStorage.setItem(ARTISAN_SIGNUP_DRAFT_KEY, memory);
  } catch {
    // Stockage indisponible : le brouillon reste en mémoire.
  }
  notify();
}

export function clearSignupDraft() {
  memory = null;
  try {
    window.localStorage.removeItem(ARTISAN_SIGNUP_DRAFT_KEY);
  } catch {
    // Rien à effacer.
  }
  notify();
}

function parse(snapshot: string | null): ArtisanSignupDraft {
  if (snapshot === null) return emptySignupDraft();
  try {
    return parseSignupDraft(JSON.parse(snapshot));
  } catch {
    return emptySignupDraft();
  }
}

const noSubscribe = () => () => {};

/** Brouillon courant, sa mise à jour, et `ready` (faux au premier rendu, côté serveur). */
export function useSignupDraft() {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => null);
  const ready = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const draft = useMemo(() => parse(snapshot), [snapshot]);
  const update = useCallback(
    (patch: Partial<ArtisanSignupDraft>) => write({ ...parse(readSnapshot()), ...patch }),
    [],
  );
  return { draft, update, ready };
}
