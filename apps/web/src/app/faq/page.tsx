import type { Metadata } from "next";
import { ContentPage } from "@/components/site/content-page";
import { fr } from "@/i18n/fr";

const t = fr.pages.faq;

export const metadata: Metadata = {
  title: `${t.title} — MENAO`,
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  return (
    <ContentPage title={t.title}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="flex flex-col gap-3">
        {t.items.map((item) => (
          <details key={item.q} className="rounded-card border border-border bg-surface p-4">
            <summary className="cursor-pointer font-semibold">{item.q}</summary>
            <p className="mt-2 text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </ContentPage>
  );
}
