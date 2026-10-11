import type { Metadata, Route } from "next";
import Link from "next/link";
import { ArrowRight, CircleHelp, HardHat, Search, TriangleAlert } from "lucide-react";
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

/** Contact (F-03) : formulaire (ticket sans compte) et raccourcis vers les bonnes ressources. */
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
      />
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-12">
        <section
          aria-labelledby="contact-form-title"
          className="flex flex-col gap-6 rounded-hero border border-border bg-surface p-6 shadow-card sm:p-10"
        >
          <h2 id="contact-form-title" className="text-xl font-medium tracking-tight">
            {t.formTitle}
          </h2>
          <ContactForm />
        </section>
        <aside aria-labelledby="contact-help-title" className="flex flex-col gap-3">
          <h2
            id="contact-help-title"
            className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase"
          >
            {t.helpTitle}
          </h2>
          <ul className="flex flex-col gap-3">
            {HELP.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href as Route}
                    className="group flex gap-4 rounded-card border border-border bg-surface p-5 shadow-card transition hover:border-primary/40 hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/25 focus-visible:outline-none"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="font-medium">{item.title}</span>
                      <span className="text-sm leading-relaxed text-muted-foreground">
                        {item.text}
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary-strong">
                        {item.link}
                        <ArrowRight
                          aria-hidden="true"
                          className="size-3.5 transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </main>
  );
}
