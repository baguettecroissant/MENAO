import {
  coverageGrid,
  daysUntil,
  indicatorSense,
  indicatorTarget,
  launchIndicatorValues,
  mondayOf,
  targetStatus,
  teamProgress,
  type LaunchCoverage,
  type LaunchFigures,
  type LaunchIndicator,
  type LaunchTarget,
} from "@menao/core";
import type { Route } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Alert, Card, CardTitle, StatusBadge, Tag } from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  ChannelChart,
  CoverageTable,
  FigureTile,
  FigureTiles,
  FunnelChart,
  GoalRing,
  TargetStatePill,
  WeeklyCurve,
} from "./charts";
import { LaunchSettingsForm } from "./figures-forms";
import { MemberFigures } from "./member-figures";
import { MemberAvatar } from "./visuals";

const tl = fr.admin.launch;
const t = tl.figures;
const count = (value: number) => value.toLocaleString("fr-FR");
const percent = (value: number | null) => (value === null ? t.none : fr.review.percent(value));

/** Cible mise en forme : pour cent pour les indicateurs « _pct », nombre sinon (1,5 demande). */
const formatTarget = (indicateur: LaunchIndicator, value: number) =>
  indicateur.endsWith("_pct")
    ? fr.review.percent(value)
    : value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

/**
 * Tuile d'un indicateur : chiffre réalisé (mis en forme par l'appelant), sa cible (indicatorTarget
 * de @menao/core) et son état.
 */
function indicatorTile(
  indicateur: LaunchIndicator,
  value: number | null,
  targets: readonly LaunchTarget[],
  today: string,
) {
  const target = indicatorTarget(targets, indicateur, today);
  return {
    label: tl.indicators[indicateur],
    target: target === null ? null : formatTarget(indicateur, target),
    state: targetStatus(value, target, indicatorSense(indicateur)),
  };
}

/**
 * Chiffres du lancement en direct (F-66, lot 2, ADR 0209), dans l'ordre : artisans validés et
 * objectif d'équipe, courbe hebdomadaire, entonnoir, résultats de chaque membre, canaux d'arrivée,
 * couverture métier × zone, qualité, activité, puis les réglages repliés (ouverts au retour d'un
 * enregistrement, `saved`). Les chiffres viennent de la base, les calculs de @menao/core : l'écran
 * affiche. Couverture absente (réponse inattendue) : message d'erreur dans sa section.
 */
export function LaunchFiguresScreen({
  figures,
  coverage,
  saved = false,
}: {
  figures: LaunchFigures;
  coverage: LaunchCoverage | null;
  saved?: boolean;
}) {
  const { today, settings, targets, totals, quality: q, activity: a } = figures;
  const monday = mondayOf(today);
  const grid = coverage ? coverageGrid(coverage) : null;
  const values = launchIndicatorValues(figures, grid ? grid.under : null);
  // Chiffre héros, objectif d'équipe et écart de la semaine : validés au statut actuel.
  const team = teamProgress(figures);
  const { objectif: objective, gap, weekGoal } = team;
  const daysLeft = settings.fin_recrutement ? daysUntil(settings.fin_recrutement, today) : null;
  const coverageTile = indicatorTile("cases_sous_seuil", values.cases_sous_seuil, targets, today);
  const tile = (indicateur: LaunchIndicator) =>
    indicatorTile(indicateur, values[indicateur], targets, today);

  return (
    <>
      {/* 1. Artisans validés et objectif d'équipe. */}
      <Card className="flex flex-col gap-4">
        <section aria-labelledby="valides" className="flex flex-col gap-4">
          <h2 id="valides" className="text-lg font-medium">
            {t.hero.title}
          </h2>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {objective !== null && (
              <GoalRing
                value={team.percent ?? 0}
                label={`${t.hero.ring} : ${t.hero.ringValue(totals.valides, objective)}`}
              />
            )}
            <div className="flex min-w-0 flex-col gap-2">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-5xl font-medium tracking-tight tabular-nums">
                  {count(totals.valides)}
                </span>
                <span className="text-lg text-muted-foreground">
                  {t.hero.count(totals.valides)}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                {objective === null ? t.hero.noObjective : t.hero.objective(objective)}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {gap && (
                  <StatusBadge tone={gap.ecart >= 0 ? "success" : "danger"}>
                    {gap.ecart > 0
                      ? t.hero.ahead(gap.ecart)
                      : gap.ecart < 0
                        ? t.hero.behind(-gap.ecart)
                        : t.hero.onTarget}
                  </StatusBadge>
                )}
                <Tag tone="neutral">
                  {t.hero.thisWeek(team.thisWeek)}
                  {weekGoal !== null && ` · ${t.target(count(weekGoal))}`}
                </Tag>
                {daysLeft !== null && (
                  <Tag tone="neutral">
                    {daysLeft < 0 ? t.hero.ended : t.hero.daysLeft(daysLeft)}
                  </Tag>
                )}
              </div>
              {gap && (
                <p className="text-xs text-muted-foreground">
                  {t.hero.gap(totals.valides, gap.cible)}
                </p>
              )}
            </div>
          </div>
        </section>
      </Card>

      {/* 2. Courbe hebdomadaire. */}
      <Card className="flex flex-col gap-4">
        <CardTitle title={t.curve.title} description={t.curve.lead} />
        <WeeklyCurve weeks={figures.weeks} targets={targets} today={today} />
      </Card>

      {/* 3. Entonnoir. */}
      <Card className="flex flex-col gap-4">
        <CardTitle title={t.funnel.title} description={t.funnel.lead} />
        <FunnelChart totals={totals} />
      </Card>

      {/* 4. Par membre de l'équipe. */}
      <section aria-labelledby="membres" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="membres" className="text-lg font-medium">
            {t.members.title}
          </h2>
          <p className="text-sm text-muted-foreground">{t.members.lead}</p>
        </div>
        {figures.members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.members.empty}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {figures.members.map((member) => (
              <li
                key={member.member_id}
                className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <MemberAvatar nom={member.nom} />
                  <span className="flex min-w-0 flex-col">
                    <Link
                      href={`/admin/lancement/${member.member_id}` as Route}
                      aria-label={t.members.open(member.nom)}
                      className="truncate font-medium text-primary-strong underline-offset-2 outline-none hover:underline focus-visible:ring-4 focus-visible:ring-primary/20"
                    >
                      {member.nom}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {fr.commercialLaunch.kinds[member.kind]}
                    </span>
                  </span>
                </span>
                <MemberFigures member={member} targets={targets} currentWeek={monday} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 5. Canaux d'arrivée. */}
      <Card className="flex flex-col gap-4">
        <CardTitle title={t.channels.title} description={t.channels.lead} />
        <ChannelChart channels={figures.channels} />
      </Card>

      {/* 6. Couverture métier × zone. */}
      <Card className="flex min-w-0 flex-col gap-4">
        <section aria-labelledby="couverture" className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="couverture" className="text-[1.0625rem] font-medium">
              {t.coverage.title}
            </h2>
            {coverage && (
              <p className="text-sm text-muted-foreground">{t.coverage.lead(coverage.seuil)}</p>
            )}
          </div>
          {!coverage || !grid ? (
            <Alert tone="error">{t.error}</Alert>
          ) : (
            <>
              {grid.total > 0 && (
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{t.coverage.under(grid.under, grid.total)}</span>
                  {coverageTile.target !== null && (
                    <span className="text-xs text-muted-foreground">
                      {t.target(coverageTile.target)}
                    </span>
                  )}
                  <TargetStatePill state={coverageTile.state} />
                </p>
              )}
              <CoverageTable coverage={coverage} />
            </>
          )}
        </section>
      </Card>

      {/* 7. Qualité. */}
      <section aria-labelledby="qualite" className="flex flex-col gap-3">
        <h2 id="qualite" className="text-lg font-medium">
          {t.quality.title}
        </h2>
        <FigureTiles label={t.quality.title}>
          <FigureTile
            {...tile("dossiers_48h_pct")}
            value={percent(values.dossiers_48h_pct)}
            hint={t.quality.reviews48(q.dossiers_48h, q.dossiers_decides)}
          />
          <FigureTile
            label={t.quality.waiting}
            value={count(q.en_attente_48h)}
            hint={t.quality.waitingHint(q.en_attente)}
          />
          <FigureTile
            {...tile("fiches_completes_pct")}
            value={percent(values.fiches_completes_pct)}
            hint={t.quality.complete(q.fiches_completes, q.valides, settings.seuil_fiche_complete)}
          />
          <FigureTile
            {...tile("app_installee_pct")}
            value={percent(values.app_installee_pct)}
            hint={t.quality.ofValidated(q.app_installee, q.valides)}
          />
          <FigureTile
            {...tile("premier_devis_perso_pct")}
            value={percent(values.premier_devis_perso_pct)}
            hint={t.quality.ofValidated(q.premier_devis_perso, q.valides)}
          />
        </FigureTiles>
      </section>

      {/* 8. Activité. */}
      <section aria-labelledby="activite" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="activite" className="text-lg font-medium">
            {t.activity.title}
          </h2>
          <p className="text-sm text-muted-foreground">{t.activity.lead}</p>
        </div>
        <FigureTiles label={t.activity.title}>
          <FigureTile
            {...tile("demandes_semaine")}
            value={count(a.demandes_semaine)}
            hint={t.activity.lastWeek(a.demandes_semaine_precedente)}
          />
          <FigureTile
            label={t.activity.fourPlus}
            value={count(a.artisans_4_demandes)}
            hint={t.activity.ofActive(a.artisans_actifs)}
          />
          <FigureTile
            {...tile("demandes_par_artisan")}
            value={t.activity.median(a.demandes_par_artisan_mediane)}
            hint={t.activity.medianHint}
          />
          <FigureTile
            {...tile("reponse_72h_pct")}
            value={percent(values.reponse_72h_pct)}
            hint={t.activity.replies(a.demandes_repondues_72h, a.demandes_72h)}
          />
          <FigureTile
            {...tile("devis_envoye_pct")}
            value={percent(values.devis_envoye_pct)}
            hint={t.activity.quotes(a.artisans_devis_envoye, a.artisans_actifs)}
          />
          <FigureTile
            {...tile("abonnes_pct")}
            value={percent(values.abonnes_pct)}
            hint={t.activity.subscribers(a.abonnes_apres_essai, a.essais_termines, a.essais)}
          />
        </FigureTiles>
      </section>

      {/* 9. Réglages, repliés (ouverts au retour d'un enregistrement). */}
      <details
        id="reglages"
        open={saved}
        className="group scroll-mt-24 rounded-card border border-border bg-surface shadow-card"
      >
        <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 rounded-card px-5 py-4 outline-none focus-visible:ring-4 focus-visible:ring-primary/20 sm:px-6 [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col gap-0.5">
            <span className="text-[1.0625rem] font-medium">{t.settings.title}</span>
            <span className="text-sm text-muted-foreground">{t.settings.lead}</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="flex flex-col gap-4 border-t border-border px-5 py-5 sm:px-6">
          {saved && <Alert tone="success">{t.settings.saved}</Alert>}
          <LaunchSettingsForm settings={settings} />
        </div>
      </details>
    </>
  );
}
