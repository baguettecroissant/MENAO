import { ARTISAN_CANCELLABLE_STATUSES, type ChantierStatus } from "@menao/core";
import { CalendarDays, CalendarPlus, Clock, MessageCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import {
  CancelChantierButton,
  NotesBlock,
  RescheduleButton,
} from "@/app/pro/(espace)/chantiers/[id]/chantier-actions";
import { ReportProblemLink } from "@/components/chantier/chantier-parts";
import { Alert, ButtonLink, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { AppointmentAgenda } from "@/lib/artisan/agenda";
import type { ChantierDetail } from "@/lib/artisan/chantiers";
import { formatDay, formatDayLong, formatTime, parisInputValues } from "@/lib/format";
import { DetailHeader, StickyActions } from "./detail";
import { ExampleLock } from "./examples";
import { ExpertiseButton } from "./expertise-button";
import { RequestBlocks } from "./request-blocks";
import { SentQuoteBlock, type DepositPayment, type SentQuote } from "./sent-quote";

const t = fr.pro.appointment;
const cancellable: readonly ChantierStatus[] = ARTISAN_CANCELLABLE_STATUSES;
const pill =
  "inline-flex min-h-9 items-center gap-1.5 self-start rounded-pill border border-white/60 px-3.5 text-sm font-medium text-white hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white/40 focus-visible:outline-none";

/**
 * Vue d'un rendez-vous (F-18), maquette « Vue d'un rendez-vous », jusqu'à l'acompte : rendez-vous,
 * devis envoyé (F-21) et acompte (F-31). Exemple (ADR 0184) : mêmes blocs, actions inactives.
 */
export function ChantierAppointmentView({
  c,
  photoUrls,
  trades,
  hasDraft,
  sentQuote,
  deposit,
  invoice,
  minDate,
  agenda,
  base = "/pro",
  example = false,
}: {
  c: ChantierDetail;
  photoUrls: string[];
  trades: readonly { code: string; label: string }[];
  hasDraft: boolean;
  sentQuote: SentQuote | null;
  deposit: DepositPayment | null;
  invoice: { id: string; numero: string } | null;
  minDate: string;
  agenda?: AppointmentAgenda;
  base?: string;
  example?: boolean;
}) {
  const status = c.chantier.status;
  // F-19 : devis à créer après le rendez-vous, ou à modifier si le client l'a demandé.
  const awaitingQuote = status === "rdv_planifie" || status === "devis_en_revision";
  const appointment = c.appointment?.status === "planifie" ? c.appointment : null;
  const planned = status === "rdv_planifie" && appointment !== null;
  const active = status !== "annule" && status !== "cloture" && status !== "devis_refuse";

  return (
    <main className="flex flex-1 flex-col">
      <DetailHeader backHref={`${base}/chantiers`} backLabel={t.back} title={t.title}>
        {appointment ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" className="size-4" />
              {formatDayLong(appointment.starts_at)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden="true" className="size-4" />
              {formatTime(appointment.starts_at)}
            </span>
            {planned && (
              <ExampleLock locked={example}>
                <RescheduleButton
                  chantierId={c.chantier.id}
                  minDate={minDate}
                  {...parisInputValues(appointment.starts_at)}
                  agenda={agenda}
                />
              </ExampleLock>
            )}
          </div>
        ) : (
          <p className="text-sm text-white/85">{fr.pro.chantiers.status[status]}</p>
        )}
        {planned && (
          <ExampleLock locked={example}>
            <a href={`/agenda/${c.chantier.id}`} className={pill}>
              <CalendarPlus aria-hidden="true" className="size-4" />
              {t.addToCalendar}
            </a>
          </ExampleLock>
        )}
        {/* F-40 : conversation du chantier avec le client. */}
        <Link href={`${base}/messages/${c.chantier.id}` as Route} className={pill}>
          <MessageCircle aria-hidden="true" className="size-4" />
          {fr.messages.writeClient}
        </Link>
      </DetailHeader>
      {active && (
        <ExampleLock locked={example}>
          <ExpertiseButton requestId={c.id} trades={trades} />
        </ExampleLock>
      )}

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-4 py-5 sm:px-6 sm:py-6">
        {status === "annule" && (
          <Alert tone="info">
            {t.cancelled(formatDay(c.chantier.cancelled_at ?? c.chantier.created_at))}
          </Alert>
        )}
        {status !== "rdv_planifie" && status !== "annule" && (
          <div>
            <StatusBadge tone="primary">{fr.pro.chantiers.status[status]}</StatusBadge>
          </div>
        )}
        {sentQuote && (
          <ExampleLock locked={example}>
            <SentQuoteBlock quote={sentQuote} deposit={deposit} invoice={invoice} />
          </ExampleLock>
        )}
        <RequestBlocks detail={c} photoUrls={photoUrls} variant="rendez-vous" />
        {c.appointment && (
          <ExampleLock locked={example}>
            <NotesBlock chantierId={c.chantier.id} notes={c.appointment.notes} />
          </ExampleLock>
        )}
        {status !== "annule" && (
          <ExampleLock locked={example}>
            <ReportProblemLink href={`/pro/chantiers/${c.chantier.id}/signaler`} />
          </ExampleLock>
        )}
      </div>

      {(awaitingQuote || cancellable.includes(status)) && (
        <StickyActions>
          {awaitingQuote && (
            <ButtonLink href={`${base}/chantiers/${c.chantier.id}/devis` as Route} size="lg" block>
              {status === "devis_en_revision"
                ? fr.pro.quote.sent.edit
                : hasDraft
                  ? fr.pro.quote.resume
                  : fr.pro.quote.create}
            </ButtonLink>
          )}
          {cancellable.includes(status) && (
            <ExampleLock locked={example} note>
              <CancelChantierButton chantierId={c.chantier.id} />
            </ExampleLock>
          )}
        </StickyActions>
      )}
    </main>
  );
}
