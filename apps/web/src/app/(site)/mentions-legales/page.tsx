import type { Metadata } from "next";
import { BulletList, ContentSection, LegalPage } from "@/components/site/content-page";
import { fr } from "@/i18n/fr";

const t = fr.pages.legalNotice;

export const metadata: Metadata = {
  title: `${t.title} — MENAO`,
  alternates: { canonical: "/mentions-legales" },
};

// TODO(legal) : informations de l'éditeur à compléter et texte à faire valider par l'avocat.
export default function LegalNoticePage() {
  return (
    <LegalPage path="/mentions-legales" title={t.title}>
      <ContentSection title={t.editorTitle}>
        <p>{t.editor}</p>
      </ContentSection>
      <ContentSection title={t.directorTitle}>
        <p>{t.director}</p>
      </ContentSection>
      <ContentSection title={t.hostTitle}>
        <BulletList items={t.host} />
      </ContentSection>
    </LegalPage>
  );
}
