import type { Metadata } from "next";
import { ContentPage } from "@/components/site/content-page";
import { Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { ContactForm } from "./contact-form";

const t = fr.pages.contact;

export const metadata: Metadata = {
  title: `${t.title} — MENAO`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <ContentPage title={t.title} intro={t.intro}>
      <p className="rounded-card bg-primary-soft p-4">{t.projectHint}</p>
      <Card>
        <ContactForm />
      </Card>
    </ContentPage>
  );
}
