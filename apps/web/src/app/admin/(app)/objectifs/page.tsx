import type { Metadata } from "next";
import { LeadTable } from "@/components/admin/lead-targets";
import { DefaultLeadTargetForm } from "@/components/admin/lead-target-forms";
import { FilterChips, SearchForm, listHref } from "@/components/admin/list-controls";
import { SummaryTile, SummaryTiles } from "@/components/admin/money";
import { Alert, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import {
  LEAD_FILTERS,
  getLeadTargets,
  matchesLeadFilter,
  parseLeadFilter,
  parseLeadMonth,
  recentMonths,
  sortLeadArtisans,
} from "@/lib/admin/lead-targets";

const t = fr.admin.leads;
const PATH = "/admin/objectifs";

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

const count = (n: number) => n.toLocaleString("fr-FR");

/**
 * Objectifs de demandes (F-131, ADR 0282) : pour chaque artisan validé, les demandes reçues du
 * mois face à son objectif, le rythme attendu à date, les 6 derniers mois et la cause probable
 * d'un manque. Les plus en difficulté d'abord.
 */
export default async function AdminLeadTargetsPage({
  searchParams,
}: PageProps<"/admin/objectifs">) {
  const params = await searchParams;
  const filter = parseLeadFilter(params.statut);
  const month = parseLeadMonth(params.mois);
  const query = typeof params.q === "string" && params.q.trim() ? params.q.trim() : null;
  const { supabase } = await requireAdmin();
  const data = await getLeadTargets(supabase, { month });

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
          {t.title}
        </h1>
        <Alert tone="error">{t.unavailable}</Alert>
      </div>
    );
  }

  const current = data.month === `${data.today.slice(0, 7)}-01`;
  const followed = data.artisans.filter((a) => a.progress.status !== "hors_suivi");
  const byStatus = (status: string) => followed.filter((a) => a.progress.status === status).length;
  const twoMonths = data.artisans.filter((a) => a.alerts.includes("deux_mois")).length;
  const zero = followed.filter((a) => a.progress.received === 0).length;
  const noSearch = followed.filter((a) => a.searches === 0).length;
  const rate = followed.length ? Math.round((100 * byStatus("atteint")) / followed.length) : null;
  const received = data.artisans.reduce((sum, a) => sum + a.progress.received, 0);
  const direct = data.artisans.reduce((sum, a) => sum + a.direct, 0);

  const needle = query?.toLocaleLowerCase("fr");
  const searched = needle
    ? data.artisans.filter((a) => a.name.toLocaleLowerCase("fr").includes(needle))
    : data.artisans;
  const rows = sortLeadArtisans(searched.filter((a) => matchesLeadFilter(a, filter)));
  const monthParam = current ? null : data.month.slice(0, 7);
  const href = (next: { statut?: string; mois?: string | null }) =>
    listHref(PATH, {
      statut: (next.statut ?? filter) === "tous" ? null : (next.statut ?? filter),
      mois: next.mois === undefined ? monthParam : next.mois,
      q: query,
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
          {t.title}
        </h1>
        <p className="max-w-3xl text-[0.9375rem] text-label sm:text-base">{t.intro}</p>
      </div>

      <FilterChips
        label={t.monthsLabel}
        items={recentMonths(data.today).map((m, i) => ({
          key: m,
          href: href({ mois: i === 0 ? null : m.slice(0, 7) }),
          label: i === 0 ? t.current : t.month(m),
          active: m === data.month,
        }))}
      />

      <SummaryTiles label={t.month(data.month)}>
        <SummaryTile
          label={t.summary.followed}
          value={count(followed.length)}
          hint={t.summary.followedHint(data.defaultTarget)}
        />
        <SummaryTile label={t.summary.reached} value={count(byStatus("atteint"))} />
        {current ? (
          <>
            <SummaryTile label={t.summary.onTrack} value={count(byStatus("dans_les_temps"))} />
            <SummaryTile
              label={t.summary.late}
              value={count(byStatus("en_retard"))}
              hint={t.summary.lateHint}
              tone={byStatus("en_retard") > 0 ? "warning" : "default"}
            />
          </>
        ) : (
          <>
            <SummaryTile
              label={t.summary.missed}
              value={count(byStatus("manque"))}
              tone={byStatus("manque") > 0 ? "danger" : "default"}
            />
            <SummaryTile
              label={t.summary.rate}
              value={rate === null ? "—" : fr.review.percent(rate)}
            />
          </>
        )}
        <SummaryTile
          label={t.summary.zero}
          value={count(zero)}
          tone={zero > 0 ? "danger" : "default"}
        />
        <SummaryTile
          label={t.summary.twoMonths}
          value={count(twoMonths)}
          hint={t.summary.twoMonthsHint}
          tone={twoMonths > 0 ? "danger" : "default"}
        />
        <SummaryTile
          label={t.summary.requests}
          value={count(received)}
          hint={direct > 0 ? t.summary.requestsHint(direct) : undefined}
        />
        <SummaryTile
          label={t.summary.noSearch}
          value={count(noSearch)}
          hint={t.summary.noSearchHint}
          tone={noSearch > 0 ? "warning" : "default"}
        />
      </SummaryTiles>

      <SearchForm
        action={PATH}
        label={t.searchLabel}
        placeholder={t.searchPlaceholder}
        query={query}
        keep={{ statut: filter === "tous" ? null : filter, mois: monthParam }}
      />
      <FilterChips
        label={t.filtersLabel}
        items={LEAD_FILTERS.filter(
          (key) => current || (key !== "en_retard" && key !== "dans_les_temps"),
        ).map((key) => ({
          key,
          href: href({ statut: key }),
          label: t.filters[key],
          count: searched.filter((a) => matchesLeadFilter(a, key)).length,
          active: key === filter,
        }))}
      />

      <Card className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground" role="status">
          {t.results(rows.length)}
        </p>
        {rows.length === 0 ? (
          <p className="text-muted-foreground">{t.empty}</p>
        ) : (
          <LeadTable rows={rows} />
        )}
      </Card>

      <Card className="flex flex-col gap-3" id="objectif-defaut">
        <h2 className="text-lg font-medium">{t.settings.title}</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">{t.settings.lead}</p>
        <DefaultLeadTargetForm target={data.defaultTarget} saved={params.fait === "objectif"} />
      </Card>
    </div>
  );
}
