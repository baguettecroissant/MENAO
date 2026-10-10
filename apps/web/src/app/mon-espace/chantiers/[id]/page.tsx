import {
  chantierStepIndex,
  clientChantierAction,
  journalSummary,
  paymentProgress,
  type ChantierStatus,
} from "@menao/core";
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
import { fr } from "@/i18n/fr";
import { avatarUrl, signedUrlMap } from "@/lib/chantier/storage";
import { chantierTag, nextIntervention } from "@/lib/chantier/view";
import { formatDateNumeric } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const t = fr.chantier;
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
  const { onglet } = await searchParams;
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

  const [{ data: updates }, { data: quotes }, { data: payments }, { data: invoices }] =
    await Promise.all([
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
          />
          {step !== null && <ChantierStepper current={step} />}
        </ChantierHero>
        <div className="flex flex-col gap-4 px-4 py-5 sm:px-0 sm:py-0">
          {action && (
            <ChantierActionBlock action={action} totalTtcCents={c.quote_total_ttc_cents} />
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
          <ReportProblemLink />
        </div>
      </div>
    </main>
  );
}
