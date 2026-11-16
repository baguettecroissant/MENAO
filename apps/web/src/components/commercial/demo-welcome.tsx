import {
  Award,
  CalendarCheck,
  ChevronRight,
  HelpCircle,
  QrCode,
  Sparkles,
  Store,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.commercialDemo.welcome;

/**
 * Accueil de la démo (maquette du lot 57, ADR 0344) : ce que voit le visiteur, trois chiffres et
 * six raccourcis vers les vrais écrans, remplis de données fictives.
 */
export function DemoWelcome({ copilotHref }: { copilotHref: string }) {
  const tiles = [
    { icon: CalendarCheck, text: t.tiles.day, href: "/commercial/journee" },
    { icon: Store, text: t.tiles.prospects, href: "/commercial/prospects" },
    { icon: Sparkles, text: t.tiles.copilot, href: copilotHref },
    { icon: Award, text: t.tiles.results, href: "/commercial/resultats" },
    { icon: HelpCircle, text: t.tiles.guide, href: "/commercial/guide/entrainement" },
    { icon: QrCode, text: t.tiles.code, href: "#mon-code" },
  ];
  return (
    <>
      <section className="flex flex-col gap-4 rounded-[1.25rem] bg-foreground px-6 py-6 text-surface sm:px-7">
        <span className="text-[0.8125rem] font-bold tracking-wider uppercase opacity-70">
          {t.eyebrow}
        </span>
        <h1 className="max-w-3xl text-[1.625rem] leading-tight font-semibold tracking-tight sm:text-[1.875rem]">
          {t.title}
        </h1>
        <p className="max-w-3xl text-[0.9375rem] leading-relaxed opacity-85">{t.text}</p>
        <div className="flex flex-wrap gap-2.5">
          <Link href={"/commercial/journee" as Route} className={buttonClasses({ block: false })}>
            {t.start}
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
          <Link
            href={"/commercial/resultats" as Route}
            className={`${buttonClasses({ variant: "secondary", block: false })} !text-foreground`}
          >
            {t.results}
          </Link>
        </div>
      </section>
      <ul className="grid overflow-hidden rounded-card border border-border bg-surface shadow-card sm:grid-cols-3">
        {t.figures.map(([label, value, hint]) => (
          <li
            key={label}
            className="flex flex-col gap-1 border-border px-5 py-4 not-first:border-t sm:not-first:border-t-0 sm:not-first:border-l"
          >
            <span className="text-sm font-semibold text-label">{label}</span>
            <b className="text-[2rem] leading-none font-bold tracking-tight">{value}</b>
            <span className="text-[0.8125rem] text-muted-foreground">{hint}</span>
          </li>
        ))}
      </ul>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t.seeTitle}</h2>
        <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map(({ icon: Icon, text: [title, detail], href }) => (
            <li key={title}>
              <Link
                href={href as Route}
                className="flex h-full items-start gap-3.5 rounded-card border border-border bg-surface p-4 hover:bg-background"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-input bg-primary-soft text-primary-strong">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="flex flex-col gap-1">
                  <b>{title}</b>
                  <span className="text-[0.8438rem] leading-snug text-muted-foreground">
                    {detail}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
