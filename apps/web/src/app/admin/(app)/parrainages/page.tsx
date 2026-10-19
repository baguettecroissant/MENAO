import type { Metadata, Route } from "next";
import Link from "next/link";
import { FilterChips, listHref } from "@/components/admin/list-controls";
import { SummaryTile, SummaryTiles } from "@/components/admin/money";
import { CancelReferralForm } from "@/components/admin/referral-forms";
import { Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import {
  REFERRAL_FILTERS,
  getReferralSummary,
  listReferrals,
  parseReferralFilter,
} from "@/lib/admin/referrals";
import { formatDay } from "@/lib/format";

const t = fr.admin.referrals;
const PATH = "/admin/parrainages";
const count = (n: number) => n.toLocaleString("fr-FR");

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

const TONES = { en_attente: "primary", recompense: "success", annule: "neutral" } as const;

/**
 * Parrainages entre artisans (F-60, ADR 0137 et 0143) : chiffres clés, liste avec le parrain, le
 * filleul et le mois offert de chacun, annulation d'un abus avant la récompense. Réservé aux admins.
 */
export default async function AdminReferralsPage({
  searchParams,
}: PageProps<"/admin/parrainages">) {
  const filter = parseReferralFilter((await searchParams).statut);
  const { supabase } = await requireAdmin();
  const [rows, summary] = await Promise.all([
    listReferrals(supabase, filter),
    getReferralSummary(supabase),
  ]);
  const counts = summary && {
    tous: summary.en_attente + summary.recompense + summary.annule,
    en_attente: summary.en_attente,
    recompense: summary.recompense,
    annule: summary.annule,
  };
  const c = t.columns;
  const artisanLink = (id: string, name: string) => (
    <Link
      href={`/admin/artisans/${id}` as Route}
      className="font-medium text-primary underline-offset-2 hover:underline"
    >
      {name}
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
        <p className="text-sm text-muted-foreground">{t.how}</p>
      </div>
      {summary && (
        <SummaryTiles label={t.title}>
          <SummaryTile
            label={t.summary.pending}
            value={count(summary.en_attente)}
            hint={t.summary.pendingHint}
          />
          <SummaryTile
            label={t.summary.rewarded}
            value={count(summary.recompense)}
            hint={t.summary.rewardedHint}
          />
          <SummaryTile
            label={t.summary.months}
            value={count(summary.mois_poses)}
            hint={t.summary.monthsHint(summary.mois_en_attente)}
          />
          <SummaryTile
            label={t.summary.cancelled}
            value={count(summary.annule)}
            hint={t.summary.cancelledHint}
          />
        </SummaryTiles>
      )}
      <FilterChips
        label={t.filtersLabel}
        items={REFERRAL_FILTERS.map((key) => ({
          key,
          href: listHref(PATH, { statut: key === "tous" ? null : key }),
          label: t.filters[key],
          count: counts?.[key],
          active: key === filter,
        }))}
      />
      <Card className="flex flex-col gap-4">
        {rows.length === 0 ? (
          <p className="text-muted-foreground">{t.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {c.date}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {c.referrer}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {c.referred}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {c.status}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {c.months}
                  </th>
                  <th scope="col" className="py-2 font-normal">
                    {c.action}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border align-top">
                    <td className="py-3 pr-4 whitespace-nowrap">{formatDay(row.created_at)}</td>
                    <td className="py-3 pr-4">{artisanLink(row.referrer_id, row.referrer)}</td>
                    <td className="py-3 pr-4">{artisanLink(row.referred_id, row.referred)}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge tone={TONES[row.status]}>{t.status[row.status]}</StatusBadge>
                      {row.status === "recompense" && row.rewarded_at && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {t.rewardedOn(formatDay(row.rewarded_at))}
                        </span>
                      )}
                      {row.status === "annule" && row.cancel_reason && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {t.cancelled(row.cancel_reason)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {row.referrer_month || row.referred_month ? (
                        <ul className="flex flex-col gap-0.5">
                          {row.referrer_month && (
                            <li>{t.monthOf(t.referrerShort, t.month[row.referrer_month])}</li>
                          )}
                          {row.referred_month && (
                            <li>{t.monthOf(t.referredShort, t.month[row.referred_month])}</li>
                          )}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">{t.noMonth}</span>
                      )}
                    </td>
                    <td className="py-3">
                      {row.status === "en_attente" ? (
                        <CancelReferralForm referralId={row.id} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {rows.length >= 200 ? `${t.limit} ` : ""}
          {t.cancelHint}
        </p>
      </Card>
    </div>
  );
}
