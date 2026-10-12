import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailSection, InfoList } from "@/components/admin/list-controls";
import { TicketReplyForm } from "@/components/dispute/ticket-reply-form";
import { TicketThread } from "@/components/dispute/ticket-thread";
import { StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { setTicketStatus } from "@/lib/admin/actions";
import { requireStaff } from "@/lib/admin/guard";
import { takeTicket } from "@/lib/admin/ticket-actions";
import { getTicketDetail } from "@/lib/admin/tickets";
import { formatDay, formatDayTimeInline } from "@/lib/format";
import { DisputeDecision } from "../dispute-decision";
import { ModerateMessage } from "../moderate-message";
import { ModerateReview } from "../moderate-review";
import { TicketNoteForm } from "./note-form";

const t = fr.admin.tickets;
const f = fr.admin.followUp;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const link = "text-sm font-medium text-primary underline-offset-2 hover:underline";
const button =
  "min-h-touch rounded-button border border-border bg-surface px-4 text-sm font-medium hover:bg-background";
/** Tickets qui ont un fil d'échange avec le déclarant (litiges et ADR 0041). */
const THREADED: readonly string[] = [
  "litige",
  "contact",
  "dossier_recherche",
  "suppression_compte",
];

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

const TONES = { ouvert: "warning", en_cours: "primary", resolu: "neutral" } as const;

/**
 * Page d'un ticket (F-56, ADR 0049) : déclarant et objet lié, message d'origine, fil d'échange,
 * modération ou décision, prise en charge et notes internes. Ouverte au rôle support ; les liens
 * vers les fiches réservées aux admins ne s'affichent que pour eux.
 */
export default async function TicketPage({ params }: PageProps<"/admin/tickets/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, role, userId } = await requireStaff();
  const detail = await getTicketDetail(supabase, id);
  if (!detail) notFound();
  const { ticket, notes, thread } = detail;
  const admin = role === "admin";
  const open = ticket.status !== "resolu";
  const late = open && new Date(ticket.due_at) < new Date();
  const type = t.types[ticket.type as keyof typeof t.types] ?? ticket.type;
  const project = ticket.projects;
  const review = ticket.reviews;
  const reported = ticket.messages;
  const dispute = ticket.type === "litige" ? ticket.chantiers : null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/tickets"
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t.back}
      </Link>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-medium tracking-tight">{ticket.subject ?? type}</h1>
          <StatusBadge tone={TONES[ticket.status as keyof typeof TONES] ?? "neutral"}>
            {t.status[ticket.status as keyof typeof t.status] ?? ticket.status}
          </StatusBadge>
        </div>
        <p className={`text-sm ${late ? "text-danger" : "text-muted-foreground"}`}>
          {[
            type,
            t.createdOn(formatDayTimeInline(ticket.created_at)),
            !open && ticket.resolved_at
              ? t.resolvedOn(formatDay(ticket.resolved_at))
              : late
                ? t.lateSince(formatDay(ticket.due_at))
                : t.dueOn(formatDay(ticket.due_at)),
          ].join(" · ")}
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <DetailSection title={t.originalMessage}>
            <p className="text-sm whitespace-pre-line">{ticket.message ?? t.noMessage}</p>
            {project && (
              <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
                <p className="font-medium">
                  {t.project} :{" "}
                  {[project.trades?.label, project.ville_nom].filter(Boolean).join(", ")}
                </p>
                <p className="whitespace-pre-line text-muted-foreground">{project.description}</p>
              </div>
            )}
          </DetailSection>

          {review && (
            <DetailSection title={t.review.title}>
              <p className="text-sm font-medium">
                {t.review.meta(review.author_name, review.score)}
              </p>
              <p className="text-sm whitespace-pre-line">{review.comment}</p>
              {review.status === "masque" && review.moderation_reason && (
                <p className="text-sm text-danger">{t.review.hidden(review.moderation_reason)}</p>
              )}
              <ModerateReview reviewId={review.id} status={review.status} />
            </DetailSection>
          )}

          {reported && (
            <DetailSection title={t.reportedMessage.title}>
              <p className="text-sm whitespace-pre-line">
                {reported.body ?? t.reportedMessage.attachment}
              </p>
              {reported.hidden_at && reported.moderation_reason && (
                <p className="text-sm text-danger">
                  {t.reportedMessage.hidden(reported.moderation_reason)}
                </p>
              )}
              <ModerateMessage messageId={reported.id} hidden={reported.hidden_at !== null} />
            </DetailSection>
          )}

          {THREADED.includes(ticket.type) && (
            <DetailSection title={t.dispute.thread}>
              {dispute && (
                <p className="text-sm">
                  {t.dispute.chantier(dispute.title, fr.pro.chantiers.status[dispute.status])}
                  {ticket.category && (
                    <span className="block text-muted-foreground">
                      {t.dispute.category(fr.dispute.categories[ticket.category])}
                    </span>
                  )}
                </p>
              )}
              <TicketThread
                entries={thread}
                labels={{ staff: t.dispute.support, reporter: t.dispute.reporter }}
                emptyText={t.noMessage}
              />
              {open && (
                <TicketReplyForm
                  ticketId={ticket.id}
                  label={t.dispute.replyLabel}
                  submit={t.dispute.replySubmit}
                />
              )}
              {open && dispute && <DisputeDecision ticketId={ticket.id} />}
            </DetailSection>
          )}

          <DetailSection title={t.notes} note={t.notesHint}>
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noNotes}</p>
            ) : (
              <ol className="flex flex-col">
                {notes.map((n) => (
                  <li
                    key={n.id}
                    className="flex flex-col gap-0.5 border-t border-border py-2 text-sm first:border-t-0 first:pt-0"
                  >
                    <p className="whitespace-pre-line">{n.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.noteBy(n.author ?? t.someone, formatDayTimeInline(n.created_at))}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            <TicketNoteForm ticketId={ticket.id} />
          </DetailSection>
        </div>

        <div className="flex flex-col gap-6">
          <DetailSection title={t.handling}>
            <p className="text-sm">{detail.handler ? t.handledBy(detail.handler) : t.notHandled}</p>
            {open && (
              <form action={takeTicket}>
                <input type="hidden" name="ticketId" value={ticket.id} />
                <input
                  type="hidden"
                  name="take"
                  value={ticket.handled_by === userId ? "false" : "true"}
                />
                <button type="submit" className={button}>
                  {ticket.handled_by === userId ? t.release : t.take}
                </button>
              </form>
            )}
          </DetailSection>

          {!dispute && (
            <DetailSection title={t.statusTitle}>
              <div className="flex flex-wrap gap-2">
                {(open
                  ? [
                      ...(ticket.status === "ouvert"
                        ? [{ status: "en_cours", label: t.markInProgress }]
                        : []),
                      { status: "resolu", label: t.markResolved },
                    ]
                  : [{ status: "ouvert", label: t.reopen }]
                ).map((action) => (
                  <form key={action.status} action={setTicketStatus}>
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="status" value={action.status} />
                    <button type="submit" className={button}>
                      {action.label}
                    </button>
                  </form>
                ))}
              </div>
            </DetailSection>
          )}

          <DetailSection title={t.declarant}>
            <InfoList
              items={[
                { label: f.name, value: detail.declarant },
                {
                  label: f.email,
                  value: (
                    <a
                      href={`mailto:${ticket.contact_email}`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {ticket.contact_email}
                    </a>
                  ),
                },
              ]}
            />
            {admin && ticket.user_id && (
              <Link href={`/admin/personnes/${ticket.user_id}` as Route} className={link}>
                {t.openPerson} →
              </Link>
            )}
          </DetailSection>

          {admin && (ticket.project_id || ticket.chantier_id || review) && (
            <DetailSection title={t.linked}>
              <ul className="flex flex-col gap-2">
                {ticket.project_id && (
                  <li>
                    <Link href={`/admin/demandes/${ticket.project_id}` as Route} className={link}>
                      {t.linkedRequest} →
                    </Link>
                  </li>
                )}
                {ticket.chantier_id && (
                  <li>
                    <Link href={`/admin/chantiers/${ticket.chantier_id}` as Route} className={link}>
                      {t.linkedChantier}
                      {ticket.chantiers ? ` : ${ticket.chantiers.title}` : ""} →
                    </Link>
                  </li>
                )}
                {review && (
                  <li>
                    <Link href={`/admin/artisans/${review.artisan_id}` as Route} className={link}>
                      {fr.admin.activity.title} : {t.review.title.toLowerCase()} →
                    </Link>
                  </li>
                )}
              </ul>
            </DetailSection>
          )}
        </div>
      </div>
    </div>
  );
}
