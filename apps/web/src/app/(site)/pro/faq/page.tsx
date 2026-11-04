import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  ClipboardCheck,
  FileSignature,
  HelpCircle,
  Inbox,
  MapPin,
  MessageCircle,
  Settings,
  Smartphone,
  Star,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { ProAssistant } from "@/components/pro-landing/pro-assistant";
import { FaqJsonLd, FaqList, type FaqItem } from "@/components/site/faq-list";
import { PageHero } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pro.faqPage;
// Une icône par thème, dans l'ordre des thèmes ; la dernière sert au-delà.
const ICONS: LucideIcon[] = [
  BadgeCheck,
  Wallet,
  Inbox,
  FileSignature,
  CalendarCheck,
  ClipboardCheck,
  Star,
  MapPin,
  Smartphone,
  Settings,
  HelpCircle,
];

/** Thèmes de la page : l'essentiel (FAQ de /pro), puis les questions détaillées. */
const CATEGORIES: { id: string; title: string; items: readonly FaqItem[] }[] = [
  { id: "essentiel", title: t.essentials, items: fr.pro.landing.faq },
  ...t.groups.map((group) => ({ id: group.id, title: group.title, items: group.items })),
];

export const metadata: Metadata = {
  title: `${t.title} — MENAO`,
  description: t.metaDescription,
  alternates: { canonical: "/pro/faq" },
};

/**
 * Questions fréquentes des artisans (F-69, ADR 0218) : toutes les réponses publiées pour les
 * pros, classées par thème, avec données structurées FAQPage. Même texte que celui de
 * l'assistant des pages Pro (/assistant-pro.txt).
 */
export default function ProFaqPage() {
  return (
    <main className="bg-background">
      <PageHero
        id="pro-faq-title"
        eyebrow={t.eyebrow}
        title={t.heroTitle}
        accent={t.heroAccent}
        subtitle={t.intro}
        breadcrumbs={[
          { label: fr.site.home, href: "/" },
          { label: fr.nav.pro, href: "/pro" },
          { label: t.title },
        ]}
      />
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
        <nav aria-label={t.categoriesLabel} className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {t.categoriesLabel}
          </p>
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible">
            {CATEGORIES.map((category, index) => {
              const Icon = ICONS[Math.min(index, ICONS.length - 1)] ?? HelpCircle;
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
          {CATEGORIES.map((category, index) => {
            const Icon = ICONS[Math.min(index, ICONS.length - 1)] ?? HelpCircle;
            return (
              <section
                key={category.id}
                id={category.id}
                aria-labelledby={`pro-faq-${category.id}`}
                className="flex scroll-mt-24 flex-col gap-4"
              >
                <h2
                  id={`pro-faq-${category.id}`}
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
            aria-labelledby="pro-faq-contact"
            className="flex flex-col items-start gap-5 rounded-hero bg-primary-soft p-6 sm:flex-row sm:items-center sm:p-8"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface text-primary shadow-card">
              <MessageCircle aria-hidden="true" className="size-6" />
            </span>
            <div className="flex flex-1 flex-col gap-1">
              <h2 id="pro-faq-contact" className="text-lg font-medium">
                {t.contactTitle}
              </h2>
              <p className="text-sm text-foreground/80">{t.contactText}</p>
            </div>
            <ButtonLink href="/pro/inscription" size="lg" className="shrink-0">
              {fr.pro.landing.hero.signUp}
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          </section>
        </div>
      </div>
      <FaqJsonLd items={CATEGORIES.flatMap((category) => category.items)} />
      <ProAssistant />
    </main>
  );
}
