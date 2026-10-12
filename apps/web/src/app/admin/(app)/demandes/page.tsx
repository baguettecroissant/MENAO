import { PROJECT_FILTERS, parseProjectFilter, timeLeft } from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { FilterChips, Pagination, SearchForm, listHref } from "@/components/admin/list-controls";
import { Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { listProjects, parsePage, projectCounts } from "@/lib/admin/follow-up";
import { formatDay, formatTimeAgo } from "@/lib/format";

const t = fr.admin.followUp;
const r = t.requests;
const PATH = "/admin/demandes";

export const metadata: Metadata = { title: `${r.title} — ${fr.admin.title}` };

const TONES = {
  en_attente: "warning",
  chantier: "success",
  sans_suite: "neutral",
  non_envoyee: "neutral",
} as const;

/**
 * Suivi des demandes (F-53, ADR 0046) : chaque projet d'un particulier, de la recherche au
 * rendez-vous, avec son étape, ses artisans et le délai de réponse restant.
 */
export default async function AdminRequestsPage({ searchParams }: PageProps<"/admin/demandes">) {
  const params = await searchParams;
  const filter = parseProjectFilter(params.filtre);
  const query = typeof params.q === "string" && params.q.trim() ? params.q.trim() : null;
  const page = parsePage(params.page);
  const { supabase } = await requireAdmin();
  const [{ rows, total }, counts] = await Promise.all([
    listProjects(supabase, { filter, query, page }),
    projectCounts(supabase, query),
  ]);
  const now = new Date();
  const href = (next: { filtre?: string; page?: number }) =>
    listHref(PATH, {
      filtre: (next.filtre ?? filter) === "toutes" ? null : (next.filtre ?? filter),
      q: query,
      page: next.page ?? 1,
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight">{r.title}</h1>
        <p className="text-sm text-muted-foreground">{r.intro}</p>
      </div>
      <SearchForm
        action={PATH}
        label={r.searchLabel}
        placeholder={r.searchPlaceholder}
        query={query}
        keep={{ filtre: filter === "toutes" ? null : filter }}
      />
      <FilterChips
        label={r.filtersLabel}
        items={PROJECT_FILTERS.map((f) => ({
          key: f,
          href: href({ filtre: f }),
          label: r.filters[f],
          count: counts[f],
          active: f === filter,
        }))}
      />
      <Card className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground" role="status">
          {t.results(total)}
        </p>
        {rows.length === 0 ? (
          <p className="text-muted-foreground">{t.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {r.columns.request}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {r.columns.client}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {r.columns.artisans}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {r.columns.stage}
                  </th>
                  <th scope="col" className="py-2 font-normal">
                    {r.columns.created}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const label = `${row.metier ?? r.tradeUnknown} · ${row.ville ?? r.cityUnknown}`;
                  const left =
                    row.etape === "en_attente" && row.prochaine_echeance
                      ? timeLeft(new Date(row.prochaine_echeance), now)
                      : null;
                  return (
                    <tr key={row.project_id} className="border-t border-border align-top">
                      <td className="py-3 pr-4">
                        <Link
                          href={`${PATH}/${row.project_id}` as Route}
                          aria-label={r.open(label)}
                          className="font-medium text-primary underline-offset-2 hover:underline"
                        >
                          {label}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">{row.client ?? t.visitor}</td>
                      <td className="py-3 pr-4">
                        {row.demandes === 0 ? (
                          <span className="text-muted-foreground">{r.artisansNone}</span>
                        ) : (
                          <>
                            {r.artisansCount(row.demandes)}
                            {row.en_attente > 0 && (
                              <span className="block text-xs text-muted-foreground">
                                {r.pendingCount(row.en_attente)}
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge tone={TONES[row.etape as keyof typeof TONES] ?? "neutral"}>
                          {r.stages[row.etape] ?? row.etape}
                        </StatusBadge>
                        {left && (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {fr.admin.overview.todo.expiresIn(left.hours, left.minutes)}
                          </span>
                        )}
                      </td>
                      <td className="py-3" title={formatDay(row.created_at)}>
                        {formatTimeAgo(row.created_at, now)}
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
