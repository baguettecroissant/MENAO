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
import type { ComponentProps, ReactNode } from "react";
import { ChantierList } from "@/components/pro/chantier-list";
import { BadgeIcon } from "@/components/pro/grade/badge-icon";
import {
  DashboardActions,
  InProgressCard,
  MoneyBand,
  QuotesCard,
  ReceivablesCard,
  RevenueCard,
  type ChantierHref,
  type DashboardShortcutLinks,
} from "@/components/pro/dashboard-activity";
import { TodoList } from "@/components/pro/todo-list";
import { Alert, StatusBadge, Tag, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { appTheme } from "@/lib/fonts";
import { formatDayLong, formatDuration, formatTime, formatToday } from "@/lib/format";

const t = fr.pro.dashboard;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const roundEuros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
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
    <UpcomingSection appointments={appointments} base={base} agendaHref={agendaHref} />
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
        <span className="font-semibold">{t.photo.title}</span>
        <span className="text-sm text-muted-foreground">{t.photo.text}</span>
      </span>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-strong">
        {t.photo.add}
        <ArrowRight aria-hidden="true" className="size-3.5" />
      </span>
    </Link>
  );
  const gradeCard = grade && (
    <Link href="/pro/grade" className={`flex items-center gap-4 p-4 sm:px-5 ${cardLink}`}>
      <BadgeIcon
        code={grade.badge ?? "main_d_argent"}
        unlocked={Boolean(grade.badge)}
        className="size-11"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="flex items-center gap-2">
            <span className="font-semibold">{fr.pro.grade.title}</span>
            {grade.newBadge && (
              <span className="rounded-pill bg-primary px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-foreground">
                {fr.pro.grade.newBadgeShort}
              </span>
            )}
          </span>
          <span className="text-[0.8125rem] text-muted-foreground tabular-nums">
            {fr.pro.grade.card(grade.level)} · {fr.pro.grade.xp(grade.xp, grade.nextXp)}
          </span>
        </span>
        <span className="h-1.5 overflow-hidden rounded-pill bg-background">
          <span
            className="block h-full rounded-pill bg-primary"
            style={{ width: `${Math.round(grade.progress * 100)}%` }}
          />
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );

  const greeting = (
    <div className="flex flex-col gap-1.5">
      {todo && (
        <p className="text-sm font-semibold text-muted-foreground">{formatToday(new Date())}</p>
      )}
      <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">
        {todo ? t.greeting(firstName) : t.title}
      </h1>
      <p className="text-base text-label">
        {todo ? (
          todo.length > 0 ? (
            <>
              {t.todoLead}{" "}
              <strong className="font-bold text-foreground">{t.todoCount(todo.length)}</strong>.
            </>
          ) : (
            t.allDone
          )
        ) : (
          t.greeting(firstName)
        )}
      </p>
    </div>
  );
  const alerts = (
    <>
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
    </>
  );

  // Refonte « Nette » (F-91, ADR 0245) : salutation et actions, bandeau des trois chiffres de
  // l'argent, puis deux colonnes (à faire et chiffre d'affaires ; chantiers, devis, soldes, à venir).
  if (activity) {
    return (
      <main className={`flex-1 ${appTheme}`}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
          <header className="flex flex-wrap items-end justify-between gap-5">
            {greeting}
            <DashboardActions links={activity.shortcuts} />
          </header>
          {alerts}
          <MoneyBand
            revenue={{
              cents: revenue.cents,
              trend: <Trend trend={revenue.trend} month={revenue.previousMonth} chip />,
            }}
            activity={activity.data}
          />
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="flex min-w-0 flex-col gap-6">
              {todoList}
              <RevenueCard
                activity={activity.data}
                years={activity.years}
                yearHref={activity.yearHref}
                currentMonth={activity.currentMonth}
                stats={[
                  {
                    label: t.awaitingQuote,
                    value: t.clients(awaitingClients),
                    href: `${base}/chantiers`,
                  },
                  {
                    label: fr.pro.dashboard.activity.quotes.signRate,
                    value:
                      activity.data.quotes.signRate === null
                        ? "—"
                        : fr.review.percent(activity.data.quotes.signRate),
                  },
                  {
                    label: fr.pro.dashboard.activity.quotes.average,
                    value:
                      activity.data.quotes.averageSignedCents === null
                        ? "—"
                        : roundEuros.format(
                            Math.round(activity.data.quotes.averageSignedCents / 100),
                          ),
                  },
                  {
                    label: t.responseTime,
                    value:
                      responseTime.minutes === null ? "—" : formatDuration(responseTime.minutes),
                    hint:
                      responseTime.minutes === null
                        ? t.noResponse
                        : t.responseDetail(responseTime.responses),
                    href: `${base}/demandes`,
                  },
                ]}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-6">
              <InProgressCard
                activity={activity.data}
                base={base}
                chantierHref={activity.chantierHref}
              />
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
        </div>
      </main>
    );
  }

  return (
    <main className={`flex-1 ${appTheme}`}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-8 sm:px-6 sm:py-10">
        {greeting}
        {alerts}
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
      </div>
    </main>
  );
}

/**
 * Rendez-vous et démarrages des jours suivants (F-16), avec le lien vers l'agenda : une carte et
 * une ligne par rendez-vous (refonte « Nette », ADR 0245).
 */
function UpcomingSection({
  appointments,
  base,
  agendaHref,
}: {
  appointments: DashboardAppointment[];
  base: string;
  agendaHref: string | null;
}) {
  return (
    <section
      aria-labelledby="a-venir"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="a-venir" className="text-lg">
          {t.upcoming}
        </h2>
        {agendaHref && (
          <TextLink
            href={agendaHref as Route}
            className="inline-flex items-center gap-1 text-sm font-semibold"
          >
            {t.openAgenda}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </TextLink>
        )}
      </div>
      {appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noUpcoming}</p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {appointments.map((a) => (
            <li key={`${a.kind}-${a.chantierId}`}>
              <Link
                href={`${base}/chantiers/${a.chantierId}` as Route}
                className="flex items-center gap-3 rounded-input px-2 py-2.5 transition-colors hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
              >
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                    a.kind === "demarrage"
                      ? "bg-success-soft text-success"
                      : "bg-primary-soft text-primary-strong"
                  }`}
                >
                  <CalendarDays aria-hidden="true" className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-semibold">{a.title}</span>
                  <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                    <span>{t.kinds[a.kind]}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDayLong(a.startsAt)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock aria-hidden="true" className="size-3.5" />
                      {formatTime(a.startsAt)}
                    </span>
                  </span>
                  {a.place && (
                    <span className="flex items-start gap-1 truncate text-sm text-muted-foreground">
                      <MapPin
                        aria-hidden="true"
                        className="mt-0.5 size-3.5 shrink-0 text-primary"
                      />
                      {a.place}
                    </span>
                  )}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Accueil d'un ouvrier (ADR 0241) : ses prochains rendez-vous et les chantiers qui lui sont
 * attribués, sans aucun montant ni demande.
 */
export function WorkerDashboardView({
  firstName,
  company,
  appointments,
  chantiers,
}: {
  firstName: string | null;
  company: string | null;
  appointments: DashboardAppointment[];
  chantiers: ComponentProps<typeof ChantierList>["rows"];
}) {
  return (
    <main className={`flex-1 ${appTheme}`}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-muted-foreground">{formatToday(new Date())}</p>
          <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{t.greeting(firstName)}</h1>
          <p className="text-base text-label">{t.worker.subtitle(company)}</p>
        </div>
        <UpcomingSection appointments={appointments} base="/pro" agendaHref="/pro/agenda" />
        <Section title={t.worker.chantiers}>
          {chantiers.length === 0 ? (
            <p className="rounded-card border border-border bg-surface px-6 py-10 text-center text-sm text-muted-foreground shadow-card">
              {t.worker.empty}
            </p>
          ) : (
            <ChantierList rows={chantiers} />
          )}
        </Section>
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
        <h2 className="text-lg">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Évolution du chiffre encaissé : hausse en vert, baisse et stabilité en gris. `chip` : pastille du
 * bandeau de l'argent (ADR 0245).
 */
function Trend({
  trend,
  month,
  chip = false,
}: {
  trend: RevenueTrend;
  month: string;
  chip?: boolean;
}) {
  if (!trend) return null;
  const up = trend.kind === "nouveau" || trend.kind === "hausse";
  const [Icon, text] =
    trend.kind === "nouveau"
      ? [TrendingUp, t.trend.nouveau(euros.format(trend.deltaCents / 100), month)]
      : trend.kind === "hausse"
        ? [TrendingUp, t.trend.hausse(trend.percent, month)]
        : trend.kind === "baisse"
          ? [TrendingDown, t.trend.baisse(trend.percent, month)]
          : [Minus, t.trend.stable(month)];
  const tone = up ? "text-success" : "text-muted-foreground";
  return (
    <span
      className={`flex items-start gap-1.5 ${tone} ${
        chip
          ? `self-start rounded-[0.875rem] px-2.5 py-1 text-[0.8125rem] leading-snug font-semibold ${
              up ? "bg-success-soft" : "bg-background"
            }`
          : ""
      }`}
    >
      <Icon
        aria-hidden="true"
        className={`shrink-0 ${chip ? "mt-0.5 size-3.5" : "mt-px size-3.5"}`}
      />
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
