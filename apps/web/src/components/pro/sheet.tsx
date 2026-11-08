import { ArrowLeft, Clock, Flag } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";

/**
 * Briques des fiches de l'espace pro (refonte « Nette », ADR 0246) : en-tête à grand titre,
 * compte à rebours, carte « Prochaine étape », cartes blanches et mise en page sur deux colonnes.
 * Mêmes briques pour la fiche d'une demande et la fiche d'un chantier.
 */

export const sheetCard =
  "flex flex-col gap-3.5 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6";

/** Page d'une fiche : colonne centrale large, enfants dans l'ordre (voir `order-*`). */
export function SheetPage({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-5 pb-0 sm:px-6 sm:pt-8 lg:px-10 lg:pb-12">
        {children}
      </div>
    </main>
  );
}

/** En-tête : retour, puces, grand titre, ligne d'informations ; à droite, un encadré ou des boutons. */
export function SheetHeader({
  backHref,
  backLabel,
  chips,
  title,
  meta,
  aside,
}: {
  backHref: string;
  backLabel: string;
  chips?: ReactNode;
  title: string;
  meta?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href={backHref as Route}
        className="inline-flex items-center gap-1 self-start rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {backLabel}
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex min-w-0 max-w-2xl flex-col gap-2.5">
          {chips && <div className="flex flex-wrap items-center gap-2">{chips}</div>}
          <h1 className="text-[1.875rem] leading-[1.08] sm:text-[2.5rem] sm:leading-[1.05]">
            {title}
          </h1>
          {meta && <p className="text-[0.9375rem] text-label sm:text-base">{meta}</p>}
        </div>
        {aside}
      </header>
    </div>
  );
}

/** Puce d'une fiche (métier, état) : gris, bleue, verte, orange ou rouge, point facultatif. */
export function SheetChip({
  children,
  tone = "primary",
  dot = false,
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
  dot?: boolean;
}) {
  const tones = {
    neutral: "bg-border/70 text-label",
    primary: "bg-primary-soft text-primary-strong",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-xs font-bold whitespace-nowrap ${tones[tone]}`}
    >
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/**
 * Compte à rebours d'une demande en attente (72 h pour répondre) : heures restantes en grand et
 * barre du temps restant.
 */
export function Countdown({
  hours,
  minutes,
  totalHours = 72,
  urgent = false,
}: {
  hours: number;
  minutes: number;
  totalHours?: number;
  urgent?: boolean;
}) {
  const t = fr.pro.sheet;
  const share = Math.max(0, Math.min(1, (hours + minutes / 60) / totalHours));
  return (
    <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card sm:w-72">
      <span className="flex items-center gap-2 text-sm font-semibold text-label">
        <Clock aria-hidden="true" className="size-4" />
        {t.answerWithin}
      </span>
      <span
        className={`font-display text-[2.125rem] leading-none font-bold tracking-[-0.03em] tabular-nums ${urgent ? "text-danger" : ""}`}
      >
        {t.hoursLeft(hours)}
      </span>
      <span
        role="meter"
        aria-label={fr.pro.onboarding.requests.timeLeft(hours, minutes)}
        aria-valuemin={0}
        aria-valuemax={totalHours * 60}
        aria-valuenow={hours * 60 + minutes}
        className="h-2 overflow-hidden rounded-pill bg-background"
      >
        <span
          className={`block h-full rounded-pill ${urgent ? "bg-danger" : "bg-primary"}`}
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      </span>
      <span className="text-[0.8125rem] text-muted-foreground">{t.expiryNote}</span>
    </div>
  );
}

/** Deux colonnes en grand écran (contenu, puis colonne de droite), une seule sur téléphone. */
export function SheetColumns({ main, aside }: { main: ReactNode; aside: ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-6">{main}</div>
      <div className="flex min-w-0 flex-col gap-6">{aside}</div>
    </div>
  );
}

/** Carte blanche à titre (« La demande en bref », « Argent du chantier »). */
export function SheetSection({
  id,
  title,
  badge,
  action,
  children,
}: {
  id: string;
  title: string;
  /** Pastille à droite du titre (« Résumé MENAO »). */
  badge?: ReactNode;
  /** Lien à droite du titre (« Voir le devis »). */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={sheetCard}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id={id} className="text-lg sm:text-xl">
          {title}
        </h2>
        {badge}
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Carte « Prochaine étape » sur fond bleu clair : ce qu'il faut faire maintenant et le bouton qui
 * le fait. En grand écran le bouton est à droite, sur téléphone dessous, sur toute la largeur.
 */
export function NextStepCard({
  title,
  text,
  action,
}: {
  title: string;
  text?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      aria-label={fr.pro.sheet.nextStep}
      className="flex flex-col gap-4 rounded-card bg-primary-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary-strong">
          <Flag aria-hidden="true" className="size-5" />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.8125rem] font-bold tracking-[0.04em] text-primary-strong uppercase">
            {fr.pro.sheet.nextStep}
          </span>
          <span className="text-base font-semibold">{title}</span>
          {text && <span className="text-sm text-label">{text}</span>}
        </div>
      </div>
      {action && (
        <div className="flex w-full shrink-0 flex-col gap-1 sm:w-auto sm:[&_button]:w-auto sm:[&_a]:w-auto">
          {action}
        </div>
      )}
    </section>
  );
}

/** Ligne « intitulé : valeur » des petites cartes (planning, détails). */
export function SheetRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-border py-2.5 first:border-t-0 first:pt-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-semibold">{children}</dd>
    </div>
  );
}
