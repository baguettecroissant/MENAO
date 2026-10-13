import { aiRates } from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { FilterChips, listHref } from "@/components/admin/list-controls";
import { SummaryTile, SummaryTiles } from "@/components/admin/money";
import { Alert, Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { AI_PERIODS, getAiSummary, parseAiPeriod } from "@/lib/admin/ai";
import { requireAdmin } from "@/lib/admin/guard";
import { formatDayMonthShort, formatDayTime } from "@/lib/format";

const t = fr.admin.ai;
const f = fr.admin.followUp;
const PATH = "/admin/ia";

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

const count = (n: number) => n.toLocaleString("fr-FR");
const percentOrDash = (value: number | null) =>
  value === null ? f.none : fr.review.percent(value);
/** Durée en secondes, une décimale (« 1,2 s ») ; en millisecondes sous la seconde. */
const duration = (ms: number | null) =>
  ms === null
    ? f.none
    : ms < 1000
      ? `${ms} ms`
      : `${(ms / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s`;
const minutes = (seconds: number) =>
  (seconds / 60).toLocaleString("fr-FR", { maximumFractionDigits: 1 });

const OUTCOME_TONES = { invalide: "warning", refus: "warning", erreur: "danger" } as const;

/**
 * Suivi de l'IA (ADR 0052) : appels aux modèles par fonction et par modèle, résultats, latence et
 * volume sur la période, appels par jour et derniers échecs. Aucune donnée personnelle (ai_runs).
 */
export default async function AiMonitoringPage({ searchParams }: PageProps<"/admin/ia">) {
  const params = await searchParams;
  const period = parseAiPeriod(params.periode);
  const { supabase } = await requireAdmin();
  const summary = await getAiSummary(supabase, period);

  const totals = (summary?.fonctions ?? []).reduce(
    (acc, fn) => ({
      calls: acc.calls + fn.appels,
      unsure: acc.unsure + fn.peu_sur,
      invalid: acc.invalid + fn.invalide,
      refused: acc.refused + fn.refus,
      errors: acc.errors + fn.erreur,
      audio: acc.audio + fn.secondes_audio,
    }),
    { calls: 0, unsure: 0, invalid: 0, refused: 0, errors: 0, audio: 0 },
  );
  const rates = aiRates(totals);
  const failures = totals.invalid + totals.refused + totals.errors;
  const maxPerDay = Math.max(1, ...(summary?.par_jour ?? []).map((d) => d.appels));
  const hasDailyCalls = (summary?.par_jour ?? []).some((d) => d.appels > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t.intro}</p>
      </div>
      <FilterChips
        label={t.periodsLabel}
        items={AI_PERIODS.map((key) => ({
          key,
          href: listHref(PATH, { periode: key === "7" ? null : key }),
          label: t.periods[key] ?? key,
          active: key === period,
        }))}
      />
      {!summary ? (
        <Alert tone="error">{fr.errors.generic}</Alert>
      ) : (
        <>
          <SummaryTiles label={t.title}>
            <SummaryTile
              label={t.summary.calls}
              value={count(totals.calls)}
              hint={t.summary.callsHint(totals.calls)}
            />
            <SummaryTile
              label={t.summary.failures}
              value={percentOrDash(rates.failure)}
              hint={t.summary.failuresHint(failures)}
              tone={failures > 0 ? "warning" : "default"}
            />
            <SummaryTile
              label={t.summary.unsure}
              value={percentOrDash(rates.unsure)}
              hint={t.summary.unsureHint}
            />
            <SummaryTile
              label={t.summary.audio}
              value={t.audioMinutes(minutes(totals.audio))}
              hint={t.summary.audioHint}
            />
          </SummaryTiles>

          <Card className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">{t.functions.title}</h2>
            {summary.fonctions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.empty}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] text-left text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th scope="col" className="py-2 pr-4 font-normal">
                        {t.functions.name}
                      </th>
                      {[
                        t.functions.calls,
                        t.functions.ok,
                        t.functions.unsure,
                        t.functions.invalid,
                        t.functions.refused,
                        t.functions.errors,
                      ].map((label) => (
                        <th key={label} scope="col" className="py-2 pr-4 text-right font-normal">
                          {label}
                        </th>
                      ))}
                      <th scope="col" className="py-2 pr-4 font-normal">
                        {t.functions.latency}
                      </th>
                      <th scope="col" className="py-2 font-normal">
                        {t.functions.volume}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {summary.fonctions.map((fn) => (
                      <tr key={fn.fonction} className="border-t border-border align-top">
                        <td className="py-3 pr-4 font-medium">
                          {t.functionNames[fn.fonction] ?? fn.fonction}
                        </td>
                        {[fn.appels, fn.ok, fn.peu_sur, fn.invalide, fn.refus, fn.erreur].map(
                          (n, i) => (
                            <td key={i} className="py-3 pr-4 text-right">
                              {count(n)}
                            </td>
                          ),
                        )}
                        <td className="py-3 pr-4">
                          {duration(fn.latence_mediane)}
                          <span className="block text-xs text-muted-foreground">
                            {t.functions.latencyHint(duration(fn.latence_p95))}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">
                          {fn.secondes_audio > 0
                            ? t.audioMinutes(minutes(fn.secondes_audio))
                            : t.tokens(count(fn.jetons_entree), count(fn.jetons_sortie))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <Card className="flex min-w-0 flex-col gap-3">
              <h2 className="text-lg font-medium">{t.models.title}</h2>
              {summary.modeles.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.empty}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[26rem] text-left text-sm">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th scope="col" className="py-2 pr-4 font-normal">
                          {t.models.model}
                        </th>
                        <th scope="col" className="py-2 pr-4 text-right font-normal">
                          {t.models.calls}
                        </th>
                        <th scope="col" className="py-2 pr-4 text-right font-normal">
                          {t.models.failures}
                        </th>
                        <th scope="col" className="py-2 text-right font-normal">
                          {t.functions.latency}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {summary.modeles.map((m) => (
                        <tr key={`${m.fonction}-${m.modele}`} className="border-t border-border">
                          <td className="py-2 pr-4">
                            <span className="font-mono text-xs break-all">{m.modele}</span>
                            <span className="block text-xs text-muted-foreground">
                              {t.functionNames[m.fonction] ?? m.fonction}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-right">{count(m.appels)}</td>
                          <td className="py-2 pr-4 text-right">{count(m.echecs)}</td>
                          <td className="py-2 text-right">{duration(m.latence_mediane)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {summary.par_jour.length > 1 && (
              <Card className="flex min-w-0 flex-col gap-3">
                <h2 className="text-lg font-medium">{t.daily.title}</h2>
                {!hasDailyCalls ? (
                  <p className="text-sm text-muted-foreground">{t.empty}</p>
                ) : (
                  <>
                    <ol aria-label={t.daily.title} className="flex h-40 items-end gap-1">
                      {summary.par_jour.map((day) => {
                        const label = t.daily.day(
                          formatDayMonthShort(`${day.jour}T12:00:00Z`),
                          day.appels,
                          day.echecs,
                        );
                        return (
                          <li
                            key={day.jour}
                            title={label}
                            className="flex h-full min-w-0 flex-1 flex-col justify-end"
                          >
                            <span className="sr-only">{label}</span>
                            <span
                              aria-hidden="true"
                              className="flex w-full flex-col overflow-hidden rounded-t-sm bg-primary/70"
                              style={{ height: `${(day.appels / maxPerDay) * 100}%` }}
                            >
                              <span
                                className="mt-auto block w-full bg-danger"
                                style={{
                                  height: day.appels ? `${(day.echecs / day.appels) * 100}%` : 0,
                                }}
                              />
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatDayMonthShort(`${summary.par_jour[0]?.jour}T12:00:00Z`)}</span>
                      <span className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                          <span aria-hidden="true" className="size-2.5 rounded-sm bg-primary/70" />
                          {t.daily.legendCalls}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span aria-hidden="true" className="size-2.5 rounded-sm bg-danger" />
                          {t.daily.legendFailures}
                        </span>
                      </span>
                      <span>
                        {formatDayMonthShort(
                          `${summary.par_jour[summary.par_jour.length - 1]?.jour}T12:00:00Z`,
                        )}
                      </span>
                    </div>
                  </>
                )}
              </Card>
            )}
          </div>

          <Card className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-lg font-medium">{t.recent.title}</h2>
              <p className="text-xs text-muted-foreground">{t.recent.intro}</p>
            </div>
            {summary.echecs_recents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.recent.empty}</p>
            ) : (
              <ul className="flex flex-col">
                {summary.echecs_recents.map((run, index) => (
                  <li
                    key={`${run.cree_le}-${index}`}
                    className="flex flex-col gap-1 border-t border-border py-3 text-sm first:border-t-0 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <span className="shrink-0 text-muted-foreground sm:w-36">
                      {formatDayTime(run.cree_le)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">
                        {t.functionNames[run.fonction] ?? run.fonction}
                      </span>
                      <span className="block font-mono text-xs break-all text-muted-foreground">
                        {run.modele} · {duration(run.latence)}
                      </span>
                    </span>
                    <StatusBadge
                      tone={OUTCOME_TONES[run.resultat as keyof typeof OUTCOME_TONES] ?? "neutral"}
                    >
                      {t.outcomes[run.resultat] ?? run.resultat}
                    </StatusBadge>
                    {run.project_id && (
                      <Link
                        href={`/admin/demandes/${run.project_id}` as Route}
                        className="shrink-0 font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {t.recent.open}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
