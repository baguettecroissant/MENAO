import type { Metadata } from "next";
import {
  ArrowRight,
  ClipboardList,
  HardHat,
  MessageCircle,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { FaqJsonLd, FaqList, type FaqItem } from "@/components/site/faq-list";
import { PageHero } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pages.faq;
const CATEGORIES: {
  id: string;
  icon: LucideIcon;
  title: string;
  items: readonly FaqItem[];
}[] = [
  { id: "projet", icon: ClipboardList, ...t.project },
  { id: "paiements", icon: Wallet, ...t.payments },
  { id: "confiance", icon: ShieldCheck, ...t.trust },
  { id: "artisans", icon: HardHat, ...t.pros },
];

export const metadata: Metadata = {
  title: `${t.title} — MENAO`,
  description: t.metaDescription,
  alternates: { canonical: "/faq" },
};

/** Questions fréquentes (F-03), classées par thème, avec données structurées FAQPage. */
export default function FaqPage() {
  return (
    <main className="bg-background">
      <PageHero
        id="faq-title"
        eyebrow={t.eyebrow}
        title={t.heroTitle}
        accent={t.heroAccent}
        subtitle={t.intro}
        breadcrumbs={[{ label: fr.site.home, href: "/" }, { label: t.title }]}
      />
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        <nav aria-label={t.categoriesLabel} className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {t.categoriesLabel}
          </p>
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <li key={category.id} className="shrink-0">
                  <a
                    href={`#${category.id}`}
                    className="flex min-h-10 items-center gap-2.5 rounded-pill border border-border bg-surface px-4 text-sm whitespace-nowrap hover:border-primary/40 hover:text-primary-strong lg:rounded-input lg:border-transparent lg:bg-transparent lg:px-3 lg:hover:bg-surface"
                  >
                    <Icon aria-hidden="true" className="size-4 text-primary" />
                    {category.title}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex min-w-0 flex-col gap-12">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <section
                key={category.id}
                id={category.id}
                aria-labelledby={`faq-${category.id}`}
                className="flex scroll-mt-24 flex-col gap-4"
              >
                <h2
                  id={`faq-${category.id}`}
                  className="flex items-center gap-3 text-2xl font-medium tracking-tight"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-surface text-primary shadow-card">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  {category.title}
                </h2>
                <FaqList items={category.items} />
              </section>
            );
          })}
          <section
            aria-labelledby="faq-contact"
            className="flex flex-col items-start gap-5 rounded-hero bg-primary-soft p-6 sm:flex-row sm:items-center sm:p-8"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface text-primary shadow-card">
              <MessageCircle aria-hidden="true" className="size-6" />
            </span>
            <div className="flex flex-1 flex-col gap-1">
              <h2 id="faq-contact" className="text-lg font-medium">
                {t.contactTitle}
              </h2>
              <p className="text-sm text-foreground/80">{t.contactText}</p>
            </div>
            <ButtonLink href="/contact" size="lg" className="shrink-0">
              {t.contactCta}
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          </section>
        </div>
      </div>
      <FaqJsonLd items={CATEGORIES.flatMap((category) => category.items)} />
    </main>
  );
}
