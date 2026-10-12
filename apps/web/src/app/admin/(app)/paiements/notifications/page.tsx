import type { Metadata } from "next";
import Link from "next/link";
import { FilterChips, Pagination, listHref } from "@/components/admin/list-controls";
import { Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { parsePage } from "@/lib/admin/follow-up";
import { requireAdmin } from "@/lib/admin/guard";
import {
  WEBHOOK_FILTERS,
  listWebhookEvents,
  parseWebhookFilter,
  webhookCounts,
} from "@/lib/admin/money";
import { formatDayTime } from "@/lib/format";

const t = fr.admin.webhooks;
const f = fr.admin.followUp;
const PATH = "/admin/paiements/notifications";

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

const TONES = {
  en_echec: "danger",
  bloquee: "danger",
  retablie: "success",
  traitee: "neutral",
  en_cours: "primary",
} as const;

/**
 * Notifications Stripe et DocuSeal (ADR 0051) : celles dont le traitement a échoué ou s'est
 * interrompu, et celles rétablies depuis. Le code d'erreur est technique, sans donnée personnelle.
 */
export default async function AdminWebhooksPage({
  searchParams,
}: PageProps<"/admin/paiements/notifications">) {
  const params = await searchParams;
  const filter = parseWebhookFilter(params.file);
  const page = parsePage(params.page);
  const { supabase } = await requireAdmin();
  const [{ rows, total }, counts] = await Promise.all([
    listWebhookEvents(supabase, { filter, page }),
    webhookCounts(supabase),
  ]);
  const href = (next: { file?: string; page?: number }) =>
    listHref(PATH, {
      file: (next.file ?? filter) === "echecs" ? null : (next.file ?? filter),
      page: next.page ?? 1,
    });

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/paiements"
        className="self-start font-medium text-primary underline-offset-2 hover:underline"
      >
        ← {t.back}
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t.intro}</p>
      </div>
      <FilterChips
        label={t.filtersLabel}
        items={WEBHOOK_FILTERS.map((key) => ({
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
          <p className="text-muted-foreground">{filter === "echecs" ? t.emptyFailures : t.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.event}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.received}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.state}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-normal">
                    {t.columns.failures}
                  </th>
                  <th scope="col" className="py-2 font-normal">
                    {t.columns.error}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.event_id} className="border-t border-border align-top">
                    <td className="py-3 pr-4">
                      <span className="font-medium">{t.events[row.type] ?? row.type}</span>
                      <span className="block text-xs break-all text-muted-foreground">
                        {[t.sources[row.source] ?? row.source, row.event_id].join(" · ")}
                      </span>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {formatDayTime(row.received_at)}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge tone={TONES[row.etat as keyof typeof TONES] ?? "neutral"}>
                        {t.states[row.etat] ?? row.etat}
                      </StatusBadge>
                      {row.etat === "bloquee" ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {t.blockedHint}
                        </span>
                      ) : (
                        row.failed_at && (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {t.lastFailure(formatDayTime(row.failed_at))}
                          </span>
                        )
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">{row.failures}</td>
                    <td className="py-3 font-mono text-xs break-all">{row.last_error ?? f.none}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} hrefFor={(p) => href({ page: p })} />
      </Card>
      <p className="max-w-3xl text-sm text-muted-foreground">{t.help}</p>
    </div>
  );
}
