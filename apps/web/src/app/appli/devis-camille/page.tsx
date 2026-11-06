import type { Metadata } from "next";
import { AppQuoteCall } from "@/components/pro/app-quote-call";

export const metadata: Metadata = {
  title: "Dicter avec Camille — MENAO",
  robots: { index: false, follow: false },
};

/**
 * Devis avec Camille dans l'application (ADR 0235) : page intégrée à l'éditeur de devis de
 * l'application, qui lance l'appel et lui renvoie les lignes. Statique : la session arrive de
 * l'application, jamais par l'adresse.
 */
export default function AppQuoteCallPage() {
  return (
    <main className="flex flex-1 flex-col justify-center bg-surface p-3">
      <AppQuoteCall />
    </main>
  );
}
