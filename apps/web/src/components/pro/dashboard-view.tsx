import type { DashboardActivity, RevenueTrend, TodoItem } from "@menao/core";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  ChevronRight,
  Clock,
  MapPin,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { BadgeIcon } from "@/components/pro/grade/badge-icon";
import {
  DashboardShortcuts,
  InProgressCard,
  QuotesCard,
  ReceivablesCard,
  RevenueCard,
  type ChantierHref,
  type DashboardShortcutLinks,
} from "@/components/pro/dashboard-activity";
import { TodoList } from "@/components/pro/todo-list";
import { Alert, StatusBadge, Tag, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDayLong, formatDuration, formatTime } from "@/lib/format";

const t = fr.pro.dashboard;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const cardLink =
  "rounded-card border border-border bg-surface shadow-card transition-shadow hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none";

export type DashboardAppointment = {
  kind: "visite" | "demarrage";
  chantierId: string;
  startsAt: string;
  title: string;
  place: string;
};
export type DashboardRequest = {
  requestId: string;
  title: string;
  place: string;
  start: string;
  urgent: boolean;
  thumbUrl: string | null;
};

/** Tableau de bord artisan (F-16), maquettes « Dashboard » et « Dashboard avec RDV ». */
export function DashboardView({
  firstName,
  notices = [],
  visible,
  awaitingClients,
  revenue,
  responseTime,
  appointments,
  requests = [],
  todo,
  grade = null,
  missingPhoto = false,
  base = "/pro",
  agendaHref = "/pro/agenda",
  banner = null,
  activity = null,
}: {
  firstName: string | null;
  /** Alertes du dossier (documents à renouveler, suspension), comme dans « Mon dossier ». */
  notices?: string[];
  visible: boolean;
  awaitingClients: number;
  /** Encaissé du 1er à aujourd'hui et évolution par rapport à la même période du mois précédent. */
  revenue: { cents: number; trend: RevenueTrend; previousMonth: string };
  /** Temps de réponse moyen aux demandes (6 derniers mois). */
  responseTime: { minutes: number | null; responses: number };
  appointments: DashboardAppointment[];
  requests?: DashboardRequest[];
  /**
   * « À faire maintenant » (ADR 0131) : remplace les dernières demandes et les alertes de
   * documents ; `appointments` ne contient alors que les jours suivants. Absent dans les aperçus.
   */
  todo?: TodoItem[];
  /** « Mon grade MENAO » (F-24) : niveau, points, avancement, dernier badge, badge à fêter. */
  grade?: {
    level: number;
    xp: number;
    nextXp: number | null;
    progress: number;
    badge: string | null;
    newBadge: boolean;
  } | null;
  /** Pas encore de photo de profil : carte d'invitation à en ajouter une. */
  missingPhoto?: boolean;
  /** Début des liens vers les demandes et chantiers (pages d'exemples, ADR 0184). */
  base?: string;
  /** Lien « Voir l'agenda » ; aucun dans les exemples. */
  agendaHref?: string | null;
  /** Carte affichée sous le titre (exemples de l'espace, ADR 0184). */
  banner?: ReactNode;
  /**
   * Activité (ADR 0185) : raccourcis, chiffre d'affaires, chantiers en cours, devis en attente et
   * soldes à recevoir, sur deux colonnes en grand écran. Absente dans les anciens aperçus.
   */
  activity?: {
    data: DashboardActivity;
    years: number[];
    yearHref: (year: number) => string;
    currentMonth: number | null;
    chantierHref: ChantierHref;
    shortcuts: DashboardShortcutLinks;
  } | null;
}) {
  const appointmentSection = (
    <Section
      title={t.upcoming}
      action={
        agendaHref && (
          <TextLink href={agendaHref as Route} className="inline-flex items-center gap-1 text-sm">
            {t.openAgenda}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </TextLink>
        )
      }
    >
      {appointments.length === 0 ? (
        <p className="relative overflow-hidden rounded-card border border-border bg-surface px-6 py-12 text-center text-sm text-muted-foreground shadow-card">
          {t.noUpcoming}
          <Arc className="absolute -right-2 bottom-2 h-12 w-20" />
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {appointments.map((a) => (
            <li key={`${a.kind}-${a.chantierId}`}>
              <Link
                href={`${base}/chantiers/${a.chantierId}` as Route}
                className={`block overflow-hidden ${cardLink}`}
              >
                <div
                  className={`flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 text-sm text-primary-foreground ${
                    a.kind === "demarrage" ? "bg-success" : "bg-primary"
                  }`}
                >
                  <span className="rounded-chip bg-white/20 px-2 py-0.5 text-xs font-medium">
                    {t.kinds[a.kind]}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays aria-hidden="true" className="size-4" />
                    {formatDayLong(a.startsAt)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock aria-hidden="true" className="size-4" />
                    {formatTime(a.startsAt)}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <p className="font-medium">{a.title}</p>
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin aria-hidden="true" className="mt-px size-3.5 shrink-0 text-primary" />
                    {a.place}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );

  const requestSection = (
    <Section title={t.latestRequests}>
      {requests.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-strong bg-surface px-6 py-8 text-center text-sm text-muted-foreground">
          {t.noRequests}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((r) => (
            <li key={r.requestId}>
              <Link
                href={`${base}/demandes/${r.requestId}` as Route}
                className={`flex gap-3 p-4 ${cardLink}`}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="font-medium">{r.title}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
                    {r.place}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag>{r.start}</Tag>
                    {r.urgent && (
                      <StatusBadge tone="danger">{fr.pro.onboarding.requests.urgent}</StatusBadge>
                    )}
                  </div>
                </div>
                {r.thumbUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire
                  <img
                    src={r.thumbUrl}
                    alt=""
                    className="size-14 shrink-0 rounded-lg object-cover"
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <TextLink href={`${base}/demandes` as Route} className="self-start text-sm">
        {t.allRequests}
      </TextLink>
    </Section>
  );

  const todoList = todo && <TodoList items={todo} base={base} />;
  const photoCard = missingPhoto && (
    <Link
      href="/pro/onboarding/profil"
      className={`flex flex-wrap items-center gap-4 p-4 ${cardLink}`}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
        <Camera aria-hidden="true" className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium">{t.photo.title}</span>
        <span className="text-xs text-muted-foreground">{t.photo.text}</span>
      </span>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-strong">
        {t.photo.add}
        <ArrowRight aria-hidden="true" className="size-3.5" />
      </span>
    </Link>
  );
  const gradeCard = grade && (
    <Link
      href="/pro/grade"
      className="flex items-center gap-4 rounded-card border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
    >
      <BadgeIcon
        code={grade.badge ?? "main_d_argent"}
        unlocked={Boolean(grade.badge)}
        className="size-11"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="font-medium">{fr.pro.grade.title}</span>
          {grade.newBadge && (
            <span className="rounded-pill bg-primary px-2 py-0.5 text-[0.6875rem] font-medium text-primary-foreground">
              {fr.pro.grade.newBadgeShort}
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">
          {fr.pro.grade.card(grade.level)} · {fr.pro.grade.xp(grade.xp, grade.nextXp)}
        </span>
        <span className="h-1.5 overflow-hidden rounded-pill bg-primary-soft">
          <span
            className="block h-full rounded-pill bg-primary"
            style={{ width: `${Math.round(grade.progress * 100)}%` }}
          />
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
    </Link>
  );

  return (
    <main className="flex-1">
      <div
        className={`mx-auto flex w-full flex-col gap-7 px-4 py-8 sm:px-6 sm:py-10 ${
          activity ? "max-w-5xl" : "max-w-3xl"
        }`}
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-[1.75rem] leading-tight font-medium tracking-tight sm:text-[2rem]">
            {todo ? t.greeting(firstName) : t.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {todo
              ? todo.length > 0
                ? t.todoCount(todo.length)
                : t.allDone
              : t.greeting(firstName)}
          </p>
        </div>
        {banner}
        {notices.map((notice) => (
          <Alert key={notice} tone="error">
            {notice} <TextLink href="/pro/onboarding/documents">{t.documents}</TextLink>
          </Alert>
        ))}
        {!visible && (
          <Alert tone="info">
            {t.hiddenProfile} <TextLink href="/pro/onboarding">{t.completeFile}</TextLink>
          </Alert>
        )}
        {activity && <DashboardShortcuts links={activity.shortcuts} />}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Kpi
            href={`${base}/chantiers`}
            label={t.awaitingQuote}
            value={t.clients(awaitingClients)}
          />
          <Kpi
            href={`${base}/demandes`}
            label={t.responseTime}
            value={responseTime.minutes === null ? "—" : formatDuration(responseTime.minutes)}
            detail={
              <span className="text-muted-foreground">
                {responseTime.minutes === null
                  ? t.noResponse
                  : t.responseDetail(responseTime.responses)}
              </span>
            }
          />
          <Kpi
            className="col-span-2 sm:col-span-1"
            label={t.revenue}
            value={euros.format(revenue.cents / 100)}
            detail={<Trend trend={revenue.trend} month={revenue.previousMonth} />}
          />
        </div>
        {activity ? (
          <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="flex min-w-0 flex-col gap-7">
              {todoList}
              <RevenueCard
                activity={activity.data}
                years={activity.years}
                yearHref={activity.yearHref}
                currentMonth={activity.currentMonth}
              />
              <InProgressCard
                activity={activity.data}
                base={base}
                chantierHref={activity.chantierHref}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-7">
              <QuotesCard
                activity={activity.data}
                base={base}
                chantierHref={activity.chantierHref}
              />
              <ReceivablesCard activity={activity.data} chantierHref={activity.chantierHref} />
              {appointmentSection}
              {photoCard}
              {gradeCard}
            </div>
          </div>
        ) : (
          <>
            {todoList}
            {photoCard}
            {gradeCard}
            {todo ? (
              appointmentSection
            ) : /* Maquettes : les rendez-vous passent en premier dès qu'il y en a. */
            appointments.length > 0 ? (
              <>
                {appointmentSection}
                {requestSection}
              </>
            ) : (
              <>
                {requestSection}
                {appointmentSection}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  /** Lien à droite du titre (« Voir l'agenda »). */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[0.9375rem] font-medium text-foreground/80">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Évolution du chiffre encaissé : hausse en vert, baisse et stabilité en gris. */
function Trend({ trend, month }: { trend: RevenueTrend; month: string }) {
  if (!trend) return null;
  const [Icon, tone, text] =
    trend.kind === "nouveau"
      ? [TrendingUp, "text-success", t.trend.nouveau(euros.format(trend.deltaCents / 100), month)]
      : trend.kind === "hausse"
        ? [TrendingUp, "text-success", t.trend.hausse(trend.percent, month)]
        : trend.kind === "baisse"
          ? [TrendingDown, "text-muted-foreground", t.trend.baisse(trend.percent, month)]
          : [Minus, "text-muted-foreground", t.trend.stable(month)];
  return (
    <span className={`flex items-start gap-1 ${tone}`}>
      <Icon aria-hidden="true" className="mt-px size-3.5 shrink-0" />
      <span>{text}</span>
    </span>
  );
}

function Kpi({
  label,
  value,
  detail,
  href,
  className: extra = "",
}: {
  label: string;
  value: string;
  /** Ligne d'information sous la valeur (évolution, nombre de demandes). */
  detail?: ReactNode;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <span className="text-xs text-muted-foreground underline-offset-2 group-hover:underline">
        {label}
      </span>
      <span className="text-lg font-medium text-primary sm:text-xl">{value}</span>
      {detail && <span className="relative z-[1] pr-10 text-xs leading-snug">{detail}</span>}
      <Arc className="absolute -right-1 bottom-1 h-9 w-14" />
    </>
  );
  const className = `group relative flex min-h-20 flex-col gap-1 overflow-hidden rounded-card border border-border bg-surface p-4 shadow-card ${extra}`;
  return href ? (
    <Link
      href={href as Route}
      className={`${className} transition-shadow hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none`}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** Arc décoratif bleu clair des cartes de la maquette. */
function Arc({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 40" className={`text-primary-soft ${className}`}>
      <path
        d="M6 36 A28 28 0 0 1 58 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}
