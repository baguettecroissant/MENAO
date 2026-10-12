import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TicketReplyForm } from "@/components/dispute/ticket-reply-form";
import { TicketThread } from "@/components/dispute/ticket-thread";
import { Alert, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDateNumeric } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const t = fr.exchanges;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const tone = { ouvert: "primary", en_cours: "success", resolu: "neutral" } as const;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * Un échange avec l'équipe MENAO (ADR 0041) : message d'origine, fil des réponses, et réponse du
 * déclarant tant que l'échange n'est pas clos. Un litige garde sa page (/signalements).
 */
export default async function ExchangePage({ params }: PageProps<"/echanges/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) redirect(`/connexion?next=/echanges/${id}` as Route);
  const [{ data: ticket }, { data: rows }] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, type, status, subject, message, created_at")
      .eq("id", id)
      .eq("user_id", auth.claims.sub)
      .maybeSingle(),
    supabase
      .from("ticket_messages")
      .select("id, from_staff, body, created_at")
      .eq("ticket_id", id)
      .order("created_at"),
  ]);
  if (!ticket) notFound();
  if (ticket.type === "litige") redirect(`/signalements/${id}` as Route);
  const type = ticket.type as keyof typeof t.types;
  const entries = (rows ?? []).map((r) => ({
    id: r.id,
    fromStaff: r.from_staff,
    body: r.body,
    photoUrl: null,
    createdAt: r.created_at,
  }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/echanges"
        className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t.back}
      </Link>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">
            {ticket.subject ?? t.types[type] ?? t.untitled}
          </h1>
          <StatusBadge tone={tone[ticket.status]}>{t.statuses[ticket.status]}</StatusBadge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t.types[type]} · {t.sentOn(formatDateNumeric(ticket.created_at))}
        </p>
      </div>
      {ticket.message && (
        <section
          aria-labelledby="echange-message"
          className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card"
        >
          <h2 id="echange-message" className="font-medium">
            {t.yourMessage}
          </h2>
          <p className="text-sm whitespace-pre-line">{ticket.message}</p>
        </section>
      )}
      <section
        aria-labelledby="echange-fil"
        className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card"
      >
        <h2 id="echange-fil" className="font-medium">
          {t.thread}
        </h2>
        <TicketThread
          entries={entries}
          labels={{ staff: t.support, reporter: t.you }}
          emptyText={t.noMessages}
        />
        {ticket.status === "resolu" ? (
          <Alert tone="info">{t.closed}</Alert>
        ) : (
          <TicketReplyForm ticketId={id} label={t.messageLabel} submit={t.messageSubmit} />
        )}
      </section>
    </main>
  );
}
