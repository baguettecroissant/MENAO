import type { Metadata } from "next";
import { BulletList, ContentPage } from "@/components/site/content-page";
import { fr } from "@/i18n/fr";

const t = fr.pages.cookies;

export const metadata: Metadata = {
  title: `${t.title} — MENAO`,
  alternates: { canonical: "/cookies" },
};

// TODO(legal) : texte à faire valider par l'avocat. Un bandeau de consentement sera ajouté avant
// tout cookie non indispensable (mesure d'audience PostHog), refus aussi simple que l'acceptation.
export default function CookiesPage() {
  return (
    <ContentPage title={t.title} intro={t.intro}>
      <BulletList items={t.items} />
      <p>{t.monitoring}</p>
      <p className="text-sm text-muted-foreground">{t.draft}</p>
    </ContentPage>
  );
}
