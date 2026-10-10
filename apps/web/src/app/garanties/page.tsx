import type { Metadata } from "next";
import { BulletList, ContentPage, ContentSection } from "@/components/site/content-page";
import { TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pages.guarantees;

export const metadata: Metadata = {
  title: `${t.title} — MENAO`,
  description: t.intro,
  alternates: { canonical: "/garanties" },
};

export default function GuaranteesPage() {
  return (
    <ContentPage title={t.title} intro={t.intro}>
      {t.sections.map((section) => (
        <ContentSection key={section.title} title={section.title}>
          <BulletList items={section.items} />
        </ContentSection>
      ))}
      <p>
        <TextLink href="/criteres-de-classement">{t.rankingLink}</TextLink>
      </p>
    </ContentPage>
  );
}
