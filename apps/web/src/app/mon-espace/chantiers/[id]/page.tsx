import {
  CLIENT_CANCELLABLE_STATUSES,
  chantierStepIndex,
  clientChantierAction,
  journalSummary,
  paymentProgress,
  reviewInvited,
  type ChantierStatus,
} from "@menao/core";
import { CircleCheck } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ChantierActionBlock } from "@/components/chantier/chantier-action";
import { addressOf } from "@/components/chantier/chantier-card";
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
import { ConfirmLiftActions, ReceptionActions } from "@/components/chantier/reception-actions";
import { ReviewInvite } from "@/components/review/review-invite";
import { CancelChantierButton } from "@/components/project/cancel-buttons";
import { Alert, ButtonLink, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { avatarUrl, signedUrlMap } from "@/lib/chantier/storage";
import { chantierTag, nextIntervention } from "@/lib/chantier/view";
import { formatDateNumeric } from "@/lib/format";
import { rehirePath } from "@/lib/project/paths";
import { createClient } from "@/lib/supabase/server";

const t = fr.chantier;
const cancellable: readonly ChantierStatus[] = CLIENT_CANCELLABLE_STATUSES;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const STARTED: readonly ChantierStatus[] = [
  "en_cours",
  "travaux_termines",
  "reserves_a_lever",
  "receptionne",
  "cloture",
];

export const metadata: Metadata = { title: `${t.tabs.suivi} — MENAO` };

/**
 * Vue d'un chantier côté client (F-12, maquette « Vue d'un chantier ») : avancement, artisan,
 * onglets « Suivi du chantier » (journal, prochaine intervention) et « Dossier du chantier »
 * (documents, échéancier). particulier_chantiers ne renvoie rien aux autres comptes.
 */
export default async function ClientChantierPage({
  params,
  searchParams,
}: PageProps<"/mon-espace/chantiers/[id]">) {
  const { id } = await params;
  const { onglet, reception: signed, paiement } = await searchParams;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous)
    redirect(`/connexion?next=/mon-espace/chantiers/${id}` as Route);

  const { data: rows } = await supabase.rpc("particulier_chantiers", { p_chantier_id: id });
  const c = rows?.[0];
  if (!c) notFound();
  const tab = onglet === "dossier" ? "dossier" : "suivi";
  const status = c.status as ChantierStatus;

  const [
    { data: updates },
    { data: quotes },
    { data: payments },
    { data: invoices },
    { data: reception },
    { data: review },
    { data: openTicket },
  ] = await Promise.all([
    supabase
      .from("chantier_updates")
      .select("id, kind, message, storage_path, created_at")
      .eq("chantier_id", id),
    supabase
      .from("quotes")
      .select("id, status, numero, sent_at, signed_at, total_ttc_cents")
      .eq("chantier_id", id)
      .neq("status", "brouillon")
      .order("version", { ascending: false })
      .limit(1),
    supabase.from("payments").select("quote_id, status, amount_cents").eq("chantier_id", id),
    supabase
      .from("invoices")
      .select("id, numero, kind, issued_on")
      .eq("chantier_id", id)
      .order("issued_on"),
    // F-25, F-26 : PV de réception.
    supabase
      .from("receptions")
      .select("id, numero, status, reserves, signed_at, lift_signaled_at, lift_message")
      .eq("chantier_id", id)
      .maybeSingle(),
    // F-28 : avis déjà laissé sur ce chantier.
    supabase.from("reviews").select("id").eq("chantier_id", id).maybeSingle(),
    // F-42 : signalement du client en cours sur ce chantier.
    supabase
      .from("tickets")
      .select("id")
      .eq("chantier_id", id)
      .eq("type", "litige")
      .neq("status", "resolu")
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
  const [photos, cover] = await Promise.all([
    signedUrlMap(supabase, "chantier-photos", journal.photos),
    signedUrlMap(supabase, "project-photos", [c.photo_path]),
  ]);

  const quote = quotes?.[0] ?? null;
  const documents: ChantierDocument[] = [
    ...(quote?.numero
      ? [
          {
            href: `/devis/${quote.id}/pdf`,
            title: quote.status === "signe" ? t.dossier.signedQuote : t.dossier.quote,
            meta: t.dossier.meta(
              quote.numero,
              formatDateNumeric(quote.signed_at ?? quote.sent_at ?? c.created_at),
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
  const action = clientChantierAction({
    status,
    quoteId: c.quote_id,
    quoteStatus: c.quote_status,
    depositCents: c.deposit_cents,
    depositStatus: c.deposit_status,
    balanceCents: c.balance_cents,
    balanceStatus: c.balance_status,
  });
  const next = nextIntervention({ status, appointmentAt: c.appointment_at, startAt: c.start_at });
  const started = STARTED.includes(status);
  const empty = journal.photos.length === 0 && journal.messages.length === 0;

  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col sm:gap-5 sm:px-6 sm:py-8">
        <ChantierHero
          photoUrl={c.photo_path ? (cover.get(c.photo_path) ?? null) : null}
          backHref="/mon-espace"
          title={c.title}
          address={addressOf(c)}
          tags={
            <ChantierStatusTag
              tag={chantierTag({
                status,
                startAt: c.start_at,
                finishedAt: c.finished_at,
                closedAt: c.closed_at,
                receivedAt: c.received_at,
              })}
            />
          }
          description={c.description}
        >
          <PersonCard
            label={t.yourArtisan}
            name={c.artisan_name}
            detail={c.trade_label}
            verified
            photoUrl={avatarUrl(supabase, c.artisan_avatar_path)}
            phone={c.artisan_phone}
            messageHref={`/mon-espace/messages/${id}`}
          />
          {reviewInvited(status, review !== null) && (
            <ReviewInvite chantierId={id} artisanName={c.artisan_name} />
          )}
          {step !== null && (
            <div className="flex flex-col gap-3">
              <ChantierStepper current={step} />
              {status === "cloture" && c.closed_at && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-success" />
                  {t.reception.closed(formatDateNumeric(c.closed_at))}
                </p>
              )}
            </div>
          )}
        </ChantierHero>
        <div className="flex flex-col gap-4 px-4 py-5 sm:px-0 sm:py-0">
          {action && (
            <ChantierActionBlock
              action={action}
              totalTtcCents={c.quote_total_ttc_cents}
              chantierId={id}
            />
          )}
          {(status === "en_litige" || openTicket) && (
            <Alert tone="info">
              {status === "en_litige" ? fr.dispute.ongoing : fr.dispute.pending}
              {openTicket && (
                <>
                  {" "}
                  <TextLink href={`/signalements/${openTicket.id}` as Route}>
                    {fr.dispute.follow}
                  </TextLink>
                </>
              )}
            </Alert>
          )}
          {status === "travaux_termines" && signed === "signee" && (
            <Alert tone="info">{t.reception.processing}</Alert>
          )}
          {status === "reserves_a_lever" && reception?.reserves && (
            <section
              aria-labelledby="reserves-title"
              className="flex flex-col gap-2 rounded-card border border-warning/40 bg-surface p-5 shadow-card"
            >
              <h2 id="reserves-title" className="text-[1.0625rem] font-medium">
                {t.reception.yourReserves}
              </h2>
              <p className="text-sm whitespace-pre-line">{reception.reserves}</p>
              <p className="text-xs text-muted-foreground">{t.reception.reservesNext}</p>
            </section>
          )}
          {status === "reserves_a_lever" && reception?.lift_signaled_at && (
            <Alert tone="info">
              {t.reception.liftSignaled(
                c.artisan_name,
                formatDateNumeric(reception.lift_signaled_at),
              )}
              {reception.lift_message && (
                <span className="mt-1 block whitespace-pre-line italic">
                  « {reception.lift_message} »
                </span>
              )}
            </Alert>
          )}
          {status === "receptionne" && paiement === "termine" && (
            <Alert tone="info">{t.reception.balanceProcessing}</Alert>
          )}
          {status === "receptionne" && paiement !== "termine" && c.received_at && (
            <Alert tone="success">{t.reception.received(formatDateNumeric(c.received_at))}</Alert>
          )}
          <ChantierTabs base={`/mon-espace/chantiers/${id}`} active={tab} />
          {tab === "suivi" ? (
            <>
              <JournalCard
                summary={journal}
                photoUrls={photos}
                author={c.artisan_name}
                intro={empty && !started ? t.journal.clientIntro(c.artisan_name) : undefined}
                emptyText={
                  started
                    ? t.journal.clientEmpty(c.artisan_name)
                    : t.journal.clientWaiting(c.artisan_name)
                }
                now={new Date()}
              />
              {next && (
                <NextIntervention
                  chantierId={id}
                  next={next}
                  title={c.title}
                  location={addressOf(c)}
                  artisanName={c.artisan_name}
                  clientName={null}
                />
              )}
            </>
          ) : (
            <>
              <ChantierDocuments documents={documents} />
              <PaymentSchedule progress={progress} />
            </>
          )}
          {status === "cloture" && (
            <ButtonLink
              href={rehirePath(c.artisan_id, id, c.artisan_name) as Route}
              variant="outline"
              className="self-start"
            >
              {fr.myChantiers.rehire(c.artisan_name)}
            </ButtonLink>
          )}
          <ReportProblemLink href={`/mon-espace/chantiers/${id}/signaler`} />
          {cancellable.includes(status) && (
            <CancelChantierButton chantierId={id} artisanName={c.artisan_name} />
          )}
        </div>
      </div>
      {status === "reserves_a_lever" && (
        <ConfirmLiftActions
          chantierId={id}
          balance={euros.format((progress?.remainingCents ?? 0) / 100)}
        />
      )}
      {status === "travaux_termines" && (
        <ReceptionActions
          chantierId={id}
          artisanName={c.artisan_name}
          balance={euros.format((progress?.remainingCents ?? 0) / 100)}
        />
      )}
    </main>
  );
}
