import {
  DEFAULT_CHANTIER_START_TIME,
  canDeclareFinished,
  chantierStepIndex,
  isJournalOpen,
  paymentProgress,
  type ChantierRights,
} from "@menao/core";
import type { Database } from "@menao/db";
import { CircleCheck, ShieldCheck } from "lucide-react";
import type { Route } from "next";
import type { ReactNode } from "react";
import {
  ChantierStartPanel,
  DeclareFinishedButton,
  EditChantierStartButton,
  NotesBlock,
  SignalLiftButton,
} from "@/app/pro/(espace)/chantiers/[id]/chantier-actions";
import {
  ChantierDocuments,
  PaymentSchedule,
  type ChantierDocument,
} from "@/components/chantier/chantier-dossier";
import { ReportProblemLink } from "@/components/chantier/chantier-parts";
import { ChantierStatusTag } from "@/components/chantier/chantier-status-tag";
import { NextIntervention } from "@/components/chantier/next-intervention";
import { Alert, ButtonLink, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { AppointmentAgenda } from "@/lib/artisan/agenda";
import type { ChantierDetail } from "@/lib/artisan/chantiers";
import { chantierTag, nextIntervention } from "@/lib/chantier/view";
import {
  formatDateNumeric,
  formatDayFull,
  formatDayInline,
  formatTime,
  parisInputValues,
} from "@/lib/format";
import { ClientRatingForm } from "./client-rating-form";
import { LockedJournalActions, MessageComposer, PhotoUpload } from "./chantier-journal-forms";
import {
  ChantierHeaderActions,
  ChantierMoneyCard,
  ChantierPillTabs,
  JournalTimelineCard,
  StepperCard,
} from "./chantier-sheet";
import { ExampleLock } from "./examples";
import {
  RequestBrief,
  RequestClientCard,
  RequestClientWords,
  RequestDetails,
} from "./request-blocks";
import { ReviewSection, type ChantierReview } from "./review-section";
import { NextStepCard, SheetColumns, SheetHeader, SheetPage } from "./sheet";

const t = fr.chantier;
const tf = fr.pro.followUp;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const FULL_RIGHTS: ChantierRights = {
  money: true,
  decisions: true,
  replyReviews: true,
  assign: true,
};

type Tables = Database["public"]["Tables"];

/** Données du suivi d'un chantier, lues en base (ou exemples, ADR 0184). */
export type FollowUpData = {
  quote: Pick<
    Tables["quotes"]["Row"],
    "id" | "status" | "numero" | "sent_at" | "signed_at" | "total_ttc_cents" | "start_date"
  > | null;
  payments: Pick<
    Tables["payments"]["Row"],
    "quote_id" | "kind" | "status" | "amount_cents" | "paid_at"
  >[];
  invoices: Pick<Tables["invoices"]["Row"], "id" | "numero" | "kind" | "issued_on">[];
  updates: Pick<
    Tables["chantier_updates"]["Row"],
    "id" | "kind" | "message" | "storage_path" | "created_at"
  >[];
  finishedAt: string | null;
  reception: Pick<
    Tables["receptions"]["Row"],
    "id" | "numero" | "status" | "reserves" | "signed_at" | "lift_signaled_at"
  > | null;
  receivedAt: string | null;
  review: ChantierReview | null;
  openTicketId: string | null;
  conversation: { last_at: string | null; unread: number; closed: boolean } | null;
  clientRating: Pick<
    Tables["client_ratings"]["Row"],
    "welcome" | "clarity" | "payment" | "created_at"
  > | null;
  ratingsVisible: boolean;
  /** Photos du journal et du projet : chemin → adresse affichable. */
  journalPhotoUrls: Map<string, string>;
  projectPhotoUrls: Map<string, string>;
  /** F-44 : avertissements de la date de démarrage (absence, hors horaires, conflit). */
  agenda?: AppointmentAgenda;
  /** Auteur des entrées des collègues (ADR 0243). */
  updateAuthors?: Record<string, string>;
};

/**
 * Vue d'un chantier côté artisan après l'acompte (F-22, maquettes « Vue d'un chantier ») :
 * confirmation de la date de démarrage, journal (photos, messages) pendant les travaux,
 * « Déclarer le chantier terminé », dossier (documents, échéancier, client). Exemple (ADR 0184) :
 * mêmes blocs, actions inactives, onglets vers les pages d'exemples (`base`).
 */
export function ArtisanFollowUpView({
  c,
  data,
  tab,
  startConfirmed,
  today,
  now,
  base = "/pro",
  example = false,
  rights = FULL_RIGHTS,
  teamCard = null,
}: {
  c: ChantierDetail;
  data: FollowUpData;
  tab: "suivi" | "dossier";
  startConfirmed: boolean;
  today: string;
  now: Date;
  base?: string;
  example?: boolean;
  /** Ce que la place dans l'équipe permet (ADR 0241) ; tout par défaut (patron, exemples). */
  rights?: ChantierRights;
  /** « Équipe sur ce chantier » pour le patron ou le chef. */
  teamCard?: ReactNode;
}) {
  const id = c.chantier.id;
  const status = c.chantier.status;
  const startAt = c.chantier.start_at;
  const { quote, payments, invoices, reception, review, conversation, clientRating } = data;
  const clientName =
    [c.client.first_name, c.client.last_name].filter(Boolean).join(" ") || tf.yourClientFallback;
  const clientFirstName = c.client.first_name ?? tf.yourClientFallback;
  const depositPaid = payments.some((p) => p.kind === "acompte" && p.status === "paye");
  const balancePayment = payments.find((p) => p.kind === "solde" && p.status === "paye") ?? null;
  const documents: ChantierDocument[] = [
    ...(quote?.numero
      ? [
          {
            href: `/devis/${quote.id}/pdf`,
            title: quote.status === "signe" ? t.dossier.signedQuote : t.dossier.quote,
            meta: t.dossier.meta(
              quote.numero,
              formatDateNumeric(quote.signed_at ?? quote.sent_at ?? c.chantier.created_at),
            ),
          },
        ]
      : []),
    ...invoices.map((i) => ({
      href: `/factures/${i.id}/pdf`,
      title: t.dossier.invoice[i.kind],
      meta: t.dossier.meta(i.numero, formatDateNumeric(i.issued_on)),
    })),
    ...(reception?.status === "signe" && reception.signed_at
      ? [
          {
            href: `/receptions/${reception.id}/pdf`,
            title: t.reception.pvDocument,
            meta: t.dossier.meta(reception.numero, formatDateNumeric(reception.signed_at)),
          },
        ]
      : []),
  ];
  const progress =
    quote?.status === "signe"
      ? paymentProgress(
          quote.total_ttc_cents,
          payments
            .filter((p) => p.quote_id === quote.id)
            .map((p) => ({ status: p.status, amountCents: p.amount_cents })),
        )
      : null;
  // Solde restant (réceptionné) : total du devis − paiements reçus.
  const balanceCents = progress?.remainingCents ?? 0;
  const step = chantierStepIndex(status);
  const open = isJournalOpen(status);
  const next = nextIntervention({ status, appointmentAt: null, startAt });
  const quoteStart = quote?.start_date ?? null;
  const address = c.adresse ?? ([c.code_postal, c.ville_nom].filter(Boolean).join(" ") || null);

  const deposit = payments.find((p) => p.kind === "acompte" && p.quote_id === quote?.id) ?? null;
  const st = fr.pro.sheet;
  // Carte « Prochaine étape » (ADR 0246) : ce qu'il faut faire maintenant, avec le bouton qui le fait.
  const nextStep =
    rights.decisions && canDeclareFinished(status) ? (
      <NextStepCard
        title={st.next.finish}
        text={
          rights.money && progress
            ? st.next.finishTextBalance(
                clientFirstName,
                euros.format(progress.remainingCents / 100),
              )
            : st.next.finishText(clientFirstName)
        }
        action={
          <ExampleLock locked={example} note>
            <DeclareFinishedButton chantierId={id} clientName={clientFirstName} />
          </ExampleLock>
        }
      />
    ) : rights.decisions && status === "reserves_a_lever" ? (
      <NextStepCard
        title={st.next.reserves}
        text={st.next.reservesText(clientFirstName)}
        action={
          <ExampleLock locked={example} note>
            <SignalLiftButton chantierId={id} clientName={clientFirstName} />
          </ExampleLock>
        }
      />
    ) : status === "travaux_termines" ? (
      <NextStepCard
        title={st.next.reception(clientFirstName)}
        text={tf.awaitingReception(clientFirstName)}
      />
    ) : rights.decisions && status === "acompte_paye" ? (
      <NextStepCard title={st.next.start} text={st.next.startText} />
    ) : null;

  return (
    <SheetPage>
      <SheetHeader
        backHref={`${base}/chantiers`}
        backLabel={fr.pro.appointment.back}
        chips={
          <>
            <ChantierStatusTag
              tag={chantierTag({
                status,
                startAt,
                finishedAt: data.finishedAt,
                closedAt: status === "cloture" ? (balancePayment?.paid_at ?? null) : null,
                receivedAt: data.receivedAt,
              })}
            />
            {rights.money && depositPaid && (
              <span className="inline-flex items-center gap-1 rounded-chip bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
                <ShieldCheck aria-hidden="true" className="size-3.5" />
                {t.depositReceived}
              </span>
            )}
          </>
        }
        title={c.chantier.title}
        meta={[c.client.first_name, [c.code_postal, c.ville_nom].filter(Boolean).join(" ")]
          .filter(Boolean)
          .join(" · ")}
        aside={
          <ChantierHeaderActions messageHref={`${base}/messages/${id}`} phone={c.client.phone} />
        }
      />
      {(status === "en_litige" || data.openTicketId) && (
        <Alert tone="info">
          {status === "en_litige" ? fr.dispute.ongoing : fr.dispute.pending}
          {data.openTicketId && (
            <>
              {" "}
              <TextLink href={`/signalements/${data.openTicketId}` as Route}>
                {fr.dispute.follow}
              </TextLink>
            </>
          )}
        </Alert>
      )}
      {step !== null && <StepperCard current={step} />}
      {nextStep}
      <div className="pb-6 lg:pb-0">
        <SheetColumns
          main={
            <>
              {status === "reserves_a_lever" && reception?.reserves && (
                <section
                  aria-labelledby="reserves-title"
                  className="flex flex-col gap-2 rounded-card border border-warning/40 bg-surface p-5 shadow-card"
                >
                  <h2 id="reserves-title" className="text-lg">
                    {tf.reservesTitle(clientFirstName)}
                  </h2>
                  <p className="text-sm whitespace-pre-line">{reception.reserves}</p>
                  <p className="text-xs text-muted-foreground">{tf.reservesNext}</p>
                </section>
              )}
              {status === "reserves_a_lever" && reception?.lift_signaled_at && (
                <Alert tone="info">
                  {tf.liftSignaled(clientFirstName, formatDateNumeric(reception.lift_signaled_at))}
                </Alert>
              )}
              {rights.money && status === "receptionne" && data.receivedAt && (
                <Alert tone="success">
                  {tf.received(
                    clientFirstName,
                    formatDateNumeric(data.receivedAt),
                    euros.format(balanceCents / 100),
                  )}
                </Alert>
              )}
              {rights.money && status === "cloture" && balancePayment?.paid_at && (
                <Alert tone="success">
                  {tf.closed(
                    formatDateNumeric(balancePayment.paid_at),
                    euros.format(balancePayment.amount_cents / 100),
                  )}
                </Alert>
              )}
              {review ? (
                <ReviewSection
                  review={review}
                  chantierId={id}
                  heading={tf.reviewTitle(clientFirstName)}
                  canReply={rights.replyReviews}
                />
              ) : (
                status === "cloture" && (
                  <Alert tone="info">{tf.reviewPending(clientFirstName)}</Alert>
                )
              )}
              {rights.decisions &&
                status === "cloture" &&
                (clientRating ? (
                  <Alert tone="info">
                    {fr.pro.clientRating.done(
                      formatDateNumeric(clientRating.created_at),
                      clientRating.welcome,
                      clientRating.clarity,
                      clientRating.payment,
                    )}
                  </Alert>
                ) : (
                  <ClientRatingForm
                    chantierId={id}
                    clientName={clientFirstName}
                    visibleToNetwork={data.ratingsVisible}
                  />
                ))}
              <ChantierPillTabs
                base={`${base}/chantiers/${id}`}
                active={tab}
                messagesHref={`${base}/messages/${id}`}
                unread={conversation?.unread ?? 0}
              />
              {tab === "suivi" ? (
                <>
                  <JournalTimelineCard
                    updates={data.updates.map((u) => ({
                      id: u.id,
                      kind: u.kind,
                      message: u.message,
                      storagePath: u.storage_path,
                      createdAt: u.created_at,
                    }))}
                    photoUrls={data.journalPhotoUrls}
                    authors={data.updateAuthors}
                    intro={open ? t.journal.artisanIntro(clientFirstName) : t.journal.artisanLocked}
                    photoAction={
                      open ? (
                        <ExampleLock locked={example}>
                          <PhotoUpload chantierId={id} />
                        </ExampleLock>
                      ) : undefined
                    }
                    messageAction={
                      <ExampleLock locked={example}>
                        {open ? <MessageComposer chantierId={id} /> : <LockedJournalActions />}
                      </ExampleLock>
                    }
                    now={now}
                  />
                  {next && (
                    <NextIntervention
                      chantierId={id}
                      next={next}
                      title={c.chantier.title}
                      location={address}
                      artisanName={null}
                      clientName={clientName}
                    >
                      {rights.decisions && status === "planifie" && startAt && (
                        <ExampleLock locked={example}>
                          <EditChantierStartButton
                            chantierId={id}
                            minDate={today}
                            {...parisInputValues(startAt)}
                            agenda={data.agenda}
                          />
                        </ExampleLock>
                      )}
                    </NextIntervention>
                  )}
                </>
              ) : (
                <>
                  {rights.money && (
                    <>
                      <ExampleLock locked={example}>
                        <ChantierDocuments documents={documents} />
                      </ExampleLock>
                      <PaymentSchedule progress={progress} />
                    </>
                  )}
                  <RequestBrief detail={c} />
                  <RequestClientWords
                    detail={c}
                    title={fr.pro.appointment.reminder}
                    photoUrls={c.photos.flatMap((path) => {
                      const url = data.projectPhotoUrls.get(path);
                      return url ? [url] : [];
                    })}
                  />
                  <RequestDetails detail={c} />
                </>
              )}
            </>
          }
          aside={
            <>
              {rights.money && quote?.status === "signe" && progress && (
                <ChantierMoneyCard
                  totalCents={quote.total_ttc_cents}
                  signed
                  paidCents={progress.paidCents}
                  deposit={
                    deposit ? { amountCents: deposit.amount_cents, paidAt: deposit.paid_at } : null
                  }
                  balance={{
                    amountCents: balancePayment?.amount_cents ?? progress.remainingCents,
                    paid: balancePayment !== null,
                  }}
                  quoteHref={quote.numero ? `/devis/${quote.id}/pdf` : null}
                  links={invoices.map((i) => ({
                    href: `/factures/${i.id}/pdf`,
                    label: t.dossier.invoice[i.kind],
                  }))}
                />
              )}
              <RequestClientCard detail={c} />
              {teamCard}
              {c.appointment && (
                <ExampleLock locked={example}>
                  <NotesBlock chantierId={id} notes={c.appointment.notes} />
                </ExampleLock>
              )}
              <ExampleLock locked={example}>
                <ReportProblemLink href={`/pro/chantiers/${id}/signaler`} />
              </ExampleLock>
            </>
          }
        />
      </div>

      {rights.decisions && status === "acompte_paye" && (
        <div className="sticky bottom-0 z-20 order-last -mx-4 sm:-mx-6 lg:mx-0">
          <ExampleLock locked={example} note>
            <ChantierStartPanel
              chantierId={id}
              minDate={today}
              date={quoteStart && quoteStart >= today ? quoteStart : undefined}
              time={DEFAULT_CHANTIER_START_TIME}
              hint={quoteStart ? tf.quoteStart(formatDayInline(quoteStart)) : undefined}
              agenda={data.agenda}
            />
          </ExampleLock>
        </div>
      )}
      {status === "planifie" && startConfirmed && startAt && (
        <div className="sticky bottom-0 z-20 order-last -mx-4 border-t border-border bg-surface px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-raised sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-card lg:border">
          <div role="status" className="mx-auto flex max-w-3xl flex-col gap-3">
            <p className="flex items-center gap-2 font-medium text-success">
              <CircleCheck aria-hidden="true" className="size-5" />
              {tf.confirmedTitle}
            </p>
            <p className="text-sm">
              {tf.confirmed(formatDayFull(startAt), formatTime(startAt), clientFirstName)}
            </p>
            <ButtonLink href="/pro/tableau-de-bord" size="lg" block>
              {tf.dashboard}
            </ButtonLink>
          </div>
        </div>
      )}
    </SheetPage>
  );
}
