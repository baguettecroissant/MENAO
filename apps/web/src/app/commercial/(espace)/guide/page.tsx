import { BookOpen, ChevronRight, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { COMMERCIAL_GUIDE } from "@/content/commercial/guide";
import { fr } from "@/i18n/fr";

const t = fr.commercialSpace.guide;
const training = fr.commercialTraining.guideRow;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * Guide terrain des commerciaux (F-65, ADR 0205) : une rubrique par page, lisible au téléphone ;
 * en tête, le simulateur d'entraînement (ADR 0224).
 */
export default function CommercialGuidePage() {
  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
            {t.title}
          </h1>
          <p className="max-w-3xl text-[0.9375rem] text-label sm:text-base">{t.intro}</p>
        </div>
        {/* Refonte « Nette » (ADR 0260) : l'entraînement en grande carte, les rubriques en cartes. */}
        <ul aria-label={training.label}>
          <li>
            <Link
              href="/commercial/guide/entrainement"
              className="flex items-center gap-4 rounded-[1.125rem] bg-foreground p-5 text-white hover:opacity-95 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none sm:p-6"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-[0.875rem] bg-white/12">
                <Sparkles aria-hidden="true" className="size-6" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-display text-lg font-bold sm:text-xl">{training.title}</span>
                <span className="text-sm text-white/80">{training.detail}</span>
              </span>
              <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
            </Link>
          </li>
        </ul>
        <nav aria-label={t.listLabel}>
          <ul aria-label={t.listLabel} className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {COMMERCIAL_GUIDE.map((section) => (
              <li key={section.slug}>
                <Link
                  href={`/commercial/guide/${section.slug}`}
                  className="flex h-full flex-col gap-2.5 rounded-card border border-border bg-surface p-5 shadow-card hover:border-foreground/30 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
                >
                  <span className="flex size-10 items-center justify-center rounded-input bg-primary-soft text-primary-strong">
                    <BookOpen aria-hidden="true" className="size-5" />
                  </span>
                  <span className="font-bold">{section.title}</span>
                  <span className="text-sm text-muted-foreground">{section.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
