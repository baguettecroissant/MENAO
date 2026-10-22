import { ChevronRight } from "lucide-react";
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.intro}</p>
        </div>
        <ButtonLink href="/contact" variant="outline" size="md" className="shrink-0 self-start">
          {t.write}
        </ButtonLink>
      </div>
      {tickets.length === 0 ? (
        <EmptyState illustration="messages" title={t.empty}>
          {t.emptyHint}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
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
                  className="flex items-center gap-4 rounded-card border border-border bg-surface p-4 shadow-card hover:border-primary/40 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={tone[ticket.status]}>
                        {t.statuses[ticket.status]}
                      </StatusBadge>
                      <span className="text-xs text-muted-foreground">{t.types[type]}</span>
                    </div>
                    <p className="truncate font-medium">{ticket.subject ?? t.untitled}</p>
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
