import { marketFunnel, marketTotals } from "@menao/core";
import type { Metadata } from "next";
import { FilterChips, listHref } from "@/components/admin/list-controls";
import { MarketMap } from "@/components/admin/market-map";
import { Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { MARKET_PERIODS, getMarket, parseMarketPeriod } from "@/lib/admin/market";

const t = fr.admin.market;
const PATH = "/admin/marche";
const FUNNEL_ROWS = 40;

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

const count = (n: number) => n.toLocaleString("fr-FR");

/**
 * Marché (ADR 0181) : les artisans de MENAO sur une carte, la demande des particuliers par commune
 * et l'entonnoir recherches → résultats → demandes, avec les communes où il faut recruter.
 */
export default async function AdminMarketPage({ searchParams }: PageProps<"/admin/marche">) {
  const params = await searchParams;
  const days = parseMarketPeriod(params.periode);
  const { supabase } = await requireAdmin();
  const market = await getMarket(supabase, days);
  const funnel = marketFunnel(market.demand);
  const totals = marketTotals(market.artisans, funnel);
  const tradeLabel = (code: string | null) =>
    code ? (market.trades.find((tr) => tr.code === code)?.label ?? code) : t.funnel.unknownTrade;
  const withoutPosition = market.artisans.filter((a) => a.lon === null || a.lat === null).length;

  const figures = [
    { label: t.figures.valides, value: count(totals.valides) },
    { label: t.figures.enCours, value: count(totals.enCours) },
    { label: t.figures.recherches(days), value: count(totals.recherches) },
    { label: t.figures.demandes, value: count(totals.demandes) },
    {
      label: t.figures.taux,
      value: totals.tauxDemandes === null ? "—" : `${totals.tauxDemandes} %`,
    },
    { label: t.figures.aRecruter, value: count(totals.aRecruter), alert: totals.aRecruter > 0 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </div>

      <FilterChips
        label={t.periodLabel}
        items={MARKET_PERIODS.map((period) => ({
          key: String(period),
          href: listHref(PATH, { periode: period === 90 ? null : period }),
          label: t.periods[period],
          active: period === days,
        }))}
      />

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {figures.map((figure) => (
          <Card key={figure.label} className="flex flex-col gap-1 !p-4">
            <dt className="text-xs text-muted-foreground">{figure.label}</dt>
            <dd
              className={`text-2xl font-medium tabular-nums ${figure.alert ? "text-warning" : ""}`}
            >
              {figure.value}
            </dd>
          </Card>
        ))}
      </dl>

      <Card className="flex flex-col gap-3">
        <MarketMap
          artisans={market.artisans}
          demand={market.demand}
          trades={market.trades}
          today={new Date().getTime()}
        />
        {(withoutPosition > 0 || market.withoutCommune > 0) && (
          <p className="text-xs text-muted-foreground">
            {[
              withoutPosition > 0 ? t.map.noPosition(withoutPosition) : null,
              market.withoutCommune > 0 ? t.funnel.unplaced(market.withoutCommune) : null,
            ]
              .filter(Boolean)
              .join(" ")}
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">{t.funnel.title}</h2>
          <p className="text-sm text-muted-foreground">{t.funnel.intro}</p>
        </div>
        {funnel.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.funnel.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">{t.funnel.commune}</th>
                  <th className="py-2 pr-3 font-medium">{t.funnel.trade}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t.funnel.searches}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t.funnel.results}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t.funnel.requests}</th>
                  <th className="py-2 text-right font-medium">{t.funnel.coverage}</th>
                </tr>
              </thead>
              <tbody>
                {funnel.slice(0, FUNNEL_ROWS).map((row) => (
                  <tr
                    key={`${row.code_insee}-${row.metier ?? ""}`}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-2 pr-3">{row.ville ?? row.code_insee}</td>
                    <td className="py-2 pr-3">{tradeLabel(row.metier)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{count(row.recherches)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{count(row.resultats)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{count(row.demandes)}</td>
                    <td className="py-2 text-right">
                      {row.aRecruter ? (
                        <span className="inline-flex rounded-pill bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">
                          {t.funnel.toRecruit}
                        </span>
                      ) : (
                        <span className="tabular-nums">
                          {t.funnel.covered(row.couverture, row.couverture_large)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
