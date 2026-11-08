import { CalendarDays, ChevronRight, FileText, Headset, Mail, Wallet } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { ArtisanAssistant } from "@/components/pro/artisan-assistant";
import { sheetCard } from "@/components/pro/sheet";
import { fr } from "@/i18n/fr";
import { requireProSpace } from "@/lib/artisan/space";

const t = fr.pro.helpCenter;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * « Aide et support » de l'espace artisan (F-86, ADR 0236) : l'assistant, qui connaît l'espace et
 * le compte de l'artisan, puis le contact de l'équipe. Même entrée de menu qu'avant.
 */
export default async function ArtisanHelpPage() {
  await requireProSpace();
  const guides = [
    { href: "/pro/chantiers", label: t.guides.devis, Icon: FileText },
    { href: "/pro/onboarding/paiements", label: t.guides.paiements, Icon: Wallet },
    { href: "/pro/agenda/disponibilites#calendrier", label: t.guides.agenda, Icon: CalendarDays },
    { href: "/pro/secretaire", label: t.guides.secretaire, Icon: Headset },
  ];
  // Refonte « Nette » (ADR 0253) : l'assistant à gauche, guides et contact à droite.
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{t.title}</h1>
          <p className="text-[0.9375rem] text-label sm:text-base">{t.subtitle}</p>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <ArtisanAssistant />
          <div className="flex flex-col gap-4">
            <section aria-labelledby="guides" className={sheetCard}>
              <h2 id="guides" className="text-lg">
                {t.guidesTitle}
              </h2>
              <ul className="flex flex-col divide-y divide-border">
                {guides.map(({ href, label, Icon }) => (
                  <li key={href}>
                    <Link
                      href={href as Route}
                      className="flex items-center gap-3 py-3 text-sm font-semibold hover:text-primary-strong focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-[0.625rem] bg-border/70 text-label">
                        <Icon aria-hidden="true" className="size-4" />
                      </span>
                      <span className="flex-1">{label}</span>
                      <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="ecrire" className={sheetCard}>
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[0.625rem] bg-success-soft text-success">
                  <Mail aria-hidden="true" className="size-[1.125rem]" />
                </span>
                <h2 id="ecrire" className="font-sans text-base font-semibold">
                  {t.contactTitle}
                </h2>
              </div>
              <p className="text-sm text-label">{t.contactText}</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`mailto:${t.email}`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-pill border border-border-strong bg-surface px-4 text-sm font-semibold hover:bg-background"
                >
                  {t.email}
                </a>
                <Link
                  href="/contact"
                  className="inline-flex min-h-10 items-center rounded-pill border border-border-strong bg-surface px-4 text-sm font-semibold hover:bg-background"
                >
                  {t.contactForm}
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
