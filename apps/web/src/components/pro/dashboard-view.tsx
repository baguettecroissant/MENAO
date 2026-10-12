import type { RevenueTrend } from "@menao/core";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  MapPin,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
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
  requests,
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
  requests: DashboardRequest[];
}) {
  const appointmentSection = (
    <Section
      title={t.upcoming}
      action={
        <TextLink href="/pro/agenda" className="inline-flex items-center gap-1 text-sm">
          {t.openAgenda}
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </TextLink>
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
                href={`/pro/chantiers/${a.chantierId}` as Route}
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
                href={`/pro/demandes/${r.requestId}` as Route}
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
      <TextLink href="/pro/demandes" className="self-start text-sm">
        {t.allRequests}
      </TextLink>
    </Section>
  );

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-[1.75rem] leading-tight font-medium tracking-tight sm:text-[2rem]">
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.greeting(firstName)}</p>
        </div>
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Kpi href="/pro/chantiers" label={t.awaitingQuote} value={t.clients(awaitingClients)} />
          <Kpi
            href="/pro/demandes"
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
        {/* Maquettes : les rendez-vous passent en premier dès qu'il y en a. */}
        {appointments.length > 0 ? (
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
