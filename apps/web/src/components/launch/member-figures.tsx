import {
  indicatorTarget,
  memberProgress,
  type LaunchMemberFigures,
  type LaunchTarget,
} from "@menao/core";
import { fr } from "@/i18n/fr";
import { TargetStatePill, WeekMiniBars } from "./charts";
import { ProgressBar } from "./visuals";

const t = fr.admin.launch.figures;
const m = t.members;
const count = (value: number) => value.toLocaleString("fr-FR");

/**
 * Résultats d'un membre de l'équipe (F-66, lot 2, ADR 0209), dans sa carte des chiffres et sur son
 * tableau : objectif contre réalisé (artisans validés grâce à ses codes), état face à l'objectif,
 * cette semaine (avec sa cible de la semaine, ou sa cible permanente, s'il en a une), mini-barres
 * des 8 dernières semaines ; pour la personne qui valide les dossiers, dossiers traités et part des
 * décisions mesurables prise sous 48 h. Chiffres, cibles et état venus de @menao/core
 * (memberProgress, indicatorTarget).
 */
export function MemberFigures({
  member,
  targets,
  currentWeek,
}: {
  member: LaunchMemberFigures;
  targets: readonly LaunchTarget[];
  /** Lundi de la semaine du jour. */
  currentWeek: string;
}) {
  const progress = memberProgress(member, targets);
  const weekGoal = indicatorTarget(targets, "valides_semaine", currentWeek, member.member_id);
  const reviews = member.kind === "validation" || member.dossiers_traites > 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{progress.objectif === null ? m.noObjective : m.objective(progress.objectif)}</span>
        <TargetStatePill state={progress.status} />
      </div>
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl font-medium tracking-tight tabular-nums">
          {m.validated(member.valides)}
        </span>
        <span className="text-sm text-muted-foreground">{m.signups(member.inscrits)}</span>
      </p>
      {progress.objectif !== null && progress.percent !== null && (
        <ProgressBar
          percent={Math.min(100, progress.percent)}
          label={m.progress(member.nom, member.valides, progress.objectif)}
        />
      )}
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className={member.valides_semaine > 0 ? "font-medium text-success" : ""}>
          {m.thisWeek(member.valides_semaine)}
        </span>
        {weekGoal !== null && <span>· {t.target(count(weekGoal))}</span>}
      </p>
      <WeekMiniBars
        weeks={member.weeks}
        currentWeek={currentWeek}
        caption={`${m.weeks} : ${member.nom}`}
      />
      {reviews && (
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          {m.reviews(member.dossiers_traites)}
          {progress.rate48h !== null && ` · ${m.reviews48(fr.review.percent(progress.rate48h))}`}
        </p>
      )}
    </div>
  );
}
