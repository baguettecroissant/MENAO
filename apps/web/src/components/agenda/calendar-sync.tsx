"use client";

import { Check, Copy, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert, Button, Hint, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { disableCalendarFeed, renewCalendarFeed } from "@/lib/artisan/agenda-actions";
import { initialFormState } from "@/lib/auth/form";
import { formatTimeAgo } from "@/lib/format";

const t = fr.pro.agenda.availability.sync;

const linkButton =
  "inline-flex min-h-10 items-center gap-2 rounded-pill border border-border bg-surface px-3.5 text-sm font-medium hover:border-primary/50 hover:bg-primary-softer focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none";

/**
 * Abonnement .ics (F-44) : lien secret à ajouter une fois dans Google Agenda, Apple Calendrier ou
 * Outlook, qui relisent ensuite l'agenda MENAO d'eux-mêmes. Renouvelable et désactivable.
 */
export function CalendarSync({
  url,
  lastReadAt,
}: {
  url: string | null;
  lastReadAt: string | null;
}) {
  const [renewState, renewAction, renewing] = useActionState(renewCalendarFeed, initialFormState);
  const [disableState, disableAction, disabling] = useActionState(
    disableCalendarFeed,
    initialFormState,
  );
  const [copied, setCopied] = useState(false);
  const message = renewState.error ?? disableState.error;
  const success = url ? renewState.success : disableState.success;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers refusé : le lien reste sélectionnable dans le champ.
    }
  };

  const webcal = url?.replace(/^https?:\/\//, "webcal://") ?? "";

  return (
    <section
      id="synchronisation"
      aria-labelledby="synchronisation-titre"
      className="scroll-mt-24 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="synchronisation-titre"
          className="flex items-center gap-2 text-[1.0625rem] font-medium"
        >
          <RefreshCw aria-hidden="true" className="size-[1.125rem] text-primary" />
          {t.title}
        </h2>
        <p className="text-sm text-muted-foreground">{t.text}</p>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {message && <Alert tone="error">{message}</Alert>}
        {success && <Alert tone="success">{success}</Alert>}

        {url ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="lien-abonnement" className="text-sm font-medium">
                {t.link}
              </label>
              <div className="flex gap-2">
                <input
                  id="lien-abonnement"
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className={`${inputClasses} min-h-10 truncate px-3 font-mono text-xs`}
                />
                <Button
                  type="button"
                  variant="secondary"
                  block={false}
                  size="sm"
                  onClick={copy}
                  className="shrink-0 whitespace-nowrap"
                >
                  {copied ? (
                    <Check aria-hidden="true" className="size-4 text-success" />
                  ) : (
                    <Copy aria-hidden="true" className="size-4" />
                  )}
                  <span aria-live="polite">{copied ? t.copied : t.copy}</span>
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">{t.addTo}</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkButton}
                >
                  {t.google}
                  <ExternalLink aria-hidden="true" className="size-3.5 text-muted-foreground" />
                </a>
                <a href={webcal} className={linkButton}>
                  {t.apple}
                </a>
                <a
                  href={`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(url)}&name=${encodeURIComponent(fr.agenda.feedName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkButton}
                >
                  {t.outlook}
                  <ExternalLink aria-hidden="true" className="size-3.5 text-muted-foreground" />
                </a>
              </div>
            </div>
            <p className="flex flex-col gap-0.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">
                {lastReadAt ? t.lastRead(formatTimeAgo(lastReadAt)) : t.neverRead}
              </span>
              <span>{t.delay}</span>
            </p>
            <p className="flex items-start gap-2 rounded-input bg-background px-3 py-2.5 text-xs text-muted-foreground">
              <ShieldCheck aria-hidden="true" className="mt-px size-4 shrink-0 text-primary" />
              {t.privacy}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
              <form action={renewAction}>
                <input type="hidden" name="renouveler" value="oui" />
                <button
                  type="submit"
                  disabled={renewing}
                  title={t.renewHint}
                  className="min-h-9 rounded-md text-sm font-medium text-primary-strong underline-offset-2 hover:underline focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
                >
                  {t.renew}
                </button>
              </form>
              <form action={disableAction}>
                <button
                  type="submit"
                  disabled={disabling}
                  className="min-h-9 rounded-md text-sm font-medium text-danger underline-offset-2 hover:underline focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
                >
                  {t.disable}
                </button>
              </form>
            </div>
            <Hint>{t.renewHint}</Hint>
          </>
        ) : (
          <form action={renewAction}>
            <Button type="submit" variant="outline" disabled={renewing}>
              {t.create}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
