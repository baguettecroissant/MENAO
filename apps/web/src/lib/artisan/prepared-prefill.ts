"use client";

import { useSyncExternalStore } from "react";

/**
 * Coordonnées d'une inscription préparée par un conseiller (ADR 0395) : gardées dans le navigateur
 * de l'artisan le temps de finir son inscription, pour pré-remplir l'étape « compte ». Jamais dans
 * l'adresse de la page. Effacées avec le brouillon d'inscription.
 */
export const PREPARED_PREFILL_KEY = "menao_inscription_preparee";

export type PreparedPrefill = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
};

export function savePreparedPrefill(prefill: PreparedPrefill) {
  try {
    window.localStorage.setItem(PREPARED_PREFILL_KEY, JSON.stringify(prefill));
  } catch {
    // Stockage indisponible : l'artisan saisira ses coordonnées.
  }
}

export function clearPreparedPrefill() {
  try {
    window.localStorage.removeItem(PREPARED_PREFILL_KEY);
  } catch {
    // Rien à effacer.
  }
}

function read(): string | null {
  try {
    return window.localStorage.getItem(PREPARED_PREFILL_KEY);
  } catch {
    return null;
  }
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 254) : null);
const noSubscribe = () => () => {};

/** Coordonnées préparées, ou null (rendu serveur, rien de préparé). */
export function usePreparedPrefill(): PreparedPrefill | null {
  const raw = useSyncExternalStore(noSubscribe, read, () => null);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    return {
      firstName: str(v.firstName),
      lastName: str(v.lastName),
      email: str(v.email),
      phone: str(v.phone),
    };
  } catch {
    return null;
  }
}
