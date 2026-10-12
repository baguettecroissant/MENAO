import type { Metadata, Route } from "next";
import Link from "next/link";
import { FilterChips, Pagination, SearchForm, listHref } from "@/components/admin/list-controls";
import { Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { parsePage } from "@/lib/admin/follow-up";
import { requireStaff } from "@/lib/admin/guard";
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
  const { supabase } = await requireStaff();
  const [{ rows, total }, counts] = await Promise.all([
    listTickets(supabase, { filter, query, page }),
    ticketCounts(supabase, query),
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
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </div>
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
      <Card className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground" role="status">
          {f.results(total)}
        </p>
        {rows.length === 0 ? (
          <p className="text-muted-foreground">{f.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.ticket}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.declarant}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.status}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.handler}
                  </th>
                  <th scope="col" className="py-2 font-normal">
                    {t.columns.due}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const type = t.types[row.type as keyof typeof t.types] ?? row.type;
                  const label = row.subject ?? t.noSubject;
                  const late = row.status !== "resolu" && new Date(row.due_at) < now;
                  return (
                    <tr key={row.ticket_id} className="border-t border-border align-top">
                      <td className="py-3 pr-4">
                        <Link
                          href={`${PATH}/${row.ticket_id}` as Route}
                          aria-label={t.openTicket(label)}
                          className="font-medium text-primary underline-offset-2 hover:underline"
                        >
                          {label}
                        </Link>
                        <span className="block text-xs text-muted-foreground">
                          {[
                            type,
                            row.chantier_title,
                            row.notes > 0 ? t.notesCount(row.notes) : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {row.declarant ?? row.contact_email}
                        {row.declarant && (
                          <span className="block text-xs break-all text-muted-foreground">
                            {row.contact_email}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge tone={TONES[row.status as keyof typeof TONES] ?? "neutral"}>
                          {t.status[row.status as keyof typeof t.status] ?? row.status}
                        </StatusBadge>
                      </td>
                      <td className="py-3 pr-4">{row.handler ?? t.nobody}</td>
                      <td className={`py-3 ${late ? "font-medium text-danger" : ""}`}>
                        {late ? t.late : formatDay(row.due_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} hrefFor={(p) => href({ page: p })} />
      </Card>
    </div>
  );
}
