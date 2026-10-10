import type { Metadata } from "next";
import Link from "next/link";
import { BulletList, ContentPage, ContentSection } from "@/components/site/content-page";
import { fr } from "@/i18n/fr";

const t = fr.pages.howItWorks;

export const metadata: Metadata = {
  title: `${t.title} — MENAO`,
  description: t.intro,
  alternates: { canonical: "/comment-ca-marche" },
};

export default function HowItWorksPage() {
  return (
    <ContentPage title={t.title} intro={t.intro}>
      <ContentSection title={t.clientTitle}>
        <BulletList items={t.client} ordered />
        <Link
          href="/"
          className="inline-flex min-h-touch items-center justify-center self-start rounded-button bg-primary px-6 font-medium text-primary-foreground hover:bg-primary-hover"
        >
          {t.cta}
        </Link>
      </ContentSection>
      <ContentSection title={t.proTitle}>
        <BulletList items={t.pro} ordered />
        <Link
          href="/pro"
          className="inline-flex min-h-touch items-center justify-center self-start rounded-button border border-border bg-surface px-6 font-medium"
        >
          {t.ctaPro}
        </Link>
      </ContentSection>
    </ContentPage>
  );
}
