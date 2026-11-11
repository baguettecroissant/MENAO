import { Clock } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { FilterChips, Pagination, SearchForm, listHref } from "@/components/admin/list-controls";
import { ReceptionCard } from "@/components/admin/reception-card";
import { MoneyFigures } from "@/components/pro/money-figures";
import { SheetChip } from "@/components/pro/sheet";
import { fr } from "@/i18n/fr";
import { parsePage } from "@/lib/admin/follow-up";
import { requireStaff } from "@/lib/admin/guard";
import { getReception } from "@/lib/admin/reception";
import { TICKET_FILTERS, listTickets, parseTicketFilter, ticketCounts } from "@/lib/admin/tickets";
import { formatDay } from "@/lib/format";

const t = fr.admin.tickets;
const f = fr.admin.followUp;
const PATH = "/admin/tickets";

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

const TONES = { ouvert: "warning", en_cours: "primary", resolu: "neutral" } as const;

/**
 * Boîte de réception de l'équipe (F-56, ADR 0049) : messages, dossiers, signalements et litiges,
 * les plus urgents d'abord, avec leur responsable. Ouverte au rôle support.
 */
export default async function TicketsPage({ searchParams }: PageProps<"/admin/tickets">) {
  const params = await searchParams;
  const filter = parseTicketFilter(params.file);
  const query = typeof params.q === "string" && params.q.trim() ? params.q.trim() : null;
  const page = parsePage(params.page);
  const { supabase, role } = await requireStaff();
  const [{ rows, total }, counts, reception] = await Promise.all([
    listTickets(supabase, { filter, query, page }),
    ticketCounts(supabase, query),
    getReception(supabase),
  ]);
  const now = new Date();
  const href = (next: { file?: string; page?: number }) =>
    listHref(PATH, {
      file: (next.file ?? filter) === "a_traiter" ? null : (next.file ?? filter),
      q: query,
      page: next.page ?? 1,
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{t.title}</h1>
        <p className="max-w-3xl text-[0.9375rem] text-label sm:text-base">{t.intro}</p>
      </div>
      {/* Refonte « Nette » (ADR 0252) : chiffres de la boîte de réception. */}
      <MoneyFigures
        label={t.figuresLabel}
        dense
        cells={[
          {
            label: t.filters.a_traiter ?? "",
            short: (t.filters.a_traiter ?? "").toLowerCase(),
            value: String(counts.a_traiter ?? 0),
            hint: t.figuresTodoHint(counts.litiges ?? 0),
          },
          {
            label: t.filters.en_retard ?? "",
            short: (t.filters.en_retard ?? "").toLowerCase(),
            value: String(counts.en_retard ?? 0),
            hint: t.figuresLateHint,
            tone: (counts.en_retard ?? 0) > 0 ? "danger" : undefined,
          },
          {
            label: t.filters.mes_tickets ?? "",
            short: (t.filters.mes_tickets ?? "").toLowerCase(),
            value: String(counts.mes_tickets ?? 0),
            hint: t.figuresMineHint,
          },
        ]}
      />
      <SearchForm
        action={PATH}
        label={t.searchLabel}
        placeholder={t.searchPlaceholder}
        query={query}
        keep={{ file: filter === "a_traiter" ? null : filter }}
      />
      <FilterChips
        label={t.filtersLabel}
        items={TICKET_FILTERS.map((key) => ({
          key,
          href: href({ file: key }),
          label: t.filters[key] ?? key,
          count: counts[key],
          active: key === filter,
        }))}
      />
      <p className="-mt-2 text-sm text-muted-foreground" role="status">
        {f.results(total)}
      </p>
      {rows.length === 0 ? (
        <p className="rounded-card border border-border bg-surface p-5 text-muted-foreground shadow-card">
          {f.empty}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-card">
          {rows.map((row) => {
            const type = t.types[row.type as keyof typeof t.types] ?? row.type;
            const label = row.subject ?? t.noSubject;
            const late = row.status !== "resolu" && new Date(row.due_at) < now;
            return (
              <li key={row.ticket_id}>
                <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <SheetChip tone={row.type === "litige" ? "danger" : "neutral"} dot>
                        {type}
                      </SheetChip>
                      {row.notes > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {t.notesCount(row.notes)}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`${PATH}/${row.ticket_id}` as Route}
                      aria-label={t.openTicket(label)}
                      className="font-bold text-foreground underline-offset-2 hover:underline"
                    >
                      {label}
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      {[row.declarant ?? row.contact_email, row.chantier_title]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold ${late ? "text-danger" : "text-label"}`}
                    >
                      <Clock aria-hidden="true" className="size-3.5" />
                      {late ? t.late : formatDay(row.due_at)}
                    </span>
                    <span className="flex items-center gap-2">
                      <SheetChip
                        tone={
                          TONES[row.status as keyof typeof TONES] === "warning"
                            ? "warning"
                            : TONES[row.status as keyof typeof TONES] === "primary"
                              ? "primary"
                              : "neutral"
                        }
                      >
                        {t.status[row.status as keyof typeof t.status] ?? row.status}
                      </SheetChip>
                      <span className="text-[0.8125rem] text-muted-foreground">
                        {row.handler ?? t.nobody}
                      </span>
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} total={total} hrefFor={(p) => href({ page: p })} />
      {reception && (
        <ReceptionCard
          settings={reception.settings}
          state={reception.state}
          canEdit={false}
          // Horaires modifiables dans les Réglages (ADR 0284), par un admin.
          editHref={role === "admin" ? "/admin/reglages#accueil" : undefined}
        />
      )}
    </div>
  );
}
