import type { Metadata } from "next";
import { ContentSection, LegalPage } from "@/components/site/content-page";
import { fr } from "@/i18n/fr";

export const metadata: Metadata = {
  title: `${fr.legal.cgv} — MENAO`,
  alternates: { canonical: "/cgv-artisans" },
};

// TODO(legal) : publier la version validée par l'avocat avant le pilote (projet du 20/11/2026,
// ADR 0383) : essai de 2 mois à partir de la mise en ligne, engagement ferme d'un an à compter du
// premier paiement, reconduction tacite d'un an, arrêt au plus tard 3 mois avant l'échéance (en
// ligne ou par recommandé), aucune sortie anticipée, pénalités de retard, aucune garantie de
// demandes, rétractation de 14 jours pour une inscription faite en présence d'un commercial.
export default function Page() {
  return (
    <LegalPage path="/cgv-artisans" title={fr.legal.cgv}>
      <ContentSection title={fr.legal.draftTitle}>
        <p>{fr.legal.draftBody}</p>
      </ContentSection>
    </LegalPage>
  );
}
