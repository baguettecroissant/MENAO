import { churnRate } from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { FilterChips, Pagination, SearchForm, listHref } from "@/components/admin/list-controls";
import { SummaryTile, SummaryTiles, WebhookAlert } from "@/components/admin/money";
import { Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { parsePage } from "@/lib/admin/follow-up";
import { requireAdmin } from "@/lib/admin/guard";
import {
  SUBSCRIPTION_FILTERS,
  getSubscriptionSummary,
  listSubscriptions,
  parseSubscriptionFilter,
  subscriptionCounts,
  webhookCounts,
} from "@/lib/admin/money";
import { formatDay } from "@/lib/format";

const t = fr.admin.subscriptions;
const f = fr.admin.followUp;
const stripeStatus = fr.admin.detail.subscriptionStatus;
const PATH = "/admin/abonnements";
const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

const TONES = {
  actifs: "success",
  essais: "primary",
  impayes: "danger",
  fin_programmee: "warning",
  resilies: "neutral",
  autres: "neutral",
} as const;

/** Échéance utile selon la situation : fin d'essai, prochain prélèvement, fin programmée ou passée. */
function nextDate(row: {
  situation: string;
  trial_end: string | null;
  current_period_end: string | null;
  ended_at: string | null;
}): string | null {
  if (row.situation === "resilies") return row.ended_at && t.endedOn(formatDay(row.ended_at));
  if (row.situation === "fin_programmee")
    return row.current_period_end && t.endsOn(formatDay(row.current_period_end));
  if (row.situation === "essais") return row.trial_end && t.trialUntil(formatDay(row.trial_end));
  return row.current_period_end && t.renewsOn(formatDay(row.current_period_end));
}

/**
 * Abonnements des artisans (F-58, ADR 0051), en lecture seule : revenu mensuel récurrent,
 * essais, impayés et résiliations, au tarif des formules.
 */
export default async function AdminSubscriptionsPage({
  searchParams,
}: PageProps<"/admin/abonnements">) {
  const params = await searchParams;
  const filter = parseSubscriptionFilter(params.file);
  const query = typeof params.q === "string" && params.q.trim() ? params.q.trim() : null;
  const page = parsePage(params.page);
  const { supabase } = await requireAdmin();
  const [{ rows, total }, counts, summary, webhooks] = await Promise.all([
    listSubscriptions(supabase, { filter, query, page }),
    subscriptionCounts(supabase, query),
    getSubscriptionSummary(supabase),
    webhookCounts(supabase),
  ]);
  const href = (next: { file?: string; page?: number }) =>
    listHref(PATH, {
      file: (next.file ?? filter) === "tous" ? null : (next.file ?? filter),
      q: query,
      page: next.page ?? 1,
    });
  const churn = summary
    ? churnRate({ lost: summary.perdus_30j, atStart: summary.en_cours_30j })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </div>
      <WebhookAlert failures={webhooks.echecs ?? 0} />
      {summary && (
        <>
          <SummaryTiles label={t.title}>
            <SummaryTile
              label={t.summary.mrr}
              value={euros.format(summary.mrr_cents / 100)}
              hint={t.summary.mrrHint(summary.payants)}
            />
            <SummaryTile
              label={t.summary.trials}
              value={summary.essais.toLocaleString("fr-FR")}
              hint={t.summary.trialsHint(euros.format(summary.essais_cents / 100))}
            />
            <SummaryTile
              label={t.summary.unpaid}
              value={summary.impayes.toLocaleString("fr-FR")}
              hint={t.summary.unpaidHint(euros.format(summary.impayes_cents / 100))}
              tone={summary.impayes > 0 ? "danger" : "default"}
            />
            <SummaryTile
              label={t.summary.cancelled}
              value={summary.resilies_30j.toLocaleString("fr-FR")}
              hint={
                <>
                  {t.summary.churn(churn === null ? f.none : fr.review.percent(churn))}{" "}
                  <span className="block">{t.summary.churnHint}</span>
                </>
              }
            />
          </SummaryTiles>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <Card className="flex flex-col gap-3">
              <h2 className="text-lg font-medium">{t.plans.title}</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[30rem] text-left text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th scope="col" className="py-2 pr-4 font-normal">
                        {t.plans.plan}
                      </th>
                      <th scope="col" className="py-2 pr-4 text-right font-normal">
                        {t.plans.price}
                      </th>
                      <th scope="col" className="py-2 pr-4 text-right font-normal">
                        {t.plans.paying}
                      </th>
                      <th scope="col" className="py-2 pr-4 text-right font-normal">
                        {t.plans.trials}
                      </th>
                      <th scope="col" className="py-2 text-right font-normal">
                        {t.plans.mrr}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {summary.formules.map((plan) => (
                      <tr key={plan.code} className="border-t border-border">
                        <td className="py-2 pr-4 font-medium">{plan.nom}</td>
                        <td className="py-2 pr-4 text-right">
                          {euros.format(plan.prix_cents / 100)}
                        </td>
                        <td className="py-2 pr-4 text-right">{plan.payants}</td>
                        <td className="py-2 pr-4 text-right">{plan.essais}</td>
                        <td className="py-2 text-right font-medium">
                          {euros.format(plan.mrr_cents / 100)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {summary.sans_formule > 0 && (
                <p className="text-xs text-warning">{t.noPlan(summary.sans_formule)}</p>
              )}
            </Card>
            <dl className="flex flex-col gap-1 self-start rounded-card border border-border bg-surface p-5 shadow-card">
              <dt className="text-sm text-muted-foreground">{t.summary.scheduled}</dt>
              <dd className="text-2xl font-medium tracking-tight tabular-nums">
                {summary.fin_programmee.toLocaleString("fr-FR")}
              </dd>
              <dd className="text-xs text-muted-foreground">{t.summary.scheduledHint}</dd>
            </dl>
          </div>
        </>
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
        items={SUBSCRIPTION_FILTERS.map((key) => ({
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
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.artisan}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.plan}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.situation}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.next}
                  </th>
                  <th scope="col" className="py-2 font-normal">
                    {t.columns.since}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.artisan_id} className="border-t border-border align-top">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/artisans/${row.artisan_id}` as Route}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {row.artisan ?? f.none}
                      </Link>
                      {row.siret && (
                        <span className="block text-xs text-muted-foreground tabular-nums">
                          {row.siret}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {row.formule ?? t.unknownPlan}
                      {row.prix_cents !== null && (
                        <span className="block text-xs text-muted-foreground">
                          {t.perMonth(euros.format(row.prix_cents / 100))}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge tone={TONES[row.situation as keyof typeof TONES] ?? "neutral"}>
                        {t.situations[row.situation] ?? row.situation}
                      </StatusBadge>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {stripeStatus[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{nextDate(row) ?? f.none}</td>
                    <td className="py-3">{formatDay(row.created_at)}</td>
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
