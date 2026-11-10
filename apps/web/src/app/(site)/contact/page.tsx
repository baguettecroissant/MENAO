import type { Metadata, Route } from "next";
import Link from "next/link";
import { ArrowRight, CircleHelp, HardHat, Mail, Search, TriangleAlert } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { fr } from "@/i18n/fr";
import { ContactForm } from "./contact-form";

const t = fr.pages.contact;
const HELP = [
  { icon: CircleHelp, href: "/faq", ...t.help.faq },
  { icon: TriangleAlert, href: "/mon-espace", ...t.help.chantier },
  { icon: Search, href: "/recherche", ...t.help.project },
  { icon: HardHat, href: "/pro", ...t.help.pro },
];

export const metadata: Metadata = {
  title: `${t.title} — MENAO`,
  description: t.intro,
  alternates: { canonical: "/contact" },
};

/**
 * Contact (F-03, refonte ADR 0276) : les raccourcis vers les bonnes ressources d'abord, puis le
 * formulaire (ticket sans compte).
 */
export default function ContactPage() {
  return (
    <main className="bg-background">
      <PageHero
        id="contact-title"
        eyebrow={t.eyebrow}
        title={t.heroTitle}
        accent={t.heroAccent}
        subtitle={t.intro}
        breadcrumbs={[{ label: fr.site.home, href: "/" }, { label: t.title }]}
        photo={{ scene: "camilleArtisans", position: "60% 35%" }}
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-12 sm:px-6 sm:pt-16">
        <h2
          id="contact-help-title"
          className="text-[0.8125rem] font-bold tracking-[0.08em] text-primary-strong uppercase"
        >
          {t.helpTitle}
        </h2>
        <ul
          aria-labelledby="contact-help-title"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {HELP.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href as Route}
                  className="group flex h-full flex-col gap-3 rounded-[1.375rem] border border-border bg-surface p-6 shadow-card transition hover:border-primary/40 hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/25 focus-visible:outline-none"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-[0.875rem] bg-foreground text-white">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="font-display text-lg leading-snug font-bold tracking-tight">
                    {item.title}
                  </span>
                  <span className="flex-1 text-[0.9375rem] leading-relaxed text-label">
                    {item.text}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-primary-strong">
                    {item.link}
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:pb-20">
        <section
          aria-labelledby="contact-form-title"
          className="grid grid-cols-1 gap-8 rounded-hero border border-border bg-surface p-6 shadow-card sm:p-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-14 lg:p-12"
        >
          <div className="flex flex-col gap-4">
            <span className="flex size-13 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
              <Mail aria-hidden="true" className="size-6" />
            </span>
            <h2
              id="contact-form-title"
              className="text-[1.75rem] leading-[1.08] font-bold tracking-tight text-balance sm:text-[2.25rem]"
            >
              {t.formTitle}
            </h2>
          </div>
          <ContactForm />
        </section>
      </div>
    </main>
  );
}
