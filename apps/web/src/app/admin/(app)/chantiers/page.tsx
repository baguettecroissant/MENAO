import { CHANTIER_STAGES, chantierStage, chantiersByStage, parseChantierStage } from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { FilterChips, Pagination, SearchForm, listHref } from "@/components/admin/list-controls";
import { Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { chantierCounts, listChantiers, parsePage } from "@/lib/admin/follow-up";
import { formatDay, formatTimeAgo } from "@/lib/format";

const t = fr.admin.followUp;
const c = t.chantiers;
const stages = fr.admin.overview.figures.chantiers.stages;
const PATH = "/admin/chantiers";
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export const metadata: Metadata = { title: `${c.title} — ${fr.admin.title}` };

const TONES = {
  demande: "primary",
  devis: "primary",
  travaux: "warning",
  reception: "warning",
  termine: "success",
  litige: "danger",
  abandonne: "neutral",
} as const;

/** Suivi des chantiers (F-53, ADR 0046) : étape, parties, montants et dernière activité. */
export default async function AdminChantiersPage({ searchParams }: PageProps<"/admin/chantiers">) {
  const params = await searchParams;
  const stage = parseChantierStage(params.etape);
  const query = typeof params.q === "string" && params.q.trim() ? params.q.trim() : null;
  const page = parsePage(params.page);
  const { supabase } = await requireAdmin();
  const [{ rows, total }, byStatus] = await Promise.all([
    listChantiers(supabase, { stage, query, page }),
    chantierCounts(supabase, query),
  ]);
  const byStage = chantiersByStage(byStatus);
  const all = Object.values(byStage).reduce((sum, n) => sum + n, 0);
  const now = new Date();
  const href = (next: { etape?: string | null; page?: number }) =>
    listHref(PATH, {
      etape: next.etape === undefined ? stage : next.etape,
      q: query,
      page: next.page ?? 1,
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight">{c.title}</h1>
        <p className="text-sm text-muted-foreground">{c.intro}</p>
      </div>
      <SearchForm
        action={PATH}
        label={c.searchLabel}
        placeholder={c.searchPlaceholder}
        query={query}
        keep={{ etape: stage }}
      />
      <FilterChips
        label={c.filtersLabel}
        items={[
          { key: "tous", href: href({ etape: null }), label: c.all, count: all, active: !stage },
          ...CHANTIER_STAGES.map((s) => ({
            key: s,
            href: href({ etape: s }),
            label: stages[s],
            count: byStage[s],
            active: s === stage,
          })),
        ]}
      />
      <Card className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground" role="status">
          {t.results(total)}
        </p>
        {rows.length === 0 ? (
          <p className="text-muted-foreground">{t.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {c.columns.chantier}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {c.columns.artisan}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {c.columns.client}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {c.columns.status}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {c.columns.amounts}
                  </th>
                  <th scope="col" className="py-2 font-normal">
                    {c.columns.activity}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.chantier_id} className="border-t border-border align-top">
                    <td className="py-3 pr-4">
                      <Link
                        href={`${PATH}/${row.chantier_id}` as Route}
                        aria-label={c.open(row.title)}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {row.title}
                      </Link>
                      {row.ville && (
                        <span className="block text-xs text-muted-foreground">{row.ville}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/artisans/${row.artisan_id}` as Route}
                        className="underline-offset-2 hover:text-primary-strong hover:underline"
                      >
                        {row.artisan}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{row.client ?? t.none}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge tone={TONES[chantierStage(row.status)]}>
                        {fr.pro.chantiers.status[row.status]}
                      </StatusBadge>
                    </td>
                    <td className="py-3 pr-4 tabular-nums">
                      {row.devis_ttc_cents ? euros.format(row.devis_ttc_cents / 100) : t.none}
                      <span className="block text-xs text-muted-foreground">
                        {euros.format((row.paye_cents ?? 0) / 100)}
                      </span>
                    </td>
                    <td
                      className="py-3"
                      title={row.derniere_activite ? formatDay(row.derniere_activite) : undefined}
                    >
                      {row.derniere_activite ? formatTimeAgo(row.derniere_activite, now) : t.none}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} hrefFor={(p) => href({ page: p })} />
      </Card>
    </div>
  );
}
