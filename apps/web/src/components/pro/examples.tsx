import { Eye } from "lucide-react";
import type { Route } from "next";
import type { ReactNode } from "react";
import { ButtonLink, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { HideExamplesButton } from "./hide-examples-button";

const t = fr.pro.examples;

/** Pastille « Exemple » des demandes et chantiers fictifs (ADR 0184). */
export function ExampleBadge() {
  return <StatusBadge tone="neutral">{t.badge}</StatusBadge>;
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
      {note && <p className="text-center text-xs text-muted-foreground">{t.locked}</p>}
      <div inert className="opacity-60">
        {children}
      </div>
    </div>
  );
}

/** Bandeau des pages d'exemples : rien n'est réel, retour au dossier ou à l'espace. */
export function ExamplesBanner({ validated }: { validated: boolean }) {
  return (
    <div className="border-b border-primary/20 bg-primary-softer">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Eye aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary-strong" />
          <p className="text-sm">
            <span className="font-medium text-primary-strong">{t.banner.title}</span>{" "}
            <span className="text-muted-foreground">{t.banner.text}</span>
          </p>
        </div>
        <ButtonLink
          href={(validated ? "/pro/tableau-de-bord" : "/pro/onboarding") as Route}
          variant="outline"
          size="sm"
          className="shrink-0 self-start sm:self-auto"
        >
          {validated ? t.banner.backToSpace : t.banner.backToFile}
        </ButtonLink>
      </div>
    </div>
  );
}

/** Mention des exemples dans l'espace d'un artisan validé qui n'a encore rien reçu. */
export function SpaceExamplesNotice() {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-primary/20 bg-primary-softer px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Eye aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary-strong" />
        <p className="text-sm text-primary-strong">{t.inSpace.text}</p>
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
    <section className="flex flex-col gap-3 rounded-card border border-primary/20 bg-primary-softer p-5">
      <div className="flex items-start gap-3">
        <Eye aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary-strong" />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-medium text-primary-strong">{t.dashboardCard.title}</h2>
          <p className="text-sm text-muted-foreground">{t.dashboardCard.text}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink href={"/pro/decouvrir/tableau-de-bord" as Route} size="sm">
          {t.dashboardCard.open}
        </ButtonLink>
        <HideExamplesButton />
      </div>
    </section>
  );
}
