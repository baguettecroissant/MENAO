import type { LeadAlert, LeadProgress, LeadStatus } from "@menao/core";
import type { Route } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { LeadArtisan } from "@/lib/admin/lead-targets";
import { formatDay } from "@/lib/format";

const t = fr.admin.leads;

const TONES: Record<LeadStatus, "success" | "primary" | "warning" | "danger" | "neutral"> = {
  atteint: "success",
  dans_les_temps: "primary",
  en_retard: "warning",
  manque: "danger",
  hors_suivi: "neutral",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <StatusBadge tone={TONES[status]}>{t.statuses[status]}</StatusBadge>;
}

export function LeadAlertBadges({ alerts }: { alerts: readonly LeadAlert[] }) {
  if (!alerts.includes("deux_mois")) return null;
  return <StatusBadge tone="danger">{t.alerts.deux_mois}</StatusBadge>;
}

const FILL: Record<LeadStatus, string> = {
  atteint: "bg-success",
  dans_les_temps: "bg-primary",
  en_retard: "bg-warning",
  manque: "bg-danger",
  hors_suivi: "bg-border-strong",
};

/**
 * Avancement du mois : barre remplie jusqu'aux demandes reçues, repère du rythme attendu à date
 * (mois en cours), « 3 sur 4 » et ce qui manque.
 */
export function LeadBar({ progress, direct = 0 }: { progress: LeadProgress; direct?: number }) {
  const { target, received, expected, missing, status, closed } = progress;
  if (target === null) {
    return (
      <p className="text-sm text-muted-foreground tabular-nums">
        {received.toLocaleString("fr-FR")}
        {direct > 0 && <span className="ml-1.5">{t.direct(direct)}</span>}
      </p>
    );
  }
  const scale = Math.max(target, received, 1);
  const pct = (n: number) => `${Math.min(100, (100 * n) / scale)}%`;
  return (
    <div className="flex min-w-[11rem] flex-col gap-1.5">
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-semibold tabular-nums">{t.progress(received, target)}</span>
        {missing > 0 && <span className="text-xs text-muted-foreground">{t.missing(missing)}</span>}
        {direct > 0 && <span className="text-xs text-muted-foreground">{t.direct(direct)}</span>}
      </p>
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-background"
        aria-hidden="true"
      >
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${FILL[status]}`}
          style={{ width: pct(received) }}
        />
        {!closed && expected !== null && expected > 0 && expected < target && (
          <span
            className="absolute inset-y-[-2px] w-0.5 bg-foreground/50"
            style={{ left: pct(expected) }}
          />
        )}
      </div>
      {!closed && expected !== null && status !== "atteint" && (
        <p className="text-xs text-muted-foreground">{t.expected(expected)}</p>
      )}
    </div>
  );
}

/** Six petites barres, une par mois : reçues face à l'objectif (couleur de la situation). */
export function LeadHistory({ history }: { history: readonly LeadProgress[] }) {
  const max = Math.max(1, ...history.map((m) => Math.max(m.received, m.target ?? 0)));
  return (
    <ul className="flex h-12 items-end gap-0.5" aria-label={t.columns.history}>
      {history.map((m) => {
        const label = t.historyBar(t.monthShort(m.month), m.received, m.target);
        return (
          <li key={m.month} className="flex w-7 flex-col items-center gap-1" title={label}>
            <span className="sr-only">{label}</span>
            <span aria-hidden="true" className="relative flex h-8 w-3.5 items-end">
              {m.target !== null && (
                <span
                  className="absolute inset-x-0 border-t border-dashed border-foreground/40"
                  style={{ bottom: `${(100 * m.target) / max}%` }}
                />
              )}
              <span
                className={`w-full rounded-t-sm ${FILL[m.status]} ${m.received === 0 ? "h-px" : ""}`}
                style={m.received ? { height: `${(100 * m.received) / max}%` } : undefined}
              />
            </span>
            <span aria-hidden="true" className="text-[0.625rem] leading-none text-muted-foreground">
              {t.monthShort(m.month)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function causeText(a: LeadArtisan): string | null {
  if (!a.cause) return null;
  return a.cause === "peu_choisi" ? t.causes.peu_choisi(a.searches) : t.causes[a.cause];
}

/** Tableau des artisans : avancement du mois, situation, cause probable, 6 derniers mois. */
export function LeadTable({ rows }: { rows: readonly LeadArtisan[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="admin-table w-full min-w-[56rem] text-left text-sm">
        <thead className="text-muted-foreground">
          <tr>
            <th scope="col" className="py-2 pr-4 font-normal">
              {t.columns.artisan}
            </th>
            <th scope="col" className="py-2 pr-4 font-normal">
              {t.columns.progress}
            </th>
            <th scope="col" className="py-2 pr-4 font-normal">
              {t.columns.status}
            </th>
            <th scope="col" className="py-2 pr-4 font-normal">
              {t.columns.cause}
            </th>
            <th scope="col" className="py-2 font-normal">
              {t.columns.history}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-t border-border align-top">
              <td className="py-3 pr-4">
                <Link
                  href={`/admin/artisans/${a.id}?onglet=activite#objectif` as Route}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {a.name}
                </Link>
                <span className="block text-xs text-muted-foreground">
                  {[a.trades.join(", "), a.city].filter(Boolean).join(" · ")}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t.validatedOn(formatDay(a.validatedOn))}
                  {a.ownTarget && ` · ${t.ownTarget}`}
                </span>
              </td>
              <td className="py-3 pr-4">
                <LeadBar progress={a.progress} direct={a.direct} />
              </td>
              <td className="py-3 pr-4">
                <div className="flex flex-col items-start gap-1.5">
                  <LeadStatusBadge status={a.progress.status} />
                  <LeadAlertBadges alerts={a.alerts} />
                </div>
              </td>
              <td className="max-w-[18rem] py-3 pr-4 text-xs leading-relaxed text-label">
                {causeText(a) ?? (
                  <span className="text-muted-foreground">{t.searches(a.searches)}</span>
                )}
              </td>
              <td className="py-3">
                <LeadHistory history={a.history} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
