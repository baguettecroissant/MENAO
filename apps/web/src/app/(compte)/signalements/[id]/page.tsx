import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TicketPhotoUpload } from "@/components/dispute/ticket-photo-upload";
import { TicketReplyForm } from "@/components/dispute/ticket-reply-form";
import { TicketThread } from "@/components/dispute/ticket-thread";
import { Alert, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { signedUrlMap } from "@/lib/chantier/storage";
import { formatDateNumeric } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const t = fr.dispute;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const tone = { ouvert: "primary", en_cours: "warning", resolu: "neutral" } as const;

export const metadata: Metadata = { title: `${t.ticketTitle} — MENAO`, robots: { index: false } };

/**
 * Suivi d'un signalement par son déclarant (F-42), client ou artisan : description, échanges
 * avec l'équipe MENAO, photos. Les tickets d'autrui ne sont pas lisibles (RLS).
 */
export default async function TicketPage({ params }: PageProps<"/signalements/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) redirect(`/connexion?next=/signalements/${id}` as Route);
  const [{ data: ticket }, { data: rows }] = await Promise.all([
    supabase
      .from("tickets")
      .select(
        "id, type, status, category, message, created_at, chantiers(id, title, particulier_id)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("ticket_messages")
      .select("id, from_staff, body, storage_path, created_at")
      .eq("ticket_id", id)
      .order("created_at"),
  ]);
  if (!ticket) notFound();
  // Autre échange (message de contact, dossier, suppression du compte) : page dédiée (ADR 0041).
  if (ticket.type !== "litige") redirect(`/echanges/${id}` as Route);
  if (!ticket.chantiers) notFound();
  const chantier = ticket.chantiers;
  const chantierHref =
    chantier.particulier_id === auth.claims.sub
      ? `/mon-espace/chantiers/${chantier.id}`
      : `/pro/chantiers/${chantier.id}`;
  const urls = await signedUrlMap(
    supabase,
    "ticket-photos",
    (rows ?? []).map((r) => r.storage_path),
  );
  const entries = (rows ?? []).map((r) => ({
    id: r.id,
    fromStaff: r.from_staff,
    body: r.body,
    photoUrl: r.storage_path ? (urls.get(r.storage_path) ?? null) : null,
    createdAt: r.created_at,
  }));
  const closed = ticket.status === "resolu";

  // Refonte « Nette » (ADR 0258) : la description et le fil à gauche, le résumé à droite.
  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={chantierHref as Route}
          className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {ticket.category && (
              <span className="rounded-chip bg-background px-2 py-0.5 text-xs font-semibold text-label">
                {t.categories[ticket.category]}
              </span>
            )}
            <StatusBadge tone={tone[ticket.status]}>{t.statuses[ticket.status]}</StatusBadge>
          </div>
          <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
            {t.ticketTitle}
          </h1>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="flex min-w-0 flex-col gap-4">
            <section
              aria-labelledby="ticket-description"
              className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
            >
              <h2 id="ticket-description" className="text-[1.0625rem]">
                {t.description}
              </h2>
              <p className="text-[0.9375rem] leading-relaxed whitespace-pre-line text-label">
                {ticket.message}
              </p>
            </section>
            <section
              aria-labelledby="ticket-thread"
              className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
            >
              <h2 id="ticket-thread" className="text-[1.0625rem]">
                {t.thread}
              </h2>
              <TicketThread
                entries={entries}
                labels={{ staff: t.support, reporter: t.you }}
                emptyText={t.noMessages}
              />
              {closed ? (
                <Alert tone="info">{t.closed}</Alert>
              ) : (
                <>
                  <TicketReplyForm ticketId={id} label={t.messageLabel} submit={t.messageSubmit} />
                  <TicketPhotoUpload ticketId={id} />
                </>
              )}
            </section>
          </div>
          <aside className="flex flex-col gap-1 rounded-card border border-border bg-surface p-5 shadow-card lg:sticky lg:top-24">
            <p className="text-sm font-semibold text-muted-foreground">{t.chantierLabel}</p>
            <Link
              href={chantierHref as Route}
              className="font-bold underline-offset-2 hover:underline"
            >
              {chantier.title}
            </Link>
            {ticket.category && (
              <p className="mt-2 border-t border-border pt-3 text-sm text-label">
                {t.ticketMeta(t.categories[ticket.category], formatDateNumeric(ticket.created_at))}
              </p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
