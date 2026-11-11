import { ArrowLeft, Eye, FileText, Flag, ImageIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireStaff } from "@/lib/admin/guard";
import { getTicketConversation } from "@/lib/admin/tickets";
import { formatDayTimeInline } from "@/lib/format";

const t = fr.admin.tickets;
const c = t.conversation;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${c.title} — ${fr.admin.title}` };

/**
 * Conversation du chantier, consultée depuis un litige ou un message signalé (F-125, ADR 0277) :
 * lecture seule, client à gauche et artisan à droite. La base vérifie le rôle (admin en double
 * authentification ou support) et le type de ticket, et inscrit chaque ouverture au journal.
 */
export default async function TicketConversationPage({
  params,
}: PageProps<"/admin/tickets/[id]/conversation">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireStaff();
  const messages = await getTicketConversation(supabase, id);
  if (!messages) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/admin/tickets/${id}` as Route}
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {c.back}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
          {c.title}
        </h1>
        <p className="text-sm text-muted-foreground">{c.count(messages.length)}</p>
      </div>
      <p className="flex items-start gap-2.5 rounded-card bg-primary-soft px-4 py-3 text-sm text-primary-strong">
        <Eye aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {c.notice}
      </p>

      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">{c.empty}</p>
      ) : (
        <ol className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card sm:p-6">
          {messages.map((m) => {
            const artisan = m.side === "artisan";
            const who = [m.side === "client" ? c.client : artisan ? c.artisan : c.deleted, m.author]
              .filter(Boolean)
              .join(" · ");
            return (
              <li
                key={m.id}
                className={`flex max-w-[85%] flex-col gap-1 sm:max-w-[70%] ${artisan ? "items-end self-end" : "items-start self-start"}`}
              >
                <p className="text-xs text-muted-foreground">
                  {who} · {formatDayTimeInline(m.createdAt)}
                  {m.read && ` · ${c.read}`}
                </p>
                <div
                  className={`flex flex-col gap-2 rounded-2xl px-4 py-2.5 text-sm ${
                    artisan ? "bg-foreground text-white" : "bg-background text-foreground"
                  } ${m.reported ? "ring-2 ring-danger" : ""} ${m.hidden ? "opacity-70" : ""}`}
                >
                  {m.kind === "texte" && <p className="whitespace-pre-line">{m.body}</p>}
                  {m.kind === "photo" && m.url && (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium underline underline-offset-2"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- URL signée du stockage privé */}
                      <img src={m.url} alt="" className="max-h-56 rounded-lg object-cover" />
                      <span className="sr-only">{c.photo}</span>
                    </a>
                  )}
                  {m.kind === "photo" && !m.url && (
                    <span className="inline-flex items-center gap-1.5">
                      <ImageIcon aria-hidden="true" className="size-4" />
                      {t.reportedMessage.attachment}
                    </span>
                  )}
                  {m.kind === "fichier" && (
                    <a
                      href={m.url ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium underline underline-offset-2"
                    >
                      <FileText aria-hidden="true" className="size-4" />
                      {c.file}
                    </a>
                  )}
                </div>
                {(m.reported || m.hidden) && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.reported && (
                      <StatusBadge tone="danger">
                        <Flag aria-hidden="true" className="size-3" />
                        {c.reported}
                      </StatusBadge>
                    )}
                    {m.hidden && m.moderationReason && (
                      <StatusBadge tone="neutral">{c.hidden(m.moderationReason)}</StatusBadge>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
