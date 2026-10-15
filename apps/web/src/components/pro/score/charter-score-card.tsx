import { CHARTER_SCORE_WEIGHTS, type CharterScoreKey } from "@menao/core";
import type { Route } from "next";
import { Card, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { MyCharterScore } from "@/lib/artisan/score";
import { PlanningConfirm } from "./planning-confirm";

const t = fr.pro.score;
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

// Colonnes renvoyées par my_charter_score() pour chaque critère de la charte.
const COLUMN: Record<CharterScoreKey, keyof MyCharterScore> = {
  notes: "notes",
  delai72h: "delai72h",
  reactivite: "reactivite",
  planning: "planning",
  chantiersTermines: "chantiers_termines",
  anciennete: "anciennete",
};

/** Score MENAO de la charte qualité (ADR 0105) : total, critères pondérés, planning à confirmer. */
export function CharterScoreCard({ score }: { score: MyCharterScore }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">{t.title}</h2>
          <p className="text-sm text-muted-foreground">{t.intro}</p>
        </div>
        <p className="shrink-0 text-right">
          <span className="text-3xl font-semibold tabular-nums text-primary-strong">
            {score.score}
          </span>{" "}
          <span className="text-sm text-muted-foreground">{t.outOf}</span>
        </p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {CHARTER_SCORE_WEIGHTS.map((w) => {
          const value = Number(score[COLUMN[w.key]] ?? 0);
          return (
            <li key={w.key} className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-2">
                <span>
                  {w.label}{" "}
                  <span className="whitespace-nowrap text-muted-foreground">
                    ({t.weight(w.weight)})
                  </span>
                </span>
                <span className="shrink-0 font-medium whitespace-nowrap tabular-nums">
                  {t.value(value)}
                </span>
              </div>
              <span
                aria-hidden="true"
                className="h-1.5 overflow-hidden rounded-full bg-primary-soft"
              >
                <span className="block h-full bg-primary" style={{ width: `${value}%` }} />
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <p className="text-sm text-muted-foreground">
          {score.planning_updated_at
            ? t.planningUpdated(day.format(new Date(score.planning_updated_at)))
            : t.planningNever}{" "}
          {t.planningHint}
        </p>
        <PlanningConfirm />
      </div>
      <TextLink href={"/criteres-de-classement" as Route} className="self-start text-sm">
        {t.learnMore}
      </TextLink>
    </Card>
  );
}
