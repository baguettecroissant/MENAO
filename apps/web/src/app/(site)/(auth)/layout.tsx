import type { ReactNode } from "react";
import { appTheme } from "@/lib/fonts";

/**
 * Connexion, inscription, mot de passe oublié et vérification de l'e-mail : polices Inter et
 * présentation « Nette » (refonte, ADR 0258), sous l'en-tête du site.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className={`${appTheme} flex flex-1 flex-col`}>{children}</div>;
}
