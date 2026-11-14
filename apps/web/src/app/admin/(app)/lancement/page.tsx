import {
  launchCounts,
  launchPhaseSummary,
  launchProgress,
  launchTaskState,
  launchWeeks,
  parisToday,
  upcomingMilestones,
} from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { ListPanel } from "@/components/list-kit";
import { sheetCard } from "@/components/pro/sheet";
import {
  LaunchCopyForm,
  LaunchMemberForm,
  LaunchPlanImport,
} from "@/components/launch/admin-forms";
import { LaunchTaskRow } from "@/components/launch/launch-board";
import { LaunchHeader } from "@/components/launch/launch-tabs";
import { PhaseFrieze } from "@/components/launch/phase-frieze";
import { MemberAvatar, MilestoneCountdowns, ProgressBar } from "@/components/launch/visuals";
import { Alert, ButtonLink, Card, CardTitle, StatusBadge, Tag, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { listLaunchAccounts, listLaunchMembers, listLaunchTeamTasks } from "@/lib/admin/launch";

const t = fr.admin.launch;
const labels = fr.commercialLaunch;
/** Tâches en retard montrées avant « Voir les n tâches en retard ». */
const LATE_PREVIEW = 10;

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

/**
 * Lancement (F-66, ADR 0208), onglet « Planning » (les chiffres et les codes de suivi sont dans
 * les onglets voisins, lot 2, ADR 0209) : prochaines dates clés de l'équipe (jalons de toute
 * l'équipe et de chaque membre), frise des 5 étapes, cartes des
 * membres (avancement, retards, objectif interne), jalons et tâches de toute l'équipe, retards de
 * l'équipe, puis les outils (import du plan, ajout d'un membre, copie d'un planning). Réservé aux
 * admins ; les chiffres viennent de @menao/core.
 */
export default async function AdminLaunchPage({ searchParams }: PageProps<"/admin/lancement">) {
  const query = await searchParams;
  const done = typeof query.fait === "string" ? query.fait : null;
  const allLate = query.retards === "tous";
  const doneMessage =
    done === "membre-supprime"
      ? t.done.membreSupprime
      : done === "tache"
        ? t.done.tache
        : done === "tache-supprimee"
          ? t.done.tacheSupprimee
          : null;

  const { supabase, userId } = await requireAdmin();
  const [members, tasks, accounts] = await Promise.all([
    listLaunchMembers(supabase),
    listLaunchTeamTasks(supabase),
    listLaunchAccounts(supabase),
  ]);
  const today = parisToday();
  const me = members.find((m) => m.active && m.user_id === userId);
  const nameOf = new Map(members.map((m) => [m.id, m.nom]));
  const owner = (memberId: string | null) =>
    t.owner(memberId ? (nameOf.get(memberId) ?? null) : null);

  const teamTasks = tasks.filter((task) => task.member_id === null);
  const teamDated = launchWeeks(teamTasks, today).flatMap((week) => week.tasks);
  const teamRegular = teamTasks.filter((task) => launchTaskState(task, today) === "regulier");
  const late = launchWeeks(
    tasks.filter((task) => launchTaskState(task, today) === "en_retard"),
    today,
  ).flatMap((week) => week.tasks);
  const lateShown = allLate ? late : late.slice(0, LATE_PREVIEW);
  const memberOptions = members.map((m) => ({ id: m.id, nom: m.nom }));
  const teamProgress = launchProgress(tasks);
  const teamCounts = launchCounts(tasks, today);
  // Mon planning : mes tâches en retard ou de la semaine.
  const myWeek = me
    ? launchWeeks(
        tasks.filter((task) => {
          const state = launchTaskState(task, today);
          return task.member_id === me.id && (state === "cette_semaine" || state === "en_retard");
        }),
        today,
      ).flatMap((week) => week.tasks)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <LaunchHeader
        current="planning"
        intro={t.intro}
        aside={
          me && (
            <ButtonLink
              href={`/admin/lancement/${me.id}` as Route}
              variant="outline"
              size="sm"
              className="shrink-0 self-start"
            >
              <CalendarCheck aria-hidden="true" className="size-4" />
              {t.myPlanning}
            </ButtonLink>
          )
        }
      />

      {doneMessage && <Alert tone="success">{doneMessage}</Alert>}

      {/* Refonte « Nette » (lot 51, maquette AdminLancementNette) : chiffres en tête, mon
          planning et les tâches à gauche, l'équipe et les dates clés à droite. */}
      <ul aria-label={t.summaryLabel} className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: t.summary.progress,
            value: `${teamProgress.percent} %`,
            hint: labels.board.progress(teamProgress.done, teamProgress.total),
          },
          {
            label: t.summary.week,
            value: String(teamCounts.cette_semaine),
            hint: t.summary.weekHint,
          },
          { label: t.summary.late, value: String(late.length), hint: t.summary.lateHint },
        ].map((f) => (
          <li
            key={f.label}
            className="flex flex-col gap-1 rounded-card border border-border bg-surface p-5 shadow-card"
          >
            <span className="text-sm font-semibold text-muted-foreground">{f.label}</span>
            <span className="font-display text-[2rem] leading-none font-bold tracking-tight tabular-nums">
              {f.value}
            </span>
            <span className="text-[0.8125rem] text-muted-foreground">{f.hint}</span>
          </li>
        ))}
      </ul>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {me && (
            <section aria-labelledby="mon-planning" className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="mon-planning" className="text-lg font-medium">
                  {t.myWeek}
                </h2>
                <TextLink href={`/admin/lancement/${me.id}` as Route} className="text-sm">
                  {t.myAll}
                </TextLink>
              </div>
              {myWeek.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.myWeekEmpty}</p>
              ) : (
                <ListPanel label={t.myWeek}>
                  {myWeek.map((task) => (
                    <LaunchTaskRow
                      key={task.id}
                      task={task}
                      state={launchTaskState(task, today)}
                      admin
                      toggleAll
                    />
                  ))}
                </ListPanel>
              )}
            </section>
          )}

          <section aria-labelledby="equipe-taches" className="flex flex-col gap-3">
            <h2 id="equipe-taches" className="text-lg font-medium">
              {t.teamTasks}
            </h2>
            {teamDated.length + teamRegular.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.teamTasksEmpty}</p>
            ) : (
              <ListPanel label={t.teamTasks}>
                {[...teamDated, ...teamRegular].map((task) => (
                  <LaunchTaskRow
                    key={task.id}
                    task={task}
                    state={launchTaskState(task, today)}
                    admin
                    toggleAll
                  />
                ))}
              </ListPanel>
            )}
          </section>

          <section
            id="en-retard"
            aria-labelledby="equipe-retard"
            className="flex scroll-mt-24 flex-col gap-3"
          >
            <h2 id="equipe-retard" className="text-lg font-medium">
              {t.teamLate}
            </h2>
            {late.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.teamLateEmpty}</p>
            ) : (
              <>
                <ListPanel label={t.teamLate}>
                  {lateShown.map((task) => (
                    <LaunchTaskRow
                      key={task.id}
                      task={task}
                      state="en_retard"
                      admin
                      toggleAll
                      owner={owner(task.member_id)}
                    />
                  ))}
                </ListPanel>
                {late.length > LATE_PREVIEW && (
                  <TextLink
                    href={
                      (allLate
                        ? "/admin/lancement#en-retard"
                        : "/admin/lancement?retards=tous#en-retard") as Route
                    }
                    className="self-start text-sm"
                  >
                    {allLate ? t.teamLateLess : t.teamLateAll(late.length)}
                  </TextLink>
                )}
              </>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section aria-labelledby="equipe" className={`${sheetCard} gap-1`}>
            <h2 id="equipe" className="pb-2 text-[1.0625rem] font-bold tracking-tight">
              {t.team}
            </h2>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.teamEmpty}</p>
            ) : (
              <ul className="flex flex-col">
                {members.map((m) => {
                  const own = tasks.filter((task) => task.member_id === m.id);
                  const progress = launchProgress(own);
                  const counts = launchCounts(own, today);
                  return (
                    <li
                      key={m.id}
                      className="relative flex flex-col gap-2 border-t border-border py-3 focus-within:ring-4 focus-within:ring-primary/20"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <MemberAvatar nom={m.nom} />
                        <span className="flex min-w-0 flex-1 flex-col">
                          {/* Toute la ligne est cliquable (lien étiré). */}
                          <Link
                            href={`/admin/lancement/${m.id}` as Route}
                            aria-label={t.openBoard(m.nom)}
                            className="truncate text-sm font-semibold outline-none after:absolute after:inset-0"
                          >
                            {m.nom}
                          </Link>
                          <span className="truncate text-xs text-muted-foreground">
                            {m.mission ?? labels.kinds[m.kind]}
                          </span>
                        </span>
                        <span className="shrink-0 text-[0.8125rem] font-bold tabular-nums">
                          {progress.percent} %
                        </span>
                      </span>
                      <ProgressBar
                        percent={progress.percent}
                        label={labels.board.progress(progress.done, progress.total)}
                      />
                      <span className="flex flex-wrap gap-1.5">
                        {!m.user_id && <StatusBadge tone="neutral">{t.notLinked}</StatusBadge>}
                        {!m.active && <StatusBadge tone="neutral">{t.inactive}</StatusBadge>}
                        {m.objectif_valides !== null && (
                          <Tag tone="neutral">{t.objective(m.objectif_valides)}</Tag>
                        )}
                        {counts.en_retard > 0 && (
                          <StatusBadge tone="danger">{t.late(counts.en_retard)}</StatusBadge>
                        )}
                        {counts.cette_semaine > 0 && (
                          <StatusBadge tone="primary">
                            {t.thisWeek(counts.cette_semaine)}
                          </StatusBadge>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <div className={sheetCard}>
            <MilestoneCountdowns
              milestones={upcomingMilestones(tasks, today, 3)}
              label={t.milestones}
              headingLevel="h2"
              empty={t.milestonesEmpty}
              stacked
            />
          </div>
        </div>
      </div>

      <Card className="flex flex-col gap-4">
        <CardTitle title={t.phases} />
        <PhaseFrieze phases={launchPhaseSummary(tasks, today)} today={today} />
      </Card>

      <section aria-labelledby="outils" className="flex flex-col gap-3">
        <h2 id="outils" className="text-lg font-medium">
          {t.tools}
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="flex flex-col gap-4">
            <CardTitle title={t.import.title} description={t.import.lead} as="h3" />
            <LaunchPlanImport />
          </Card>
          <Card className="flex flex-col gap-4">
            <CardTitle title={t.newMember.title} description={t.newMember.lead} as="h3" />
            <LaunchMemberForm accounts={accounts} />
          </Card>
          {members.length > 1 && (
            <Card className="flex flex-col gap-4">
              <CardTitle title={t.copy.title} description={t.copy.lead} as="h3" />
              <LaunchCopyForm members={memberOptions} />
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
