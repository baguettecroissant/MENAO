import { CHANTIER_STEPS, journalTimeline, type ChantierUpdate } from "@menao/core";
import { Check, MessageCircle, Phone } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDayInline, formatDayLong, formatTime, formatTimeAgo } from "@/lib/format";
import { SheetSection, sheetCard } from "./sheet";

/**
 * Briques de la fiche d'un chantier (refonte « Nette », ADR 0246) : boutons de l'en-tête, frise
 * des étapes, onglets, argent du chantier, rendez-vous et fil du suivi.
 */

const t = fr.chantier;
const st = fr.pro.sheet;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const euro = (cents: number) => euros.format(cents / 100);
const parisDay = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });

/** Boutons de l'en-tête : écrire au client (F-40) et l'appeler. */
export function ChantierHeaderActions({
  messageHref,
  phone,
}: {
  messageHref: string;
  phone: string | null;
}) {
  const secondary = `${buttonClasses({ variant: "secondary", block: false })} flex-1 sm:flex-none`;
  return (
    <div className="flex w-full gap-2 sm:w-auto">
      <Link href={messageHref as Route} className={secondary}>
        <MessageCircle aria-hidden="true" className="size-4" />
        {fr.messages.button}
      </Link>
      {phone && (
        <a href={`tel:${phone}`} className={secondary}>
          <Phone aria-hidden="true" className="size-4" />
          {t.call}
        </a>
      )}
    </div>
  );
}

/**
 * Frise des 5 étapes (spec §5 et §9) en grand : étapes franchies pleines, étape en cours cerclée.
 * `current` vient de chantierStepIndex (@menao/core).
 */
export function StepperCard({ current }: { current: number }) {
  return (
    <section className={`${sheetCard} px-3 sm:px-6`}>
      <ol aria-label={t.stepsLabel} className="flex items-start">
        {CHANTIER_STEPS.map((step, i) => {
          const state = i < current ? "done" : i === current ? "current" : "upcoming";
          return (
            <li
              key={step}
              aria-current={state === "current" ? "step" : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
            >
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute top-3.5 right-1/2 h-[3px] w-full -translate-y-1/2 ${
                    i <= current ? "bg-primary" : "bg-border-strong"
                  }`}
                />
              )}
              <span
                aria-hidden="true"
                className={`relative z-10 flex size-7 items-center justify-center rounded-full ${
                  state === "done"
                    ? "bg-primary text-primary-foreground"
                    : state === "current"
                      ? "border-[3px] border-primary bg-surface"
                      : "border-2 border-border-strong bg-surface"
                }`}
              >
                {state === "done" ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : state === "current" ? (
                  <span className="size-2.5 rounded-full bg-primary" />
                ) : null}
              </span>
              <span
                className={`text-xs leading-tight sm:text-sm ${
                  state === "upcoming"
                    ? "font-semibold text-muted-foreground"
                    : state === "current"
                      ? "font-bold"
                      : "font-semibold"
                }`}
              >
                {t.steps[step]}
                <span className="sr-only"> ({t.stepState[state]})</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * Onglets Suivi / Dossier (chaque onglet a son adresse) et Messages (la conversation, avec ses
 * non-lus) : pilules, l'onglet actif en bleu nuit.
 */
export function ChantierPillTabs({
  base,
  active,
  messagesHref,
  unread = 0,
}: {
  base: string;
  active: "suivi" | "dossier";
  messagesHref: string;
  unread?: number;
}) {
  const tab =
    "flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-pill px-4 text-[0.9375rem] font-medium whitespace-nowrap transition-colors focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none sm:flex-none";
  return (
    <nav
      aria-label={t.tabsLabel}
      className="flex gap-1 self-stretch rounded-pill border border-border bg-surface p-1 shadow-card sm:self-start"
    >
      {(["suivi", "dossier"] as const).map((name) => (
        <Link
          key={name}
          href={(name === "suivi" ? base : `${base}?onglet=dossier`) as Route}
          scroll={false}
          aria-label={t.tabs[name]}
          aria-current={active === name ? "page" : undefined}
          className={`${tab} ${
            active === name ? "bg-foreground font-semibold text-surface" : "hover:bg-background"
          }`}
        >
          {name === "suivi" ? fr.pro.sheet.tabSuivi : fr.pro.sheet.tabDossier}
        </Link>
      ))}
      <Link href={messagesHref as Route} className={`${tab} hover:bg-background`}>
        {st.messages}
        {unread > 0 && (
          <span className="flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[0.6875rem] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
            <span className="sr-only"> {fr.messages.unread(unread)}</span>
          </span>
        )}
      </Link>
    </nav>
  );
}

/**
 * « Argent du chantier » : montant du devis en grand, part payée, acompte et solde, liens vers le
 * devis et les factures.
 */
export function ChantierMoneyCard({
  totalCents,
  signed,
  paidCents,
  deposit,
  balance,
  quoteHref,
  links,
}: {
  totalCents: number;
  signed: boolean;
  paidCents: number;
  deposit: { amountCents: number; paidAt: string | null } | null;
  balance: { amountCents: number; paid: boolean } | null;
  quoteHref: string | null;
  /** Factures et autres documents (PDF). */
  links?: readonly { href: string; label: string }[];
}) {
  const share = totalCents > 0 ? Math.min(1, paidCents / totalCents) : 0;
  return (
    <SheetSection
      id="argent-du-chantier"
      title={st.money}
      action={
        quoteHref && (
          <a
            href={quoteHref}
            target="_blank"
            rel="noopener"
            className="text-sm font-semibold text-primary-strong hover:underline"
          >
            {st.seeQuote}
          </a>
        )
      }
    >
      <div className="flex flex-col gap-1">
        <span className="text-[0.8125rem] text-muted-foreground">
          {signed ? st.signedQuote : st.sentQuote}
        </span>
        <span className="font-display text-[1.875rem] leading-tight font-bold tracking-[-0.03em] tabular-nums">
          {euro(totalCents)}
        </span>
      </div>
      {signed && (
        <span
          role="meter"
          aria-label={fr.pro.dashboard.activity.inProgress.paid(euro(paidCents), euro(totalCents))}
          aria-valuemin={0}
          aria-valuemax={totalCents}
          aria-valuenow={paidCents}
          className="h-2 overflow-hidden rounded-pill bg-background"
        >
          <span
            className="block h-full rounded-pill bg-primary"
            style={{ width: `${Math.round(share * 100)}%` }}
          />
        </span>
      )}
      {(deposit || balance) && (
        <dl className="flex flex-col">
          {deposit && (
            <MoneyLine
              done={deposit.paidAt !== null}
              label={st.deposit}
              detail={
                deposit.paidAt
                  ? st.depositPaidOn(formatDayInline(deposit.paidAt))
                  : st.depositPending
              }
              amount={euro(deposit.amountCents)}
            />
          )}
          {balance && (
            <MoneyLine
              done={balance.paid}
              label={balance.paid ? st.balancePaid : st.balance}
              detail={balance.paid ? undefined : st.balanceHint}
              amount={euro(balance.amountCents)}
            />
          )}
        </dl>
      )}
      {links && links.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener"
                className="text-sm font-semibold text-primary-strong hover:underline"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </SheetSection>
  );
}

function MoneyLine({
  done,
  label,
  detail,
  amount,
}: {
  done: boolean;
  label: string;
  detail?: string;
  amount: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border py-2.5">
      <dt className="flex items-center gap-2.5">
        {done ? (
          <span className="flex size-6 items-center justify-center rounded-full bg-success-soft text-success">
            <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
          </span>
        ) : (
          <span aria-hidden="true" className="size-6 rounded-full border-2 border-border-strong" />
        )}
        <span className="flex flex-col">
          <span className="font-semibold">{label}</span>
          {detail && <span className="text-[0.8125rem] text-muted-foreground">{detail}</span>}
        </span>
      </dt>
      <dd className="font-display text-base font-bold tabular-nums">{amount}</dd>
    </div>
  );
}

/**
 * Fil du suivi (F-22) : entrées regroupées par jour (journalTimeline), messages puis vignettes ;
 * boutons d'ajout en tête. Région « Suivi du chantier », comme avant.
 */
export function JournalTimelineCard({
  updates,
  photoUrls,
  authors,
  intro,
  photoAction,
  messageAction,
  now,
}: {
  updates: readonly ChantierUpdate[];
  photoUrls: ReadonlyMap<string, string>;
  /** Auteur de certaines entrées (ADR 0243) ; « Vous » sinon. */
  authors?: Readonly<Record<string, string>>;
  intro?: string;
  photoAction?: ReactNode;
  messageAction?: ReactNode;
  now: Date;
}) {
  // Vignettes numérotées dans tout le fil (« Photo du chantier 2 sur 5 »).
  let counter = 0;
  const days = journalTimeline(updates).map((day) => ({
    ...day,
    shots: day.photos.flatMap((path) => {
      const url = photoUrls.get(path);
      return url ? [{ url, index: ++counter }] : [];
    }),
  }));
  const photoCount = counter;
  const today = parisDay.format(now);
  const yesterday = parisDay.format(new Date(now.getTime() - 86_400_000));
  const dayLabel = (day: string, at: string) =>
    day === today ? st.today : day === yesterday ? st.yesterday : formatDayLong(at);
  return (
    <section aria-labelledby="journal-title" className={sheetCard}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="journal-title" className="text-lg sm:text-xl">
          {t.journal.title}
        </h2>
        {days[0] && (
          <span className="flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
            {t.journal.lastUpdate(formatTimeAgo(days[0].lastAt, now))}
          </span>
        )}
      </div>
      {intro && <p className="text-sm text-muted-foreground">{intro}</p>}
      {(photoAction || messageAction) && (
        <div className="grid items-start gap-3 sm:grid-cols-2">
          {photoAction}
          {messageAction}
        </div>
      )}
      {days.length > 0 && (
        <ol className="flex flex-col pt-2">
          {days.map((day, i) => {
            return (
              <li key={day.day} className="flex gap-3.5">
                <div aria-hidden="true" className="flex flex-col items-center">
                  <span
                    className={`mt-1.5 size-3 rounded-full ${i === 0 ? "bg-primary" : "bg-border-strong"}`}
                  />
                  {i < days.length - 1 && <span className="w-0.5 flex-1 bg-border" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2 pb-5">
                  <span className="text-[0.8125rem] font-semibold text-muted-foreground">
                    {dayLabel(day.day, day.lastAt)}
                  </span>
                  {day.messages.map((m) => (
                    <p key={m.id} className="text-[0.9375rem] whitespace-pre-line">
                      {m.message}
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {authors?.[m.id] ?? t.journal.you} · {formatTime(m.createdAt)}
                      </span>
                    </p>
                  ))}
                  {day.shots.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {day.shots.map(({ url, index }) => {
                        return (
                          <li key={url}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-xl focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire */}
                              <img
                                src={url}
                                alt={t.journal.photoAlt(index, photoCount)}
                                className="size-24 rounded-xl object-cover sm:size-28"
                              />
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
