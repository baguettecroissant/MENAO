import {
  ARTISAN_CANCELLABLE_STATUSES,
  chantierStepIndex,
  type ChantierRights,
  type ChantierStatus,
} from "@menao/core";
import { CalendarDays, CalendarPlus, Clock } from "lucide-react";
import type { Route } from "next";
import type { ReactNode } from "react";
import {
  CancelChantierButton,
  NotesBlock,
  RescheduleButton,
} from "@/app/pro/(espace)/chantiers/[id]/chantier-actions";
import { ReportProblemLink } from "@/components/chantier/chantier-parts";
import { Alert, ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { AppointmentAgenda } from "@/lib/artisan/agenda";
import type { ChantierDetail } from "@/lib/artisan/chantiers";
import { formatDay, formatDayLong, formatTime, parisInputValues } from "@/lib/format";
import { ChantierHeaderActions, StepperCard } from "./chantier-sheet";
import { ExampleLock } from "./examples";
import { ExpertiseButton } from "./expertise-button";
import {
  RequestBrief,
  RequestClientCard,
  RequestClientWords,
  RequestDetails,
} from "./request-blocks";
import {
  NextStepCard,
  SheetChip,
  SheetColumns,
  SheetHeader,
  SheetPage,
  SheetSection,
} from "./sheet";
import { SentQuoteBlock, type DepositPayment, type SentQuote } from "./sent-quote";

const t = fr.pro.appointment;
const cancellable: readonly ChantierStatus[] = ARTISAN_CANCELLABLE_STATUSES;
const FULL_RIGHTS: ChantierRights = {
  money: true,
  decisions: true,
  replyReviews: true,
  assign: true,
};

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
  rights = FULL_RIGHTS,
  teamCard = null,
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
  /** Ce que la place dans l'équipe permet (ADR 0241) ; tout par défaut (patron, exemples). */
  rights?: ChantierRights;
  /** « Équipe sur ce chantier » pour le patron ou le chef. */
  teamCard?: ReactNode;
}) {
  const status = c.chantier.status;
  // F-19 : devis à créer après le rendez-vous, ou à modifier si le client l'a demandé.
  const awaitingQuote =
    rights.money && (status === "rdv_planifie" || status === "devis_en_revision");
  const canCancel = rights.decisions && cancellable.includes(status);
  const appointment = c.appointment?.status === "planifie" ? c.appointment : null;
  const planned = status === "rdv_planifie" && appointment !== null;
  const active = status !== "annule" && status !== "cloture" && status !== "devis_refuse";

  const st = fr.pro.sheet;
  const clientFirstName = c.client.first_name ?? fr.pro.followUp.yourClientFallback;
  const step = status === "annule" ? null : chantierStepIndex(status);
  const quoteLink = awaitingQuote && (
    <ButtonLink href={`${base}/chantiers/${c.chantier.id}/devis` as Route} size="lg" block>
      {status === "devis_en_revision"
        ? fr.pro.quote.sent.edit
        : hasDraft
          ? fr.pro.quote.resume
          : fr.pro.quote.create}
    </ButtonLink>
  );
  // Carte « Prochaine étape » (ADR 0246) selon l'état du chantier avant l'acompte.
  const nextStep = awaitingQuote ? (
    <NextStepCard
      title={
        status === "devis_en_revision" ? st.next.quoteRevision(clientFirstName) : st.next.quote
      }
      text={
        status === "devis_en_revision"
          ? st.next.quoteRevisionText
          : st.next.quoteText(clientFirstName)
      }
      action={quoteLink}
    />
  ) : rights.money && status === "devis_envoye" ? (
    <NextStepCard title={st.next.quoteWaiting(clientFirstName)} text={st.next.quoteWaitingText} />
  ) : rights.money && status === "devis_signe" ? (
    <NextStepCard
      title={st.next.depositWaiting(clientFirstName)}
      text={st.next.depositWaitingText}
    />
  ) : null;

  return (
    <SheetPage>
      <SheetHeader
        backHref={`${base}/chantiers`}
        backLabel={t.back}
        chips={
          <SheetChip tone={status === "annule" ? "neutral" : "primary"} dot>
            {fr.pro.chantiers.status[status]}
          </SheetChip>
        }
        title={c.chantier.title}
        meta={[c.client.first_name, [c.code_postal, c.ville_nom].filter(Boolean).join(" ")]
          .filter(Boolean)
          .join(" · ")}
        aside={
          <ChantierHeaderActions
            messageHref={`${base}/messages/${c.chantier.id}`}
            phone={c.client.phone}
          />
        }
      />
      {status === "annule" && (
        <Alert tone="info">
          {t.cancelled(formatDay(c.chantier.cancelled_at ?? c.chantier.created_at))}
        </Alert>
      )}
      {step !== null && <StepperCard current={step} />}
      {nextStep}
      <div className="pb-6 lg:pb-0">
        <SheetColumns
          main={
            <>
              {rights.money && sentQuote && (
                <ExampleLock locked={example}>
                  <SentQuoteBlock quote={sentQuote} deposit={deposit} invoice={invoice} />
                </ExampleLock>
              )}
              <RequestBrief detail={c} />
              <RequestClientWords detail={c} photoUrls={photoUrls} title={t.reminder} />
              <RequestDetails detail={c} />
            </>
          }
          aside={
            <>
              {appointment && (
                <SheetSection
                  id="rendez-vous"
                  title={t.title}
                  action={
                    rights.decisions &&
                    planned && (
                      <ExampleLock locked={example}>
                        <RescheduleButton
                          chantierId={c.chantier.id}
                          minDate={minDate}
                          {...parisInputValues(appointment.starts_at)}
                          agenda={agenda}
                          tone="dark"
                        />
                      </ExampleLock>
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                      <CalendarDays aria-hidden="true" className="size-5" />
                    </span>
                    <span className="flex flex-col">
                      <span className="font-semibold">{formatDayLong(appointment.starts_at)}</span>
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock aria-hidden="true" className="size-3.5" />
                        <span>{formatTime(appointment.starts_at)}</span>
                      </span>
                    </span>
                  </div>
                  {planned && (
                    <ExampleLock locked={example}>
                      <a
                        href={`/agenda/${c.chantier.id}`}
                        className="inline-flex items-center gap-2 self-start text-sm font-semibold text-primary-strong hover:underline"
                      >
                        <CalendarPlus aria-hidden="true" className="size-4" />
                        {t.addToCalendar}
                      </a>
                    </ExampleLock>
                  )}
                </SheetSection>
              )}
              <RequestClientCard detail={c} />
              {teamCard}
              {c.appointment && (
                <ExampleLock locked={example}>
                  <NotesBlock chantierId={c.chantier.id} notes={c.appointment.notes} />
                </ExampleLock>
              )}
              {rights.decisions && active && (
                <ExampleLock locked={example}>
                  <ExpertiseButton requestId={c.id} trades={trades} variant="card" />
                </ExampleLock>
              )}
              {status !== "annule" && (
                <ExampleLock locked={example}>
                  <ReportProblemLink href={`/pro/chantiers/${c.chantier.id}/signaler`} />
                </ExampleLock>
              )}
              {canCancel && (
                <ExampleLock locked={example} note>
                  <CancelChantierButton chantierId={c.chantier.id} />
                </ExampleLock>
              )}
            </>
          }
        />
      </div>
    </SheetPage>
  );
}
