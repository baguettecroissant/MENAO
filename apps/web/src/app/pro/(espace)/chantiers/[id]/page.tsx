import {
  ARTISAN_CANCELLABLE_STATUSES,
  DEFAULT_CHANTIER_START_TIME,
  canDeclareFinished,
  chantierJournal,
  isJournalOpen,
  parisToday,
  type ChantierStatus,
} from "@menao/core";
import { CalendarDays, CalendarPlus, Clock } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { ChantierJournal } from "@/components/pro/chantier-journal";
import { DetailHeader, StickyActions } from "@/components/pro/detail";
import { ExpertiseButton } from "@/components/pro/expertise-button";
import { RequestBlocks } from "@/components/pro/request-blocks";
import { SentQuoteBlock } from "@/components/pro/sent-quote";
import { Alert, ButtonLink, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getChantierDetail } from "@/lib/artisan/chantiers";
import { requireProSpace } from "@/lib/artisan/space";
import {
  formatDay,
  formatDayInline,
  formatDayLong,
  formatTime,
  parisInputValues,
} from "@/lib/format";
import {
  CancelChantierButton,
  ChantierStartButton,
  DeclareFinishedButton,
  NotesBlock,
  RescheduleButton,
} from "./chantier-actions";

const t = fr.pro.appointment;
const tf = fr.pro.followUp;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const cancellable: readonly ChantierStatus[] = ARTISAN_CANCELLABLE_STATUSES;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/** Vue d'un rendez-vous (F-18), maquette « Vue d'un rendez-vous », puis suivi du chantier (F-22). */
export default async function ChantierPage({ params }: PageProps<"/pro/chantiers/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireProSpace();
  const c = await getChantierDetail(supabase, id);
  if (!c) notFound();

  const [
    { data: signed },
    { data: trades },
    { data: draft },
    { data: sentQuote },
    { data: updates },
    { data: finished },
  ] = await Promise.all([
    c.photos.length
      ? supabase.storage.from("project-photos").createSignedUrls(c.photos, 3600)
      : Promise.resolve({ data: [] }),
    supabase.from("trades").select("code, label").eq("active", true).order("sort_order"),
    supabase
      .from("quotes")
      .select("id")
      .eq("chantier_id", id)
      .eq("status", "brouillon")
      .maybeSingle(),
    // F-21 : dernière version envoyée (réponse du client, PDF).
    supabase
      .from("quotes")
      .select(
        "id, status, numero, total_ttc_cents, sent_at, valid_until, refusal_reason, client_message, signed_at, start_date",
      )
      .eq("chantier_id", id)
      .neq("status", "brouillon")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // F-22 : journal du chantier et date de fin des travaux.
    supabase
      .from("chantier_updates")
      .select("id, kind, message, storage_path, created_at")
      .eq("chantier_id", id)
      .order("created_at"),
    supabase
      .from("chantier_events")
      .select("created_at")
      .eq("chantier_id", id)
      .eq("event", "fin_declaree")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  // F-31, F-35 : acompte du devis signé et sa facture.
  const [{ data: deposit }, { data: invoice }] =
    sentQuote?.status === "signe"
      ? await Promise.all([
          supabase
            .from("payments")
            .select("status, amount_cents, paid_at")
            .eq("quote_id", sentQuote.id)
            .eq("kind", "acompte")
            .in("status", ["en_attente", "en_cours", "paye"])
            .maybeSingle(),
          supabase
            .from("invoices")
            .select("id, numero")
            .eq("quote_id", sentQuote.id)
            .eq("kind", "acompte")
            .maybeSingle(),
        ])
      : [{ data: null }, { data: null }];
  const journal = chantierJournal(
    (updates ?? []).map((u) => ({
      id: u.id,
      kind: u.kind,
      message: u.message,
      storagePath: u.storage_path,
      createdAt: u.created_at,
    })),
  );
  const photoPaths = journal.flatMap((e) => (e.kind === "photos" ? e.paths : []));
  const { data: photoSigned } = photoPaths.length
    ? await supabase.storage.from("chantier-photos").createSignedUrls(photoPaths, 3600)
    : { data: [] };
  const photoUrls = new Map(
    (photoSigned ?? []).flatMap((p) => (p.path && p.signedUrl ? [[p.path, p.signedUrl]] : [])),
  );
  const status = c.chantier.status;
  const startAt = c.chantier.start_at;
  // F-22 : après l'acompte, la fiche devient le suivi du chantier.
  const following = status === "acompte_paye" || isJournalOpen(status);
  const today = parisToday();
  const quoteStart = sentQuote?.start_date ?? null;
  // F-19 : devis à créer après le rendez-vous, ou à modifier si le client l'a demandé.
  const awaitingQuote = status === "rdv_planifie" || status === "devis_en_revision";
  const appointment = c.appointment?.status === "planifie" ? c.appointment : null;
  const planned = status === "rdv_planifie" && appointment !== null;
  const active = status !== "annule" && status !== "cloture" && status !== "devis_refuse";
  const actions =
    awaitingQuote ||
    cancellable.includes(status) ||
    status === "acompte_paye" ||
    canDeclareFinished(status);

  return (
    <main className="flex flex-1 flex-col">
      <DetailHeader
        backHref="/pro/chantiers"
        backLabel={t.back}
        title={following ? tf.title : t.title}
      >
        {following ? (
          status === "planifie" && startAt ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays aria-hidden="true" className="size-4" />
                {tf.startsOn(formatDayInline(startAt))}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock aria-hidden="true" className="size-4" />
                {formatTime(startAt)}
              </span>
              <ChantierStartButton
                chantierId={c.chantier.id}
                mode="edit"
                minDate={today}
                {...parisInputValues(startAt)}
              />
            </div>
          ) : (
            <p className="text-sm text-white/85">
              {status === "acompte_paye"
                ? tf.validated
                : status === "en_cours" && startAt
                  ? tf.startedOn(formatDayInline(startAt))
                  : fr.pro.chantiers.status[status]}
            </p>
          )
        ) : appointment ? (
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
              <RescheduleButton
                chantierId={c.chantier.id}
                minDate={today}
                {...parisInputValues(appointment.starts_at)}
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-white/85">{fr.pro.chantiers.status[status]}</p>
        )}
        {planned && (
          <a
            href={`/agenda/${c.chantier.id}`}
            className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-pill border border-white/60 px-3.5 text-sm font-medium text-white hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            <CalendarPlus aria-hidden="true" className="size-4" />
            {t.addToCalendar}
          </a>
        )}
      </DetailHeader>
      {active && <ExpertiseButton requestId={c.id} trades={trades ?? []} />}

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
        {status === "acompte_paye" && <Alert tone="success">{tf.confirmIntro}</Alert>}
        {status === "planifie" && startAt && (
          <Alert tone="info">{tf.autoStart(formatDayInline(startAt))}</Alert>
        )}
        {status === "travaux_termines" && finished && (
          <Alert tone="success">{tf.finishedOn(formatDayInline(finished.created_at))}</Alert>
        )}
        {(isJournalOpen(status) || journal.length > 0) && (
          <ChantierJournal
            chantierId={c.chantier.id}
            entries={journal}
            photoUrls={photoUrls}
            open={isJournalOpen(status)}
          />
        )}
        {sentQuote && <SentQuoteBlock quote={sentQuote} deposit={deposit} invoice={invoice} />}
        <RequestBlocks
          detail={c}
          photoUrls={(signed ?? []).flatMap((p) => (p.signedUrl ? [p.signedUrl] : []))}
          variant="rendez-vous"
        />
        {c.appointment && <NotesBlock chantierId={c.chantier.id} notes={c.appointment.notes} />}
      </div>

      {actions && (
        <StickyActions>
          {awaitingQuote && (
            <ButtonLink href={`/pro/chantiers/${c.chantier.id}/devis` as Route} size="lg" block>
              {status === "devis_en_revision"
                ? fr.pro.quote.sent.edit
                : draft
                  ? fr.pro.quote.resume
                  : fr.pro.quote.create}
            </ButtonLink>
          )}
          {status === "acompte_paye" && (
            <ChantierStartButton
              chantierId={c.chantier.id}
              mode="confirm"
              minDate={today}
              date={quoteStart && quoteStart >= today ? quoteStart : undefined}
              time={DEFAULT_CHANTIER_START_TIME}
              hint={quoteStart ? tf.quoteStart(formatDayInline(quoteStart)) : undefined}
            />
          )}
          {canDeclareFinished(status) && (
            <DeclareFinishedButton chantierId={c.chantier.id} photoCount={photoPaths.length} />
          )}
          {cancellable.includes(status) && <CancelChantierButton chantierId={c.chantier.id} />}
        </StickyActions>
      )}
    </main>
  );
}
