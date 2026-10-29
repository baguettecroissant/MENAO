import {
  launchBoardTasks,
  launchCounts,
  launchProgress,
  launchTaskState,
  launchWeekStrip,
  launchWeeks,
  upcomingMilestones,
  type LaunchMemberKind,
  type LaunchTaskState,
} from "@menao/core";
import { Repeat, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/empty-state";
import { ListFilters, ListPanel } from "@/components/list-kit";
import { Card, Tag } from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  LAUNCH_VIEW_STATES,
  LAUNCH_VIEWS,
  type LaunchBoardTask,
  type LaunchView,
} from "@/lib/launch/board";
import { launchDate, launchRange } from "./format";
import { LaunchTaskToggle } from "./task-toggle";
import {
  MemberAvatar,
  MilestoneCountdowns,
  ProgressRing,
  WeekStrip,
  type WeekCase,
} from "./visuals";

const t = fr.commercialLaunch;
const b = t.board;
const TONES = {
  success: "text-success",
  danger: "text-danger",
  primary: "text-primary-strong",
  warning: "text-warning",
} as const;

/**
 * État affiché en bout de ligne : faite, en retard, en cours ou jalon (sinon rien). Une tâche
 * partagée qui n'est pas celle du membre n'est jamais « en retard » pour lui (il ne peut pas la
 * cocher) ; le back-office, lui, voit tous les retards.
 */
function rowStatus(
  task: LaunchBoardTask,
  state: LaunchTaskState,
  admin: boolean,
): { text: string; tone: keyof typeof TONES } | null {
  if (state === "fait") return { text: b.state.done, tone: "success" };
  if (state === "en_retard") {
    return task.own || admin ? { text: b.state.late, tone: "danger" } : null;
  }
  if (state !== "regulier" && task.statut === "en_cours") {
    return { text: b.state.inProgress, tone: "primary" };
  }
  if (task.jalon) return { text: b.state.milestone, tone: "warning" };
  return null;
}

/**
 * Une ligne du tableau : rond à cocher (ses propres tâches ; toutes dans les listes d'équipe du
 * back-office), titre (lien vers la modification dans le back-office), détail court, catégorie,
 * échéance ou rythme du rendez-vous, responsable (ou « Toute l'équipe » pour une tâche partagée qui
 * n'est pas la sienne), puis l'état.
 */
export function LaunchTaskRow({
  task,
  state,
  admin = false,
  toggleAll = false,
  owner,
}: {
  task: LaunchBoardTask;
  state: LaunchTaskState;
  /** Back-office : titre vers la modification. */
  admin?: boolean;
  /**
   * Listes de toute l'équipe du back-office : toutes les tâches se cochent. Sur le tableau d'un
   * membre, seulement les siennes (une tâche partagée cochée l'est pour toute l'équipe).
   */
  toggleAll?: boolean;
  /** Responsable, dans les listes de toute l'équipe du back-office. */
  owner?: string;
}) {
  const canToggle = state !== "regulier" && (task.own || (admin && toggleAll));
  const status = rowStatus(task, state, admin);
  const done = state === "fait";
  const titleClass = `line-clamp-2 text-[0.9375rem] font-medium break-words ${done ? "text-muted-foreground" : ""}`;
  return (
    <li className="flex items-start gap-3 px-4 py-3 sm:px-5">
      {canToggle ? (
        <LaunchTaskToggle taskId={task.id} title={task.titre} done={done} />
      ) : (
        // Tâche partagée (lecture) ou rendez-vous régulier : pas de case à cocher.
        <span
          aria-hidden="true"
          className="flex size-[1.625rem] shrink-0 items-center justify-center text-subtle-foreground"
        >
          {state === "regulier" ? <Repeat className="size-4" /> : <Users className="size-4" />}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
        {admin ? (
          <Link
            href={`/admin/lancement/taches/${task.id}` as Route}
            aria-label={b.edit(task.titre)}
            className={`${titleClass} rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-4 focus-visible:ring-primary/20`}
          >
            {task.titre}
          </Link>
        ) : (
          <span className={titleClass}>{task.titre}</span>
        )}
        {task.detail && <p className="line-clamp-2 text-xs text-muted-foreground">{task.detail}</p>}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <Tag tone="neutral">{t.categories[task.categorie]}</Tag>
          {task.recurrence ? (
            <span>{task.recurrence}</span>
          ) : (
            task.echeance && <span>{launchDate(task.echeance)}</span>
          )}
          {owner ? <span>{owner}</span> : !task.own && <span>{b.team}</span>}
        </p>
      </div>
      {status && (
        <span className={`shrink-0 pt-1 text-xs font-medium ${TONES[status.tone]}`}>
          {status.text}
        </span>
      )}
    </li>
  );
}

type Section = { id: string; title: string; late?: boolean; tasks: LaunchBoardTask[] };

/**
 * Tableau de lancement d'un membre (F-66, ADR 0208), dans le back-office et dans l'espace
 * commercial : en-tête (initiales, nom, mission, anneau d'avancement de ses tâches), comptes à
 * rebours des prochains jalons, bande des semaines, filtres, puis les tâches semaine par semaine
 * (« En retard » d'abord) et les rendez-vous réguliers. États, semaines et compteurs : @menao/core.
 * Filtres, compteurs et bande ne comptent que ses tâches et les tâches partagées à venir
 * (launchBoardTasks) : jamais un retard ni un « fait » de l'équipe qu'il ne peut pas cocher ; la
 * vue « Tout » montre aussi les tâches partagées passées.
 */
export function LaunchBoard({
  member,
  tasks,
  today,
  view,
  path,
  admin = false,
  headingLevel = 2,
  actions,
}: {
  member: { nom: string; mission: string | null; kind: LaunchMemberKind };
  /** Ses tâches (own) et celles partagées avec toute l'équipe. */
  tasks: readonly LaunchBoardTask[];
  /** Jour AAAA-MM-JJ à Paris (parisToday). */
  today: string;
  view: LaunchView;
  /** Adresse de la page, pour les filtres et la bande des semaines. */
  path: string;
  /** Back-office : titres vers la modification (seules ses tâches se cochent, comme pour lui). */
  admin?: boolean;
  /** 1 : le nom du membre est le titre de la page (back-office). */
  headingLevel?: 1 | 2;
  /** Boutons à côté de l'en-tête (« Ajouter une tâche »). */
  actions?: ReactNode;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const Sub = headingLevel === 1 ? "h2" : "h3";
  const states = new Map(tasks.map((task) => [task.id, launchTaskState(task, today)]));
  const stateOf = (task: LaunchBoardTask): LaunchTaskState => states.get(task.id) ?? "a_venir";
  const counted = launchBoardTasks(tasks, today);
  const counts = launchCounts(counted, today);
  const progress = launchProgress(tasks.filter((task) => task.own));
  const milestones = upcomingMilestones(tasks, today, 3);
  const regular = counted.filter((task) => stateOf(task) === "regulier");
  const shown = LAUNCH_VIEW_STATES[view];
  const visible = (view === "tout" ? tasks : counted).filter((task) =>
    shown.includes(stateOf(task)),
  );

  // « En retard » d'abord (filtres À faire et En retard), puis semaine par semaine.
  const sections: Section[] = [];
  if (view === "a_faire" || view === "retard") {
    const late = launchWeeks(
      visible.filter((task) => stateOf(task) === "en_retard"),
      today,
    ).flatMap((week) => week.tasks);
    if (late.length > 0) sections.push({ id: "en-retard", title: b.late, late: true, tasks: late });
  }
  if (view !== "retard") {
    const rest =
      view === "a_faire" ? visible.filter((task) => stateOf(task) !== "en_retard") : visible;
    for (const week of launchWeeks(rest, today)) {
      const range = launchRange(week.start, week.end);
      sections.push({
        id: `semaine-${week.start}`,
        title: week.state === "courante" ? b.thisWeek(range) : b.week(range),
        tasks: week.tasks,
      });
    }
  }
  const showRegular = (view === "a_faire" || view === "tout") && regular.length > 0;

  // Chaque case de la bande mène à sa semaine : dans la page si elle y est, sinon au filtre Tout.
  const anchors = new Set(sections.map((section) => section.id));
  const weeks: WeekCase[] = launchWeekStrip(counted, today).map((week) => ({
    ...week,
    href:
      week.total === 0
        ? null
        : anchors.has(`semaine-${week.start}`)
          ? `#semaine-${week.start}`
          : week.late > 0 && anchors.has("en-retard")
            ? "#en-retard"
            : `${path}?vue=tout#semaine-${week.start}`,
  }));

  const detail: Partial<Record<LaunchView, number>> = {
    retard: counts.en_retard,
    semaine: counts.cette_semaine,
    faites: counts.fait,
  };

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <MemberAvatar nom={member.nom} size="lg" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <Heading
              className={`font-medium tracking-tight break-words ${
                headingLevel === 1 ? "text-2xl" : "text-lg"
              }`}
            >
              {member.nom}
            </Heading>
            <p className="text-xs text-muted-foreground">{t.kinds[member.kind]}</p>
            {member.mission && (
              <p className="text-sm break-words text-muted-foreground">{member.mission}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ProgressRing
            percent={progress.percent}
            label={b.progressLabel}
            valueText={b.progress(progress.done, progress.total)}
          />
          <p aria-hidden="true" className="max-w-36 text-sm text-muted-foreground">
            {b.progress(progress.done, progress.total)}
          </p>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </Card>

      <MilestoneCountdowns milestones={milestones} label={b.milestones} headingLevel={Sub} />

      <WeekStrip weeks={weeks} />

      <ListFilters
        label={b.filters}
        items={LAUNCH_VIEWS.map((v) => ({
          href: v === "a_faire" ? path : `${path}?vue=${v}`,
          label: b.filter[v],
          detail: detail[v] === undefined ? undefined : String(detail[v]),
          tone: v === "retard" && counts.en_retard > 0 ? ("danger" as const) : undefined,
          active: v === view,
        }))}
      />

      {sections.length === 0 && !showRegular && (
        <EmptyState illustration="agenda" className="py-8">
          {b.empty[view]}
        </EmptyState>
      )}

      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-titre`}
          className="flex scroll-mt-24 flex-col gap-2"
        >
          <Sub
            id={`${section.id}-titre`}
            className={`text-base font-medium ${section.late ? "text-danger" : ""}`}
          >
            {section.title}
          </Sub>
          <ListPanel>
            {section.tasks.map((task) => (
              <LaunchTaskRow key={task.id} task={task} state={stateOf(task)} admin={admin} />
            ))}
          </ListPanel>
        </section>
      ))}

      {showRegular && (
        <section aria-labelledby="reguliers-titre" className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <Sub id="reguliers-titre" className="text-base font-medium">
              {b.regular}
            </Sub>
            <p className="text-xs text-muted-foreground">{b.regularHint}</p>
          </div>
          <ListPanel>
            {regular.map((task) => (
              <LaunchTaskRow key={task.id} task={task} state="regulier" admin={admin} />
            ))}
          </ListPanel>
        </section>
      )}
    </div>
  );
}
