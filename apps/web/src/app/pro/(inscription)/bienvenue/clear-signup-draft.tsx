"use client";

import { useEffect } from "react";
import { clearSignupDraft } from "@/lib/artisan/signup-draft";

/** Compte créé : le brouillon de l'inscription (ADR 0110) ne sert plus. */
export function ClearSignupDraft() {
  useEffect(() => {
    clearSignupDraft();
  }, []);
  return null;
}
