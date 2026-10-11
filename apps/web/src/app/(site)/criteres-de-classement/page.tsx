import type { Metadata } from "next";
import { BulletList, ContentSection, LegalPage } from "@/components/site/content-page";
import { fr } from "@/i18n/fr";

const t = fr.ranking;

export const metadata: Metadata = {
  title: `${t.title} — MENAO`,
  alternates: { canonical: "/criteres-de-classement" },
};

// TODO(legal) : texte à faire valider par l'avocat (information sur le classement des offres,
// art. L111-7 du Code de la consommation ; contrôle des avis, art. L111-7-2).
export default function RankingPage() {
  return (
    <LegalPage path="/criteres-de-classement" title={t.title} intro={t.intro}>
      <ContentSection title={t.selectionTitle}>
        <BulletList items={t.selection} />
      </ContentSection>
      <ContentSection title={t.orderTitle}>
        <BulletList items={t.order} ordered />
        <p>{t.limit}</p>
      </ContentSection>
      <ContentSection title={t.paidTitle}>
        <p>{t.paid}</p>
      </ContentSection>
      <ContentSection title={t.reviewsTitle}>
        <p>{t.reviews}</p>
      </ContentSection>
      <p className="text-sm text-muted-foreground">{t.updated}</p>
    </LegalPage>
  );
}
