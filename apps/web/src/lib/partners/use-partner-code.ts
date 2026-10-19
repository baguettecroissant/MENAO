"use client";

import { normalizePartnerCode } from "@menao/core";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Code partenaire de l'adresse (`?p=…`, F-59, ADR 0136) : lu dans l'adresse de la page, jamais gardé
 * dans le navigateur (aucun traceur). Vide pendant le rendu serveur.
 */
export function usePartnerCode(): string | null {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  return normalizePartnerCode(new URLSearchParams(search).get("p"));
}
