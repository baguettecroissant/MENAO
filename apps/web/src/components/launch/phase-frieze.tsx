import { daysUntil, type LaunchPhase } from "@menao/core";
import { fr } from "@/i18n/fr";
import { launchDayMonth } from "./format";
import { ProgressBar } from "./visuals";

const t = fr.admin.launch;
const phaseLabel = fr.commercialLaunch.phases;

type Phase = {
  phase: LaunchPhase;
  start: string | null;
  end: string | null;
  done: number;
  total: number;
  percent: number;
  current: boolean;
};

/**
 * Frise des 5 étapes du lancement (launchPhaseSummary de @menao/core) : une case par étape avec
 * ses dates et son avancement, et le repère « Aujourd'hui » sur la ligne du temps, dans l'étape en
 * cours (une seule, choisie par @menao/core). Ligne du temps à partir de la tablette seulement :
 * sur téléphone, les cases sont empilées et la pastille de l'étape en cours suffit.
 */
export function PhaseFrieze({ phases, today }: { phases: readonly Phase[]; today: string }) {
  const index = phases.findIndex((p) => p.current);
  const current = phases[index];
  // Position du jour dans l'étape en cours (de son début à sa fin), sur la ligne des 5 étapes.
  let marker: number | null = null;
  if (current?.start && current.end) {
    const length = daysUntil(current.end, current.start);
    const elapsed = daysUntil(today, current.start);
    const within = length > 0 ? elapsed / length : 0.5;
    marker = ((index + within) / phases.length) * 100;
  }
  return (
    <div className="flex flex-col gap-3">
      {marker !== null && (
        <div
          aria-hidden="true"
          className="relative mx-1 mt-7 hidden h-1.5 rounded-pill bg-primary-soft sm:block"
        >
          <div
            className="absolute top-0 left-0 h-full rounded-pill bg-primary"
            style={{ width: `${marker}%` }}
          />
          <span
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-primary"
            style={{ left: `${marker}%` }}
          />
          {/* Étiquette gardée dans la largeur de la page près des bords (téléphone). */}
          <span
            className={`absolute bottom-full mb-2 rounded-chip bg-primary px-1.5 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap text-primary-foreground ${
              marker < 15 ? "" : marker > 85 ? "-translate-x-full" : "-translate-x-1/2"
            }`}
            style={{ left: `${marker}%` }}
          >
            {t.today}
          </span>
        </div>
      )}
      <ol className="grid gap-2 sm:grid-cols-5">
        {phases.map((p) => {
          const label = phaseLabel[p.phase];
          return (
            <li
              key={p.phase}
              aria-current={p.current ? "step" : undefined}
              className={`flex flex-col gap-2 rounded-input border p-3 ${
                p.current ? "border-primary bg-primary-softer" : "border-border bg-surface"
              }`}
            >
              <span className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-sm font-medium">{label}</span>
                {p.current && (
                  <span className="rounded-chip bg-primary px-1.5 py-0.5 text-[0.6875rem] font-medium text-primary-foreground">
                    {t.today}
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {p.start && p.end
                  ? t.phaseDates(launchDayMonth(p.start), launchDayMonth(p.end))
                  : t.phaseNoDates}
              </span>
              <ProgressBar percent={p.percent} label={t.phaseProgress(label, p.done, p.total)} />
              <span className="text-xs text-muted-foreground tabular-nums">
                {t.phasePercent(p.percent)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
