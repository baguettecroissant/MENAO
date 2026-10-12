import type { Metadata, Route } from "next";
import Link from "next/link";
import { FilterChips, Pagination, SearchForm, listHref } from "@/components/admin/list-controls";
import { SummaryTile, SummaryTiles, WebhookAlert } from "@/components/admin/money";
import { Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { parsePage } from "@/lib/admin/follow-up";
import { requireAdmin } from "@/lib/admin/guard";
import {
  PAYMENT_FILTERS,
  getPaymentSummary,
  listPayments,
  parsePaymentFilter,
  paymentCounts,
  webhookCounts,
} from "@/lib/admin/money";
import { formatDay } from "@/lib/format";

const t = fr.admin.payments;
const f = fr.admin.followUp;
const PATH = "/admin/paiements";
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const eurosRounded = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

const TONES = {
  paye: "success",
  en_attente: "neutral",
  en_cours: "primary",
  echoue: "danger",
  annule: "neutral",
} as const;

/**
 * Paiements des chantiers (F-54, ADR 0051), en lecture seule : versés par les clients sur le
 * compte Stripe de l'artisan, MENAO n'encaisse rien (CLAUDE.md règle 12).
 */
export default async function AdminPaymentsPage({ searchParams }: PageProps<"/admin/paiements">) {
  const params = await searchParams;
  const filter = parsePaymentFilter(params.file);
  const query = typeof params.q === "string" && params.q.trim() ? params.q.trim() : null;
  const page = parsePage(params.page);
  const { supabase } = await requireAdmin();
  const [{ rows, total }, counts, summary, webhooks] = await Promise.all([
    listPayments(supabase, { filter, query, page }),
    paymentCounts(supabase, query),
    getPaymentSummary(supabase),
    webhookCounts(supabase),
  ]);
  const href = (next: { file?: string; page?: number }) =>
    listHref(PATH, {
      file: (next.file ?? filter) === "tous" ? null : (next.file ?? filter),
      q: query,
      page: next.page ?? 1,
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </div>
      <WebhookAlert failures={webhooks.echecs ?? 0} />
      {summary && (
        <SummaryTiles label={t.title}>
          <SummaryTile
            label={t.summary.paid}
            value={eurosRounded.format(summary.payes_30j_cents / 100)}
            hint={t.summary.paidCount(summary.payes_30j)}
          />
          <SummaryTile
            label={t.summary.paidTotal}
            value={eurosRounded.format(summary.payes_cents / 100)}
            hint={t.summary.paidTotalHint}
          />
          <SummaryTile
            label={t.summary.pending}
            value={eurosRounded.format(summary.en_cours_cents / 100)}
            hint={t.summary.pendingHint(summary.en_cours)}
          />
          <SummaryTile
            label={t.summary.failed}
            value={summary.echoues_7j.toLocaleString("fr-FR")}
            hint={t.summary.failedHint}
            tone={summary.echoues_7j > 0 ? "warning" : "default"}
          />
        </SummaryTiles>
      )}
      <SearchForm
        action={PATH}
        label={t.searchLabel}
        placeholder={t.searchPlaceholder}
        query={query}
        keep={{ file: filter === "tous" ? null : filter }}
      />
      <FilterChips
        label={t.filtersLabel}
        items={PAYMENT_FILTERS.map((key) => ({
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
                    {t.columns.chantier}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.artisan}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.payment}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-normal">
                    {t.columns.amount}
                  </th>
                  <th scope="col" className="py-2 font-normal">
                    {t.columns.status}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.payment_id} className="border-t border-border align-top">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/chantiers/${row.chantier_id}` as Route}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {row.chantier}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {row.client ?? f.none}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/artisans/${row.artisan_id}` as Route}
                        className="underline-offset-2 hover:text-primary-strong hover:underline"
                      >
                        {row.artisan ?? f.none}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      {t.kinds[row.kind] ?? row.kind}
                      <span className="block text-xs text-muted-foreground">
                        {[
                          row.devis,
                          row.paid_at
                            ? t.paidOn(formatDay(row.paid_at))
                            : t.startedOn(formatDay(row.created_at)),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right font-medium tabular-nums">
                      {euros.format(row.amount_cents / 100)}
                    </td>
                    <td className="py-3">
                      <StatusBadge tone={TONES[row.status as keyof typeof TONES] ?? "neutral"}>
                        {t.statuses[row.status] ?? row.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} hrefFor={(p) => href({ page: p })} />
      </Card>
      <Link
        href={"/admin/paiements/notifications" as Route}
        className="self-start text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        {t.webhooksLink} →
      </Link>
    </div>
  );
}
