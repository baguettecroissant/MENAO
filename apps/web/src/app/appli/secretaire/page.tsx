import type { Metadata } from "next";
import { AppSecretaryCall } from "@/components/pro/app-secretary-call";

export const metadata: Metadata = {
  title: "Essayer ma secrétaire — MENAO",
  robots: { index: false, follow: false },
};

/**
 * Essai de la secrétaire dans l'application (ADR 0362) : page intégrée à la rubrique
 * « Secrétaire » de l'application, qui lance l'appel d'essai. Statique : la session arrive de
 * l'application, jamais par l'adresse.
 */
export default function AppSecretaryCallPage() {
  return (
    <main className="flex flex-1 flex-col justify-center bg-surface p-3">
      <AppSecretaryCall />
    </main>
  );
}
