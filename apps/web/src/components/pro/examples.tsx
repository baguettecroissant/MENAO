import { ChevronDown, Eye } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { HideExamplesButton } from "./hide-examples-button";

const t = fr.pro.examples;
const backLink =
  "inline-flex min-h-8 shrink-0 items-center rounded-pill border border-white/70 px-3 text-xs font-medium text-primary-foreground hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white/40 focus-visible:outline-none";

/** Pages de l'espace pro qui ont leur version d'exemple sous /pro/decouvrir (ADR 0184). */
const EXAMPLE_PAGES = new Set([
  "tableau-de-bord",
  "demandes",
  "chantiers",
  "devis",
  "messages",
  "agenda",
  "factures",
  "depenses",
  "mon-profil",
  "profil",
  "avis",
  "grade",
]);

/** Lien d'une page de l'espace pro vers sa page d'exemple, ou null s'il n'y en a pas. */
export function exampleHref(href: string): string | null {
  const match = /^\/pro\/([a-z-]+)([?#].*)?$/.exec(href);
  return match?.[1] && EXAMPLE_PAGES.has(match[1])
    ? `/pro/decouvrir/${match[1]}${match[2] ?? ""}`
    : null;
}

/** Pastille « Exemple » des demandes et chantiers fictifs (ADR 0184), couleur des exemples. */
export function ExampleBadge() {
  return <StatusBadge tone="example">{t.badge}</StatusBadge>;
}

/**
 * Zone d'actions d'un exemple : visible mais inactive (attribut `inert`), avec la mention « les
 * boutons sont désactivés » si `note`. Sans exemple, rendue telle quelle.
 */
export function ExampleLock({
  locked,
  note = false,
  children,
}: {
  locked: boolean;
  note?: boolean;
  children: ReactNode;
}) {
  if (!locked) return children;
  return (
    <div className="flex flex-col gap-2">
      {note && <p className="text-center text-xs text-example-strong">{t.locked}</p>}
      <div inert className="opacity-60">
        {children}
      </div>
    </div>
  );
}

/**
 * Bandeau fin en haut des pages d'exemples, couleur des exemples : rien n'est réel, retour au
 * dossier ou à l'espace. Sur téléphone, replié sur son titre.
 */
export function ExamplesBanner({
  validated,
  commercial = false,
}: {
  validated: boolean;
  /** Démo d'un commercial (ADR 0205) : retour à son espace. */
  commercial?: boolean;
}) {
  const back = (
    <Link
      href={
        (commercial
          ? "/commercial"
          : validated
            ? "/pro/tableau-de-bord"
            : "/pro/onboarding") as Route
      }
      className={backLink}
    >
      {commercial
        ? t.banner.backToCommercial
        : validated
          ? t.banner.backToSpace
          : t.banner.backToFile}
    </Link>
  );
  return (
    <div role="note" aria-label={t.banner.title} className="bg-example text-primary-foreground">
      <div className="hidden items-center gap-3 px-5 py-2 text-sm sm:flex">
        <Eye aria-hidden="true" className="size-4 shrink-0" />
        <p className="min-w-0 flex-1">
          <span className="font-medium">{t.banner.title}</span>
          <span className="text-primary-foreground/90"> · {t.banner.text}</span>
        </p>
        {back}
      </div>
      <details className="group sm:hidden">
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <Eye aria-hidden="true" className="size-4 shrink-0" />
          <span className="flex-1">{t.banner.title}</span>
          <span className="sr-only">{t.banner.more}</span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="flex flex-col items-start gap-2 px-4 pb-3 text-sm">
          <p className="text-primary-foreground/90">{t.banner.text}</p>
          {back}
        </div>
      </details>
    </div>
  );
}

/** Mention des exemples dans l'espace d'un artisan validé qui n'a encore rien reçu. */
export function SpaceExamplesNotice() {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-example/25 bg-example-soft px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Eye aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-example-strong" />
        <p className="text-sm text-example-strong">{t.inSpace.text}</p>
      </div>
      <div className="self-start sm:self-auto">
        <HideExamplesButton />
      </div>
    </div>
  );
}

/** Carte du tableau de bord vide : ouvre l'espace d'exemples. */
export function ExamplesCard() {
  return (
    <section className="flex flex-col gap-3 rounded-card border border-example/25 bg-example-soft p-5">
      <div className="flex items-start gap-3">
        <Eye aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-example-strong" />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-medium text-example-strong">{t.dashboardCard.title}</h2>
          <p className="text-sm text-example-strong/90">{t.dashboardCard.text}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={"/pro/decouvrir/tableau-de-bord" as Route}
          className="inline-flex min-h-9 items-center rounded-pill bg-example px-4 text-sm font-medium text-primary-foreground hover:bg-example-strong focus-visible:ring-4 focus-visible:ring-example/30 focus-visible:outline-none"
        >
          {t.dashboardCard.open}
        </Link>
        <HideExamplesButton />
      </div>
    </section>
  );
}
