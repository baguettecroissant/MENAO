import type { Metadata } from "next";
import { ContentSection, LegalPage } from "@/components/site/content-page";
import { fr } from "@/i18n/fr";

export const metadata: Metadata = {
  title: `${fr.legal.privacy} — MENAO`,
  alternates: { canonical: "/confidentialite" },
};

// TODO(legal) : publier la version validée par l'avocat avant le pilote.
export default function Page() {
  return (
    <LegalPage path="/confidentialite" title={fr.legal.privacy}>
      <ContentSection title={fr.legal.draftTitle}>
        <p>{fr.legal.draftBody}</p>
      </ContentSection>
    </LegalPage>
  );
}
