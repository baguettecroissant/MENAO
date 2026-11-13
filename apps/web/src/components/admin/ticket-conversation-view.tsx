import { ArrowLeft, Eye, FileText, Flag, ImageIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { getTicketConversation } from "@/lib/admin/tickets";
import { formatDayInline, formatTime } from "@/lib/format";

const t = fr.admin.tickets;
const c = t.conversation;

export type ConversationMessage = NonNullable<
  Awaited<ReturnType<typeof getTicketConversation>>
>[number];

/**
 * Conversation du chantier lue depuis un litige ou un message signalé (ADR 0277 ; maquette du
 * lot 38) : fil façon messagerie avec les jours, en-tête du chantier et de ses participants,
 * mention du journal et repères à droite. Lecture seule.
 */
export function TicketConversationView({
  ticketId,
  chantier,
  messages,
}: {
  ticketId: string;
  chantier: string | null;
  messages: ConversationMessage[];
}) {
  const client = messages.find((m) => m.side === "client")?.author ?? null;
  const artisan = messages.find((m) => m.side === "artisan")?.author ?? null;
  const days: { day: string; items: ConversationMessage[] }[] = [];
  for (const m of messages) {
    const day = formatDayInline(m.createdAt);
    const last = days.at(-1);
    if (last?.day === day) last.items.push(m);
    else days.push({ day, items: [m] });
  }
  const title = [chantier, client].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/admin/tickets/${ticketId}` as Route}
        className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {c.back}
      </Link>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[2rem] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[2.25rem]">
          {c.title}
        </h1>
        <p className="text-sm text-muted-foreground">{c.count(messages.length)}</p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section
          aria-label={c.title}
          className="overflow-hidden rounded-card border border-border bg-surface shadow-card"
        >
          {(title || artisan) && (
            <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
              <span className="flex min-w-0 flex-1 flex-col">
                {title && <span className="truncate text-[0.9375rem] font-semibold">{title}</span>}
                {artisan && (
                  <span className="truncate text-[0.8125rem] text-muted-foreground">
                    {c.between(artisan)}
                  </span>
                )}
              </span>
              <StatusBadge tone="neutral">{c.readOnly}</StatusBadge>
            </div>
          )}
          {messages.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">{c.empty}</p>
          ) : (
            <div className="flex flex-col gap-4 p-4 sm:p-5">
              {days.map(({ day, items }) => (
                <section key={day} aria-label={day} className="flex flex-col gap-4">
                  <p className="self-center rounded-lg bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    {day}
                  </p>
                  <ol className="flex flex-col gap-4">
                    {items.map((m) => {
                      const isArtisan = m.side === "artisan";
                      const who = [
                        m.side === "client" ? c.client : isArtisan ? c.artisan : c.deleted,
                        m.author,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <li
                          key={m.id}
                          className={`flex max-w-[85%] flex-col gap-1 sm:max-w-[70%] ${isArtisan ? "items-end self-end" : "items-start self-start"}`}
                        >
                          <p className="text-xs text-muted-foreground">
                            {who} · {formatTime(m.createdAt)}
                            {m.read && ` · ${c.read}`}
                          </p>
                          <div
                            className={`flex flex-col gap-2 rounded-2xl px-4 py-2.5 text-sm ${
                              isArtisan
                                ? "bg-foreground text-white"
                                : "bg-background text-foreground"
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
                                <img
                                  src={m.url}
                                  alt=""
                                  className="max-h-56 rounded-lg object-cover"
                                />
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
                                <StatusBadge tone="neutral">
                                  {c.hidden(m.moderationReason)}
                                </StatusBadge>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <p className="flex items-start gap-2.5 rounded-card bg-primary-soft px-4 py-3.5 text-sm text-primary-strong">
            <Eye aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {c.notice}
          </p>
          <section
            aria-labelledby="reperes"
            className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-5 shadow-card"
          >
            <h2 id="reperes" className="text-base font-semibold">
              {c.legendTitle}
            </h2>
            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="h-4 w-6 rounded-full border border-border bg-background"
                />
                {c.legend.client}
              </li>
              <li className="flex items-center gap-2.5">
                <span aria-hidden="true" className="h-4 w-6 rounded-full bg-foreground" />
                {c.legend.artisan}
              </li>
              <li className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="h-4 w-6 rounded-full bg-surface ring-2 ring-danger"
                />
                {c.legend.reported}
              </li>
              <li className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="h-4 w-6 rounded-full bg-foreground opacity-50"
                />
                {c.legend.hidden}
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
