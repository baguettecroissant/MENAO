import { Check } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo, LogoMark } from "@/components/brand/logo";
import { DemoVideo } from "@/components/pro-landing/demo-video";
import { fr } from "@/i18n/fr";
import { frenchSpacing } from "@/lib/site/typography";
import { AccessForm } from "./access-form";

const t = fr.prelaunch;

export const metadata: Metadata = {
  title: t.metaTitle,
  description: t.metaDescription,
  robots: { index: false, follow: false },
};

/**
 * Page d'attente du mode pré-lancement (ADR 0101) : servie à toute adresse tant que le visiteur n'a
 * pas saisi le code des testeurs. Sans PRELAUNCH_ACCESS_CODE au build, elle n'existe pas.
 */
export default function PrelaunchPage() {
  if (!process.env.PRELAUNCH_ACCESS_CODE) notFound();
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[linear-gradient(160deg,#e4eafd_0%,#f1f4fe_55%,#f9f7f0_100%)]"
      />
      <LogoMark className="pointer-events-none absolute -top-10 -right-24 hidden size-[26rem] animate-menao-float opacity-[0.07] [animation-duration:9s] md:block" />

      <section className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 pt-12 pb-14 text-center sm:pt-20">
        <Logo />
        <span className="inline-flex items-center gap-2 rounded-pill border border-primary/20 bg-surface px-3 py-1 text-sm font-medium text-primary-strong">
          <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-primary" />
          {t.badge}
        </span>
        <h1 className="animate-menao-rise text-4xl font-semibold tracking-[-0.03em] text-foreground sm:text-6xl">
          {frenchSpacing(t.title)}
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">{t.lead}</p>
        <ul className="flex flex-wrap justify-center gap-2">
          {t.points.map((point) => (
            <li
              key={point}
              className="inline-flex items-center gap-1.5 rounded-pill bg-surface px-3 py-1.5 text-sm text-foreground shadow-card"
            >
              <Check aria-hidden="true" className="size-4 text-primary" />
              {point}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">{t.area}</p>
      </section>

      <section className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-5 px-4 pb-14 text-center">
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">
          {frenchSpacing(t.pro.title)}
        </h2>
        <p className="max-w-xl text-muted-foreground">{t.pro.text}</p>
        <DemoVideo />
      </section>

      <section className="relative mx-auto grid w-full max-w-3xl grid-cols-1 gap-4 px-4 pb-14 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-6 text-left">
          <h2 className="text-lg font-semibold text-foreground">
            {frenchSpacing(t.contact.title)}
          </h2>
          <p className="text-muted-foreground">
            {t.contact.text}{" "}
            <a
              href={`mailto:${t.contact.email}`}
              className="font-medium text-primary-strong underline-offset-2 hover:underline"
            >
              {t.contact.email}
            </a>
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 text-left">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t.access.title}</h2>
            <p className="text-sm text-muted-foreground">{t.access.text}</p>
          </div>
          <AccessForm />
        </div>
      </section>

      {/* TODO(legal): identité de l'éditeur (mentions légales, LCEN) à afficher aussi sur la page
          d'attente dès qu'elle est connue. */}
      <footer className="relative mt-auto border-t border-border px-4 py-6 text-center text-sm text-muted-foreground">
        {t.footer}
      </footer>
    </main>
  );
}
