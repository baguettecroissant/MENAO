import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideBody } from "@/components/site/guide-body";
import { COMMERCIAL_GUIDE } from "@/content/commercial/guide";
import { fr } from "@/i18n/fr";

const t = fr.commercialSpace.guide;

export async function generateMetadata({
  params,
}: PageProps<"/commercial/guide/[section]">): Promise<Metadata> {
  const { section } = await params;
  const found = COMMERCIAL_GUIDE.find((s) => s.slug === section);
  return { title: `${found?.title ?? t.title} — MENAO`, robots: { index: false } };
}

/** Une rubrique du guide terrain (ADR 0205), avec la rubrique précédente et la suivante. */
export default async function CommercialGuideSectionPage({
  params,
}: PageProps<"/commercial/guide/[section]">) {
  const { section } = await params;
  const index = COMMERCIAL_GUIDE.findIndex((s) => s.slug === section);
  const current = COMMERCIAL_GUIDE[index];
  if (!current) notFound();
  const previous = COMMERCIAL_GUIDE[index - 1];
  const next = COMMERCIAL_GUIDE[index + 1];

  return (
    <main className="bg-background">
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
        <Link
          href="/commercial/guide"
          className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{current.title}</h1>
          <p className="text-muted-foreground">{current.summary}</p>
        </div>
        <GuideBody blocks={current.body} />
        <nav
          aria-label={t.listLabel}
          className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between"
        >
          {previous ? (
            <Link
              href={`/commercial/guide/${previous.slug}`}
              className="flex flex-col gap-0.5 rounded-card border border-border bg-surface px-4 py-3 hover:bg-background"
            >
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                {t.previous}
              </span>
              <span className="font-medium">{previous.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/commercial/guide/${next.slug}`}
              className="flex flex-col gap-0.5 rounded-card border border-border bg-surface px-4 py-3 text-right hover:bg-background"
            >
              <span className="inline-flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                {t.next}
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </span>
              <span className="font-medium">{next.title}</span>
            </Link>
          )}
        </nav>
      </article>
    </main>
  );
}
