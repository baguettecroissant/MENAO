import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";
import { PageHero } from "./page-hero";

const LEGAL_PAGES = [
  { href: "/mentions-legales", label: fr.footer.legalNotice },
  { href: "/cgu", label: fr.footer.terms },
  { href: "/cgv-artisans", label: fr.footer.termsPro },
  { href: "/confidentialite", label: fr.footer.privacy },
  { href: "/cookies", label: fr.footer.cookies },
  { href: "/criteres-de-classement", label: fr.footer.ranking },
] as const;

export type LegalPath = (typeof LEGAL_PAGES)[number]["href"];

/**
 * Pages légales (F-03) : bandeau clair, sommaire des documents légaux et texte en colonne de
 * lecture. « draft » affiche la mention de version provisoire (textes en validation juridique).
 */
export function LegalPage({
  path,
  title,
  intro,
  draft = true,
  children,
}: {
  path: LegalPath;
  title: string;
  intro?: string;
  draft?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="bg-background">
      <PageHero
        id="legal-title"
        tone="soft"
        eyebrow={fr.legal.eyebrow}
        title={title}
        subtitle={intro}
        breadcrumbs={[{ label: fr.site.home, href: "/" }, { label: title }]}
      >
        {draft && (
          <span className="inline-flex items-center gap-1.5 self-start rounded-chip bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
            {fr.legal.draftBadge}
          </span>
        )}
      </PageHero>
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        <nav aria-label={fr.legal.navTitle} className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {fr.legal.navTitle}
          </p>
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible">
            {LEGAL_PAGES.map((page) => (
              <li key={page.href} className="shrink-0">
                <Link
                  href={page.href as Route}
                  aria-current={page.href === path ? "page" : undefined}
                  className="flex min-h-10 items-center rounded-pill border border-border bg-surface px-4 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:bg-primary-softer aria-[current=page]:font-medium aria-[current=page]:text-primary-strong lg:rounded-input lg:border-transparent lg:bg-transparent lg:whitespace-normal"
                >
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="flex max-w-3xl flex-col gap-8 rounded-card border border-border bg-surface p-6 text-[0.9375rem] leading-relaxed shadow-card sm:p-10">
          {children}
        </article>
      </div>
    </main>
  );
}

export function ContentSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-medium tracking-tight">{title}</h2>
      <div className="flex flex-col gap-3 text-foreground/90">{children}</div>
    </section>
  );
}

export function BulletList({
  items,
  ordered = false,
}: {
  items: readonly string[];
  ordered?: boolean;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <List className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={item} className="flex gap-3">
          <span
            aria-hidden="true"
            className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-medium text-primary-strong ${
              ordered ? "mt-0.5 size-6" : "mt-2 size-2"
            }`}
          >
            {ordered ? i + 1 : null}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </List>
  );
}
