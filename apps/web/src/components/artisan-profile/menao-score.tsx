import { MENAO_SCORE_PARTS, MENAO_SCORE_POINTS } from "@menao/core";
import type { MenaoScoreParts } from "@menao/validation";
import { fr } from "@/i18n/fr";

const t = fr.search.profile;
const pointsFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
/** Points d'un critère : « 8 », « 7,5 », « 37,9 ». */
export const formatScorePoints = (points: number) => pointsFormat.format(points);

/**
 * Score MENAO sur 100 (ADR 0155) : total et points de chaque critère, sur la fiche publique et
 * dans l'espace de l'artisan.
 */
export function MenaoScore({ score }: { score: MenaoScoreParts }) {
  return (
    <div className="flex flex-col gap-4">
      <p>
        <span className="text-4xl font-semibold tabular-nums text-primary-strong">
          {Math.round(score.score)}
        </span>{" "}
        <span className="text-sm text-muted-foreground">{t.scoreOutOf}</span>
      </p>
      <dl className="flex flex-col gap-3">
        {MENAO_SCORE_PARTS.map((part) => {
          const max = MENAO_SCORE_POINTS[part];
          return (
            <div key={part} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <dt className="text-muted-foreground">{t.scoreParts[part]}</dt>
                <dd className="font-medium whitespace-nowrap tabular-nums text-primary-strong">
                  {t.scorePoints(formatScorePoints(score[part]), max)}
                </dd>
              </div>
              <div aria-hidden="true" className="h-1.5 rounded-full bg-primary-soft">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, (score[part] / max) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
