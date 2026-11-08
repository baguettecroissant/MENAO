import { ChevronRight, Mail, MessageSquareText } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ButtonLink, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDateNumeric } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";

const t = fr.exchanges;
const TYPES = [
  "contact",
  "dossier_recherche",
  "litige",
  "suppression_compte",
  "avis",
  "message",
  "expertise",
  "recompense",
  "demande_sans_reponse",
  "faux_particulier",
  "invitation_artisan",
] as const;
const tone = { ouvert: "primary", en_cours: "success", resolu: "neutral" } as const;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * « Mes échanges avec MENAO » (F-42, ADR 0041) : messages de la page Contact, dossiers de
 * recherche, signalements et demande de suppression du compte, avec la réponse de l'équipe.
 */
export default async function ExchangesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) redirect("/connexion?next=/echanges");
  const { data } = await supabase
    .from("tickets")
    .select(
      "id, type, status, subject, message, created_at, ticket_messages(from_staff, created_at)",
    )
    .eq("user_id", auth.claims.sub)
    .in("type", TYPES)
    .order("created_at", { ascending: false });
  const tickets = data ?? [];

  return (
    // Refonte « Nette » (ADR 0258) : une liste en carte, le type et l'état en pastilles.
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex max-w-3xl flex-col gap-1.5">
          <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
            {t.title}
          </h1>
          <p className="text-[0.9375rem] text-label sm:text-base">{t.intro}</p>
        </div>
        <ButtonLink href="/contact" size="md" className="shrink-0 self-start sm:self-auto">
          <Mail aria-hidden="true" className="size-4" />
          {t.write}
        </ButtonLink>
      </div>
      {tickets.length === 0 ? (
        <EmptyState illustration="messages" title={t.empty}>
          {t.emptyHint}
        </EmptyState>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-card">
          {tickets.map((ticket) => {
            const replies = ticket.ticket_messages
              .filter((m) => m.from_staff)
              .map((m) => m.created_at)
              .sort();
            const lastReply = replies.at(-1);
            const href =
              ticket.type === "litige" ? `/signalements/${ticket.id}` : `/echanges/${ticket.id}`;
            const type = ticket.type as (typeof TYPES)[number];
            return (
              <li key={ticket.id}>
                <Link
                  href={href as Route}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-background focus-visible:bg-background focus-visible:outline-none sm:px-5"
                >
                  <span className="hidden size-10 shrink-0 items-center justify-center rounded-input bg-background text-label sm:flex">
                    <MessageSquareText aria-hidden="true" className="size-[1.125rem]" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-chip bg-background px-2 py-0.5 text-xs font-semibold text-label">
                        {t.types[type]}
                      </span>
                      <StatusBadge tone={tone[ticket.status]}>
                        {t.statuses[ticket.status]}
                      </StatusBadge>
                    </div>
                    <p className="truncate font-semibold">{ticket.subject ?? t.untitled}</p>
                    {ticket.message && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{ticket.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t.sentOn(formatDateNumeric(ticket.created_at))}
                      {lastReply ? ` · ${t.lastReply(formatDateNumeric(lastReply))}` : ""}
                    </p>
                  </div>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted-foreground"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
