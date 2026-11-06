"use client";

import { Phone } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useActionState, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Drawer } from "@/components/drawer";
import { Alert, Button, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { AgendaItem } from "@/lib/artisan/agenda";
import { initialFormState, type FormState } from "@/lib/auth/form";
import { formatDayInline, formatPhone } from "@/lib/format";

const t = fr.pro.agenda.details;

/**
 * Créneau de l'agenda sans chantier (ADR 0232) : cliquable, il ouvre une fenêtre avec tout son
 * détail. Rendez-vous de la secrétaire : client, téléphone, commune, motif ; créneau bloqué : motif
 * ; plage du téléphone : explication. « Libérer le créneau » pour les créneaux bloqués.
 */
export function AgendaItemDetails({
  item,
  when,
  describe,
  className,
  style,
  removeAction,
  children,
}: {
  item: AgendaItem;
  /** « lundi 9 novembre · 08h00 – 09h00 ». */
  when: string;
  /** Libellé accessible du bouton. */
  describe: string;
  className: string;
  style?: CSSProperties;
  /** Libérer le créneau bloqué ; absent pour une plage du téléphone ou sur les pages d'exemple. */
  removeAction?: (prev: FormState) => Promise<FormState>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const s = item.secretary;
  const title = t.titles[s ? "secretaire" : item.kind] ?? t.titles.creneau ?? "";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.open(describe)}
        title={describe}
        style={style}
        className={`${className} cursor-pointer text-left transition-shadow hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none`}
      >
        {children}
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title={title ?? ""} backLabel={t.close}>
        <p className="text-sm font-medium first-letter:uppercase">{when}</p>
        {s ? (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{t.client}</dt>
              <dd className="flex flex-wrap items-center gap-2">
                {s.callerName}
                {s.urgent && <StatusBadge tone="danger">{t.urgent}</StatusBadge>}
              </dd>
              <dt className="text-muted-foreground">{t.phone}</dt>
              <dd>{formatPhone(s.callerPhone)}</dd>
              {s.city && (
                <>
                  <dt className="text-muted-foreground">{t.city}</dt>
                  <dd>{s.city}</dd>
                </>
              )}
              <dt className="text-muted-foreground">{t.reason}</dt>
              <dd className="whitespace-pre-line">{s.reason}</dd>
            </dl>
            <p className="text-xs text-muted-foreground">{t.takenAt(formatDayInline(s.takenAt))}</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`tel:${s.callerPhone}`}
                className="inline-flex min-h-10 items-center gap-2 rounded-input bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
              >
                <Phone aria-hidden="true" className="size-4" />
                {t.call(formatPhone(s.callerPhone))}
              </a>
              <Link
                href={"/pro/onboarding/formule#secretaire" as Route}
                className="inline-flex min-h-10 items-center rounded-input border border-primary px-4 text-sm font-medium text-primary-strong hover:bg-primary-softer"
              >
                {t.messages}
              </Link>
            </div>
          </>
        ) : item.kind === "occupe" ? (
          <p className="text-sm text-muted-foreground">{t.phoneBusy}</p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 text-sm">
            <dt className="text-muted-foreground">{t.label}</dt>
            <dd>{item.title ?? t.noLabel}</dd>
          </dl>
        )}
        {removeAction && <ReleaseSlot action={removeAction} onDone={() => setOpen(false)} />}
      </Drawer>
    </>
  );
}

function ReleaseSlot({
  action,
  onDone,
}: {
  action: (prev: FormState) => Promise<FormState>;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);
  return (
    <form action={formAction} className="flex flex-col gap-2 border-t border-border pt-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Button
        type="submit"
        variant="danger-text"
        size="sm"
        block={false}
        disabled={pending}
        className="self-start"
      >
        {t.release}
      </Button>
    </form>
  );
}
