import type { ReactNode } from "react";

/**
 * Back-office (ADR 0034, 0035) : sans l'en-tête ni le pied de page du site. Les pages de travail
 * ont le menu latéral (groupe (app)) ; l'activation de la double authentification a son en-tête.
 */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-col bg-background">{children}</div>;
}
