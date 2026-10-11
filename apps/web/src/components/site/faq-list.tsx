import { Plus } from "lucide-react";
import { frenchSpacing } from "@/lib/site/typography";

export type FaqItem = { readonly q: string; readonly a: string };

/** Questions fréquentes en accordéon (balises natives details/summary, sans JavaScript). */
export function FaqList({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="flex flex-col divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-card">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium marker:hidden hover:bg-background focus-visible:bg-background focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            {frenchSpacing(item.q)}
            <Plus
              aria-hidden="true"
              className="size-5 shrink-0 text-primary transition-transform group-open:rotate-45"
            />
          </summary>
          <p className="px-5 pb-5 text-sm leading-relaxed text-pretty text-muted-foreground">
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}

/** Données structurées FAQPage (texte statique de l'application, sans donnée utilisateur). */
export function FaqJsonLd({ items }: { items: readonly FaqItem[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}
