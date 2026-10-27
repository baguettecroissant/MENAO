import type { Metadata } from "next";
import { ContentSection, LegalPage } from "@/components/site/content-page";
import { fr } from "@/i18n/fr";

export const metadata: Metadata = {
  title: `${fr.legal.cgv} — MENAO`,
  alternates: { canonical: "/cgv-artisans" },
};

// TODO(legal) : publier la version validée par l'avocat avant le pilote. À y prévoir (ADR 0200) :
// paiement au mois sans engagement ou à l'année payée d'avance (2 mois offerts), engagement de 12 mois
// à partir du premier paiement après l'essai, garantie (moins de 4 demandes 2 mois de suite, ou
// activité cessée : sortie sans frais et remboursement des mois non utilisés), renouvellement de
// l'année et préavis, rétractation de 14 jours pour les inscriptions hors établissement
// (art. L221-3 du code de la consommation).
export default function Page() {
  return (
    <LegalPage path="/cgv-artisans" title={fr.legal.cgv}>
      <ContentSection title={fr.legal.draftTitle}>
        <p>{fr.legal.draftBody}</p>
      </ContentSection>
    </LegalPage>
  );
}
