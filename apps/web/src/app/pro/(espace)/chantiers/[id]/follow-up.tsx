import {
  DEFAULT_CHANTIER_START_TIME,
  canDeclareFinished,
  chantierStepIndex,
  isJournalOpen,
  journalSummary,
  parisToday,
  paymentProgress,
} from "@menao/core";
import { CircleCheck, ShieldCheck } from "lucide-react";
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
import {
  LockedJournalActions,
  MessageComposer,
  PhotoUpload,
} from "@/components/pro/chantier-journal-forms";
import { StickyActions } from "@/components/pro/detail";
import { RequestBlocks } from "@/components/pro/request-blocks";
import { Alert, ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { ChantierDetail } from "@/lib/artisan/chantiers";
import { signedUrlMap } from "@/lib/chantier/storage";
import { chantierTag, nextIntervention } from "@/lib/chantier/view";
import {
  formatDateNumeric,
  formatDayFull,
  formatDayInline,
  formatTime,
  parisInputValues,
} from "@/lib/format";
import type { createClient } from "@/lib/supabase/server";
import {
  ChantierStartPanel,
  DeclareFinishedButton,
  EditChantierStartButton,
  NotesBlock,
  SignalLiftButton,
} from "./chantier-actions";

const t = fr.chantier;
const tf = fr.pro.followUp;

/**
 * Vue d'un chantier côté artisan après l'acompte (F-22, maquettes « Vue d'un chantier ») :
 * confirmation de la date de démarrage, journal (photos, messages) pendant les travaux,
 * « Déclarer le chantier terminé », dossier (documents, échéancier, client).
 */
export async function ArtisanFollowUp({
  supabase,
  c,
  tab,
  startConfirmed,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  c: ChantierDetail;
  tab: "suivi" | "dossier";
  startConfirmed: boolean;
}) {
  const id = c.chantier.id;
  const status = c.chantier.status;
  const startAt = c.chantier.start_at;
  const [
    { data: quote },
    { data: payments },
    { data: invoices },
    { data: updates },
    { data: finished },
    { data: reception },
    { data: received },
  ] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, status, numero, sent_at, signed_at, total_ttc_cents, start_date")
      .eq("chantier_id", id)
      .neq("status", "brouillon")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("payments").select("quote_id, kind, status, amount_cents").eq("chantier_id", id),
    supabase
      .from("invoices")
      .select("id, numero, kind, issued_on")
      .eq("chantier_id", id)
      .order("issued_on"),
    supabase
      .from("chantier_updates")
      .select("id, kind, message, storage_path, created_at")
      .eq("chantier_id", id),
    supabase
      .from("chantier_events")
      .select("created_at")
      .eq("chantier_id", id)
      .eq("event", "fin_declaree")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // F-25, F-26 : PV de réception et date de réception.
    supabase
      .from("receptions")
      .select("id, numero, status, reserves, signed_at, lift_signaled_at")
      .eq("chantier_id", id)
      .maybeSingle(),
    supabase
      .from("chantier_events")
      .select("created_at")
      .eq("chantier_id", id)
      .eq("to_status", "receptionne")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const journal = journalSummary(
    (updates ?? []).map((u) => ({
      id: u.id,
      kind: u.kind,
      message: u.message,
      storagePath: u.storage_path,
      createdAt: u.created_at,
    })),
  );
  const [photos, projectPhotos] = await Promise.all([
    signedUrlMap(supabase, "chantier-photos", journal.photos),
    signedUrlMap(supabase, "project-photos", c.photos),
  ]);

  const clientName =
    [c.client.first_name, c.client.last_name].filter(Boolean).join(" ") || tf.yourClientFallback;
  const clientFirstName = c.client.first_name ?? tf.yourClientFallback;
  const depositPaid = (payments ?? []).some((p) => p.kind === "acompte" && p.status === "paye");
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
    ...(invoices ?? []).map((i) => ({
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
          (payments ?? [])
            .filter((p) => p.quote_id === quote.id)
            .map((p) => ({ status: p.status, amountCents: p.amount_cents })),
        )
      : null;
  const step = chantierStepIndex(status);
  const open = isJournalOpen(status);
  const next = nextIntervention({ status, appointmentAt: null, startAt });
  const today = parisToday();
  const quoteStart = quote?.start_date ?? null;
  const address = c.adresse ?? ([c.code_postal, c.ville_nom].filter(Boolean).join(" ") || null);

  return (
    <main className="flex flex-1 flex-col bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col sm:gap-5 sm:px-6 sm:py-8">
        <ChantierHero
          photoUrl={c.photos[0] ? (projectPhotos.get(c.photos[0]) ?? null) : null}
          backHref="/pro/chantiers"
          title={c.chantier.title}
          address={address}
          tags={
            <>
              <ChantierStatusTag
                tag={chantierTag({
                  status,
                  startAt,
                  finishedAt: finished?.created_at ?? null,
                  closedAt: null,
                  receivedAt: received?.created_at ?? null,
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
          <PersonCard label={t.yourClient} name={clientName} phone={c.client.phone} />
          {step !== null && <ChantierStepper current={step} />}
        </ChantierHero>
        <div className="flex flex-col gap-4 px-4 py-5 sm:px-0 sm:py-0">
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
          {status === "receptionne" && received && (
            <Alert tone="success">
              {tf.received(clientFirstName, formatDateNumeric(received.created_at))}
            </Alert>
          )}
          <ChantierTabs base={`/pro/chantiers/${id}`} active={tab} />
          {tab === "suivi" ? (
            <>
              <JournalCard
                summary={journal}
                photoUrls={photos}
                author={t.journal.you}
                intro={open ? t.journal.artisanIntro(clientFirstName) : t.journal.artisanLocked}
                photoAction={open ? <PhotoUpload chantierId={id} /> : undefined}
                messageAction={
                  open ? <MessageComposer chantierId={id} /> : <LockedJournalActions />
                }
                now={new Date()}
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
                    <EditChantierStartButton
                      chantierId={id}
                      minDate={today}
                      {...parisInputValues(startAt)}
                    />
                  )}
                </NextIntervention>
              )}
            </>
          ) : (
            <>
              <ChantierDocuments documents={documents} />
              <PaymentSchedule progress={progress} />
              <RequestBlocks
                detail={c}
                photoUrls={c.photos.flatMap((path) => {
                  const url = projectPhotos.get(path);
                  return url ? [url] : [];
                })}
                variant="rendez-vous"
              />
              {c.appointment && <NotesBlock chantierId={id} notes={c.appointment.notes} />}
            </>
          )}
          <ReportProblemLink />
        </div>
      </div>

      {status === "acompte_paye" && (
        <ChantierStartPanel
          chantierId={id}
          minDate={today}
          date={quoteStart && quoteStart >= today ? quoteStart : undefined}
          time={DEFAULT_CHANTIER_START_TIME}
          hint={quoteStart ? tf.quoteStart(formatDayInline(quoteStart)) : undefined}
        />
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
          <DeclareFinishedButton chantierId={id} clientName={clientFirstName} />
        </StickyActions>
      )}
      {status === "reserves_a_lever" && (
        <StickyActions>
          <SignalLiftButton chantierId={id} clientName={clientFirstName} />
        </StickyActions>
      )}
    </main>
  );
}
