"use client";

import {
  alertDaysLeft,
  relanceMessage,
  trialEndMessage,
  wholeDaysBetween,
  type CommercialAlertKind,
} from "@menao/core";
import {
  AlarmClock,
  Hourglass,
  Link2,
  MessageCircle,
  Phone,
  Send,
  TriangleAlert,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Alert, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { snoozeAlert } from "@/lib/commercial/alert-actions";

const t = fr.commercialField.moments;
const STEPS = fr.admin.stalled.steps as Record<string, string>;

export type ArtisanAlert = {
  kind: CommercialAlertKind;
  subject: string;
  entreprise: string;
  first_name: string | null;
  phone: string | null;
  at: string;
  steps: string[];
};

const ICONS: Record<CommercialAlertKind, { icon: typeof Hourglass; className: string }> = {
  fin_essai: { icon: Hourglass, className: "bg-warning-soft text-warning" },
  bloque: { icon: TriangleAlert, className: "bg-danger-soft text-danger" },
  lien: { icon: Link2, className: "bg-primary-soft text-primary-strong" },
};

const smsHref = (phone: string, body: string) => `sms:${phone}?&body=${encodeURIComponent(body)}`;
const waHref = (phone: string, body: string) =>
  `https://wa.me/${phone.replace(/^\+/, "")}?text=${encodeURIComponent(body)}`;

/** Fenêtre « Relancer » : message prêt selon l'étape, modifiable ; SMS, WhatsApp, appel, report. */
function RelanceSheet({
  alert,
  message,
  onClose,
}: {
  alert: ArtisanAlert;
  message: string;
  onClose: () => void;
}) {
  const [body, setBody] = useState(message);
  const [snoozed, setSnoozed] = useState(false);
  const [pending, startTransition] = useTransition();
  const days = wholeDaysBetween(alert.at);
  const step = alert.steps[0] ? (STEPS[alert.steps[0]] ?? alert.steps[0]) : null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold">{t.relance.title(alert.entreprise)}</h3>
          {alert.kind === "bloque" && (
            <p className="text-[0.8125rem] text-muted-foreground">{t.relance.since(days, step)}</p>
          )}
        </div>
        <button
          type="button"
          aria-label={t.relance.close}
          onClick={onClose}
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-background"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
          {t.relance.ready}
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className={`${inputClasses} py-3 leading-relaxed`}
        />
      </label>
      <p className="text-xs text-muted-foreground">{t.relance.hint}</p>
      {alert.phone ? (
        <div className="grid grid-cols-3 gap-2">
          <a
            href={smsHref(alert.phone, body)}
            className="flex flex-col items-center gap-1 rounded-input bg-primary p-3 text-sm font-bold text-primary-foreground"
          >
            <Send aria-hidden="true" className="size-5" />
            {t.relance.sms}
          </a>
          <a
            href={waHref(alert.phone, body)}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1 rounded-input border border-border-strong p-3 text-sm font-bold"
          >
            <MessageCircle aria-hidden="true" className="size-5" />
            {t.relance.whatsapp}
          </a>
          <a
            href={`tel:${alert.phone}`}
            className="flex flex-col items-center gap-1 rounded-input border border-border-strong p-3 text-sm font-bold"
          >
            <Phone aria-hidden="true" className="size-5" />
            {t.relance.call}
          </a>
        </div>
      ) : (
        <Alert tone="info">{t.relance.noPhone}</Alert>
      )}
      {snoozed ? (
        <Alert tone="success">{t.relance.snoozed}</Alert>
      ) : (
        <button
          type="button"
          data-demo-block="save"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await snoozeAlert(alert.subject);
              if (result.status === "ok") setSnoozed(true);
            })
          }
          className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground"
        >
          <AlarmClock aria-hidden="true" className="size-4" />
          {t.relance.snooze}
        </button>
      )}
    </div>
  );
}

/**
 * « Vos artisans » (F-196, lot 85, ADR 0396) : fins d'essai, dossiers bloqués et liens pas ouverts,
 * avec le bon geste à chaque ligne. Les messages partent du téléphone du conseiller.
 */
export function ArtisanAlerts({ alerts, advisor }: { alerts: ArtisanAlert[]; advisor: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const current = alerts.find((a) => a.subject === open) ?? null;

  function openSheet(subject: string) {
    setOpen(subject);
    requestAnimationFrame(() => dialog.current?.showModal());
  }

  if (!alerts.length) return null;
  return (
    <section aria-labelledby="vos-artisans" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="vos-artisans" className="text-lg">
          {t.alerts.title}
        </h2>
        <span className="text-sm font-semibold text-muted-foreground">
          {t.alerts.count(alerts.length)}
        </span>
      </div>
      <ul className="overflow-hidden rounded-card border border-border bg-surface">
        {alerts.map((alert) => {
          const { icon: Icon, className } = ICONS[alert.kind];
          const steps = alert.steps.map((s) => STEPS[s] ?? s).join(", ");
          const detail =
            alert.kind === "fin_essai"
              ? t.alerts.finEssai(alertDaysLeft(alert.at))
              : alert.kind === "bloque"
                ? t.alerts.bloque(wholeDaysBetween(alert.at), steps)
                : t.alerts.lien(wholeDaysBetween(alert.at));
          return (
            <li
              key={alert.subject}
              className="flex gap-3 border-t border-border px-4 py-3.5 first:border-t-0"
            >
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-input ${className}`}
              >
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-col">
                  <span className="font-semibold">{alert.entreprise}</span>
                  <span className="text-[0.8125rem] text-label">{detail}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {alert.kind === "fin_essai" && alert.phone && (
                    <>
                      <a
                        href={`tel:${alert.phone}`}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-button bg-primary px-3.5 text-sm font-semibold text-primary-foreground"
                      >
                        <Phone aria-hidden="true" className="size-4" />
                        {t.alerts.call}
                      </a>
                      <button
                        type="button"
                        onClick={() => openSheet(alert.subject)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-button border border-border-strong px-3.5 text-sm font-semibold"
                      >
                        <MessageCircle aria-hidden="true" className="size-4" />
                        {t.alerts.message}
                      </button>
                    </>
                  )}
                  {alert.kind === "bloque" && (
                    <button
                      type="button"
                      onClick={() => openSheet(alert.subject)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-button border border-border-strong px-3.5 text-sm font-semibold"
                    >
                      <Send aria-hidden="true" className="size-4" />
                      {t.alerts.relancer}
                    </button>
                  )}
                  {alert.kind === "lien" && (
                    <Link
                      href={"/commercial/inscriptions" as Route}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-button border border-border-strong px-3.5 text-sm font-semibold"
                    >
                      <Send aria-hidden="true" className="size-4" />
                      {t.alerts.resend}
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        className="m-auto mb-0 w-full max-w-lg rounded-t-card border-0 bg-surface p-5 text-foreground shadow-raised backdrop:bg-[#0b1230]/45 sm:mb-auto sm:rounded-card"
      >
        {current && (
          <RelanceSheet
            key={current.subject}
            alert={current}
            message={
              current.kind === "fin_essai"
                ? trialEndMessage({
                    artisanFirstName: current.first_name,
                    advisor,
                    days: alertDaysLeft(current.at),
                  })
                : relanceMessage({
                    steps: current.steps,
                    artisanFirstName: current.first_name,
                    advisor,
                  })
            }
            onClose={() => dialog.current?.close()}
          />
        )}
      </dialog>
    </section>
  );
}
