import type { Metadata } from "next";
import { ContentSection, LegalPage } from "@/components/site/content-page";
import { fr } from "@/i18n/fr";

export const metadata: Metadata = {
  title: `${fr.legal.cgv} — MENAO`,
  alternates: { canonical: "/cgv-artisans" },
};

// TODO(legal) : publier la version validée par l'avocat avant le pilote.
export default function Page() {
  return (
    <LegalPage path="/cgv-artisans" title={fr.legal.cgv}>
      <ContentSection title={fr.legal.draftTitle}>
        <p>{fr.legal.draftBody}</p>
      </ContentSection>
    </LegalPage>
  );
}
