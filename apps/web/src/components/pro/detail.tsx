import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Éléments des fiches de l'espace pro (maquettes « Vue d'une opportunité », « Vue d'un
 * rendez-vous ») : bandeau bleu, cartes à icône, barre d'actions collée en bas.
 */

export function DetailHeader({
  backHref,
  backLabel,
  title,
  children,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="bg-[linear-gradient(160deg,#4869f6_0%,#5b7bf8_60%,#7f97fa_100%)] text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 pt-5 pb-6 sm:px-6 sm:pt-6 sm:pb-8">
        <Link
          href={backHref as Route}
          className="inline-flex items-center gap-1.5 self-start rounded-md text-sm text-white/85 hover:text-white focus-visible:ring-4 focus-visible:ring-white/40 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {backLabel}
        </Link>
        <h1 className="text-[1.5rem] leading-tight font-medium tracking-tight sm:text-[1.75rem]">
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}

export function DetailBlock({
  icon,
  title,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[1.0625rem] font-medium">
          <span aria-hidden="true" className="text-primary [&>svg]:size-[1.125rem]">
            {icon}
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Barre d'actions des fiches, collée en bas de l'écran (bouton principal + lien rouge). */
export function StickyActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-stretch gap-1">{children}</div>
    </div>
  );
}

/** Vignettes des photos du projet ; la troisième indique le nombre de photos restantes. */
export function PhotoStrip({ urls, altFor }: { urls: string[]; altFor: (i: number) => string }) {
  if (urls.length === 0) return null;
  const shown = urls.slice(0, 3);
  const more = urls.length - shown.length;
  return (
    <ul className="flex gap-2">
      {shown.map((url, i) => (
        <li key={url} className="relative">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire */}
            <img src={url} alt={altFor(i + 1)} className="size-16 rounded-lg object-cover" />
            {more > 0 && i === shown.length - 1 && (
              <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/45 text-sm font-medium text-white">
                +{more}
              </span>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}
