import { ARTISAN_CANCELLABLE_STATUSES, parisToday, type ChantierStatus } from "@menao/core";
import { CalendarDays, CalendarPlus, Clock, MessageCircle } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportProblemLink } from "@/components/chantier/chantier-parts";
import { DetailHeader, StickyActions } from "@/components/pro/detail";
import { ExpertiseButton } from "@/components/pro/expertise-button";
import { RequestBlocks } from "@/components/pro/request-blocks";
import { SentQuoteBlock } from "@/components/pro/sent-quote";
import { Alert, ButtonLink, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { appointmentAgenda } from "@/lib/artisan/agenda";
import { getChantierDetail } from "@/lib/artisan/chantiers";
import { requireProSpace } from "@/lib/artisan/space";
import { formatDay, formatDayLong, formatTime, parisInputValues } from "@/lib/format";
import { CancelChantierButton, NotesBlock, RescheduleButton } from "./chantier-actions";
import { ArtisanFollowUp } from "./follow-up";

const t = fr.pro.appointment;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const cancellable: readonly ChantierStatus[] = ARTISAN_CANCELLABLE_STATUSES;
/** Après l'acompte, la fiche devient la vue du chantier (F-22, maquette « Vue d'un chantier »). */
const FOLLOW_UP: readonly ChantierStatus[] = [
  "acompte_paye",
  "planifie",
  "en_cours",
  "travaux_termines",
  "reserves_a_lever",
  "receptionne",
  "cloture",
  "en_litige",
];

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Vue d'un rendez-vous (F-18), maquette « Vue d'un rendez-vous », jusqu'à l'acompte ; ensuite vue
 * du chantier (F-22).
 */
export default async function ChantierPage({
  params,
  searchParams,
}: PageProps<"/pro/chantiers/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireProSpace();
  const c = await getChantierDetail(supabase, id);
  if (!c) notFound();
  if (FOLLOW_UP.includes(c.chantier.status)) {
    const { onglet, demarrage } = await searchParams;
    return (
      <ArtisanFollowUp
        supabase={supabase}
        c={c}
        tab={onglet === "dossier" ? "dossier" : "suivi"}
        startConfirmed={demarrage === "confirme"}
      />
    );
  }

  const [{ data: signed }, { data: trades }, { data: draft }, { data: sentQuote }] =
    await Promise.all([
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
          "id, status, numero, total_ttc_cents, sent_at, valid_until, refusal_reason, client_message, signed_at",
        )
        .eq("chantier_id", id)
        .neq("status", "brouillon")
        .order("version", { ascending: false })
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
  const status = c.chantier.status;
  // F-19 : devis à créer après le rendez-vous, ou à modifier si le client l'a demandé.
  const awaitingQuote = status === "rdv_planifie" || status === "devis_en_revision";
  const appointment = c.appointment?.status === "planifie" ? c.appointment : null;
  const planned = status === "rdv_planifie" && appointment !== null;
  // F-44 : créneaux libres et avertissements du tiroir « Modifier le rendez-vous ».
  const agenda = planned
    ? await appointmentAgenda({ excludeChantierId: c.chantier.id })
    : undefined;
  const active = status !== "annule" && status !== "cloture" && status !== "devis_refuse";

  return (
    <main className="flex flex-1 flex-col">
      <DetailHeader backHref="/pro/chantiers" backLabel={t.back} title={t.title}>
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
              <RescheduleButton
                chantierId={c.chantier.id}
                minDate={parisToday()}
                {...parisInputValues(appointment.starts_at)}
                agenda={agenda}
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
        {/* F-40 : conversation du chantier avec le client. */}
        <Link
          href={`/pro/messages/${c.chantier.id}` as Route}
          className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-pill border border-white/60 px-3.5 text-sm font-medium text-white hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white/40 focus-visible:outline-none"
        >
          <MessageCircle aria-hidden="true" className="size-4" />
          {fr.messages.writeClient}
        </Link>
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
        {sentQuote && <SentQuoteBlock quote={sentQuote} deposit={deposit} invoice={invoice} />}
        <RequestBlocks
          detail={c}
          photoUrls={(signed ?? []).flatMap((p) => (p.signedUrl ? [p.signedUrl] : []))}
          variant="rendez-vous"
        />
        {c.appointment && <NotesBlock chantierId={c.chantier.id} notes={c.appointment.notes} />}
        {status !== "annule" && (
          <ReportProblemLink href={`/pro/chantiers/${c.chantier.id}/signaler`} />
        )}
      </div>

      {(awaitingQuote || cancellable.includes(status)) && (
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
          {cancellable.includes(status) && <CancelChantierButton chantierId={c.chantier.id} />}
        </StickyActions>
      )}
    </main>
  );
}
