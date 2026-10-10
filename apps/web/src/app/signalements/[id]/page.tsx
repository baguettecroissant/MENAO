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
      .eq("type", "litige")
      .maybeSingle(),
    supabase
      .from("ticket_messages")
      .select("id, from_staff, body, storage_path, created_at")
      .eq("ticket_id", id)
      .order("created_at"),
  ]);
  if (!ticket || !ticket.chantiers) notFound();
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

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href={chantierHref as Route}
          className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">
              {t.ticketTitle}
            </h1>
            <StatusBadge tone={tone[ticket.status]}>{t.statuses[ticket.status]}</StatusBadge>
          </div>
          <p className="text-sm text-muted-foreground">{t.chantierLink(chantier.title)}</p>
          {ticket.category && (
            <p className="text-sm text-muted-foreground">
              {t.ticketMeta(t.categories[ticket.category], formatDateNumeric(ticket.created_at))}
            </p>
          )}
        </div>
        <section
          aria-labelledby="ticket-description"
          className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card"
        >
          <h2 id="ticket-description" className="font-medium">
            {t.description}
          </h2>
          <p className="text-sm whitespace-pre-line">{ticket.message}</p>
        </section>
        <section
          aria-labelledby="ticket-thread"
          className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card"
        >
          <h2 id="ticket-thread" className="font-medium">
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
    </main>
  );
}
