import {
  DEFAULT_CHANTIER_START_TIME,
  canDeclareFinished,
  chantierStepIndex,
  isJournalOpen,
  journalSummary,
  paymentProgress,
} from "@menao/core";
import type { Database } from "@menao/db";
import { CircleCheck, ShieldCheck } from "lucide-react";
import type { Route } from "next";
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
import {
  ChantierHero,
  ChantierTabs,
  PersonCard,
  ReportProblemLink,
} from "@/components/chantier/chantier-parts";
import { ChantierStatusTag } from "@/components/chantier/chantier-status-tag";
import { ChantierStepper } from "@/components/chantier/chantier-stepper";
import { JournalCard } from "@/components/chantier/journal-card";
import { NextIntervention } from "@/components/chantier/next-intervention";
import { ConversationCard } from "@/components/messages/conversation-card";
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
import { StickyActions } from "./detail";
import { ExampleLock } from "./examples";
import { RequestBlocks } from "./request-blocks";
import { ReviewSection, type ChantierReview } from "./review-section";

const t = fr.chantier;
const tf = fr.pro.followUp;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

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
}: {
  c: ChantierDetail;
  data: FollowUpData;
  tab: "suivi" | "dossier";
  startConfirmed: boolean;
  today: string;
  now: Date;
  base?: string;
  example?: boolean;
}) {
  const id = c.chantier.id;
  const status = c.chantier.status;
  const startAt = c.chantier.start_at;
  const { quote, payments, invoices, reception, review, conversation, clientRating } = data;
  const journal = journalSummary(
    data.updates.map((u) => ({
      id: u.id,
      kind: u.kind,
      message: u.message,
      storagePath: u.storage_path,
      createdAt: u.created_at,
    })),
  );
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

  return (
    <main className="flex flex-1 flex-col bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col sm:gap-5 sm:px-6 sm:py-8">
        <ChantierHero
          photoUrl={c.photos[0] ? (data.projectPhotoUrls.get(c.photos[0]) ?? null) : null}
          trade={c.trade}
          backHref={`${base}/chantiers`}
          title={c.chantier.title}
          address={address}
          tags={
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
              {depositPaid && (
                <span className="inline-flex items-center gap-1 rounded-chip bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                  <ShieldCheck aria-hidden="true" className="size-3.5" />
                  {t.depositReceived}
                </span>
              )}
            </>
          }
          description={c.description}
        >
          <ExampleLock locked={example}>
            <PersonCard
              label={t.yourClient}
              name={clientName}
              phone={c.client.phone}
              messageHref={`/pro/messages/${id}`}
            />
          </ExampleLock>
          {step !== null && <ChantierStepper current={step} />}
        </ChantierHero>
        <div className="flex flex-col gap-4 px-4 py-5 sm:px-0 sm:py-0">
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
          {status === "travaux_termines" && (
            <Alert tone="info">{tf.awaitingReception(clientFirstName)}</Alert>
          )}
          {status === "reserves_a_lever" && reception?.reserves && (
            <section
              aria-labelledby="reserves-title"
              className="flex flex-col gap-2 rounded-card border border-warning/40 bg-surface p-5 shadow-card"
            >
              <h2 id="reserves-title" className="text-[1.0625rem] font-medium">
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
          {status === "receptionne" && data.receivedAt && (
            <Alert tone="success">
              {tf.received(
                clientFirstName,
                formatDateNumeric(data.receivedAt),
                euros.format(balanceCents / 100),
              )}
            </Alert>
          )}
          {status === "cloture" && balancePayment?.paid_at && (
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
            />
          ) : (
            status === "cloture" && <Alert tone="info">{tf.reviewPending(clientFirstName)}</Alert>
          )}
          {status === "cloture" &&
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
          <ChantierTabs base={`${base}/chantiers/${id}`} active={tab} />
          {tab === "suivi" ? (
            <>
              {!conversation?.closed && (
                <ExampleLock locked={example}>
                  <ConversationCard
                    chantierId={id}
                    name={clientName}
                    lastAt={conversation?.last_at ?? null}
                    unread={conversation?.unread ?? 0}
                  />
                </ExampleLock>
              )}
              <JournalCard
                summary={journal}
                photoUrls={data.journalPhotoUrls}
                author={t.journal.you}
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
                  {status === "planifie" && startAt && (
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
              <ExampleLock locked={example}>
                <ChantierDocuments documents={documents} />
              </ExampleLock>
              <PaymentSchedule progress={progress} />
              <RequestBlocks
                detail={c}
                photoUrls={c.photos.flatMap((path) => {
                  const url = data.projectPhotoUrls.get(path);
                  return url ? [url] : [];
                })}
                variant="rendez-vous"
              />
              {c.appointment && (
                <ExampleLock locked={example}>
                  <NotesBlock chantierId={id} notes={c.appointment.notes} />
                </ExampleLock>
              )}
            </>
          )}
          <ExampleLock locked={example}>
            <ReportProblemLink href={`/pro/chantiers/${id}/signaler`} />
          </ExampleLock>
        </div>
      </div>

      {status === "acompte_paye" && (
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
      )}
      {status === "planifie" && startConfirmed && startAt && (
        <div className="sticky bottom-0 z-20 border-t border-border bg-surface px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-raised sm:px-6">
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
      {canDeclareFinished(status) && (
        <StickyActions>
          <ExampleLock locked={example} note>
            <DeclareFinishedButton chantierId={id} clientName={clientFirstName} />
          </ExampleLock>
        </StickyActions>
      )}
      {status === "reserves_a_lever" && (
        <StickyActions>
          <ExampleLock locked={example} note>
            <SignalLiftButton chantierId={id} clientName={clientFirstName} />
          </ExampleLock>
        </StickyActions>
      )}
    </main>
  );
}
