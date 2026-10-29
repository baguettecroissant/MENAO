import type { Metadata } from "next";
import { ListPanel, ListRow } from "@/components/list-kit";
import { COMMERCIAL_GUIDE } from "@/content/commercial/guide";
import { fr } from "@/i18n/fr";

const t = fr.commercialSpace.guide;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/** Guide terrain des commerciaux (F-65, ADR 0205) : une rubrique par page, lisible au téléphone. */
export default function CommercialGuidePage() {
  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.intro}</p>
        </div>
        <ListPanel label={t.listLabel}>
          {COMMERCIAL_GUIDE.map((section) => (
            <ListRow
              key={section.slug}
              href={`/commercial/guide/${section.slug}`}
              title={section.title}
              detail={section.summary}
            />
          ))}
        </ListPanel>
      </div>
    </main>
  );
}
