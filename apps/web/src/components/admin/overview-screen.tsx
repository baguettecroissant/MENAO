import {
  ADMIN_QUEUE_SEVERITIES,
  adminQueue,
  adminQueuePoles,
  timeLeft,
  type AdminPole,
  type AdminQueueItem,
  type AdminQueueKind,
  type AdminQueueSeverity,
} from "@menao/core";
import {
  ClipboardCheck,
  CreditCard,
  FileClock,
  Hourglass,
  MessagesSquare,
  Scale,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  UserX,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";
import type { ActivityItem, Overview, Todo } from "@/lib/admin/overview";
import { formatDay, formatTimeAgo } from "@/lib/format";
import { LiveRefresh } from "./live-refresh";
import { ActivityFeed, KeyFigures } from "./overview";

const t = fr.admin.overview;
const todoT = t.todo;

type Entry = {
  icon: LucideIcon;
  title: string;
  hint: string;
  action: { href: string; label: string };
  children?: ReactNode;
};

const SEVERITY_TONE: Record<AdminQueueSeverity, string> = {
  urgent: "bg-danger-soft text-danger",
  important: "bg-warning-soft text-warning",
  a_faire: "bg-primary-softer text-primary-strong",
};

/** Ce qu'affiche chaque élément de la file : titre, raison, action et détails éventuels. */
function entry(kind: AdminQueueKind, o: Overview, todo: Todo, now: Date): Entry {
  switch (kind) {
    case "dossiers":
      return {
        icon: ShieldCheck,
        title: todoT.dossiers(o.artisans.en_verification),
        hint: o.artisans.plus_ancien_dossier
          ? todoT.oldest(formatTimeAgo(o.artisans.plus_ancien_dossier, now))
          : "",
        action: { href: "/admin/artisans?statut=en_verification", label: todoT.dossiersAction },
        children: (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {todo.dossiers.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/admin/artisans/${d.id}` as Route}
                  aria-label={todoT.open(d.name)}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        ),
      };
    case "controles":
      return {
        icon: ClipboardCheck,
        title: todoT.spotChecks(todo.spotChecks),
        hint: todoT.spotChecksHint,
        action: { href: "/admin/controles", label: todoT.spotChecksAction },
      };
    case "litiges":
      return {
        icon: Scale,
        title: todoT.disputes(o.tickets.litiges),
        hint: todoT.disputesHint,
        action: { href: "/admin/tickets?file=litiges", label: todoT.disputesAction },
      };
    case "tickets_retard":
      return {
        icon: MessagesSquare,
        title: todoT.late(o.tickets.en_retard),
        hint: todoT.lateHint,
        action: { href: "/admin/tickets?file=en_retard", label: todoT.lateAction },
      };
    case "demandes_expirent":
      return {
        icon: Hourglass,
        title: todoT.expiring(o.demandes.expirent_12h),
        hint: todoT.expiringHint,
        action: { href: "/admin/demandes?filtre=expirent", label: todoT.expiringAction },
        children: (
          <ul className="flex flex-col gap-1 text-sm">
            {todo.expiringRequests.map((r) => {
              const left = timeLeft(new Date(r.expiresAt), now);
              return (
                <li key={r.id} className="flex flex-wrap items-baseline gap-x-3">
                  <Link
                    href={`/admin/demandes/${r.projectId}` as Route}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {r.artisan || t.activity.unknownArtisan}
                  </Link>
                  {left && (
                    <span className="text-xs text-muted-foreground">
                      {todoT.expiresIn(left.hours, left.minutes)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ),
      };
    case "suppressions":
      return {
        icon: UserX,
        title: todoT.deletions(o.tickets.suppressions),
        hint: o.tickets.suppression_echeance
          ? todoT.deletionsHint(formatDay(o.tickets.suppression_echeance))
          : "",
        action: { href: "/admin/tickets?file=suppressions", label: todoT.deletionsAction },
      };
    case "renouvellements":
      return {
        icon: FileClock,
        title: todoT.renewals(o.documents.renouvellements),
        hint: todoT.renewalsHint,
        action: { href: "/admin/surveillance", label: todoT.watchAction },
      };
    case "assurances":
      return {
        icon: ShieldAlert,
        title: todoT.insurances(o.documents.assurances_7j),
        hint: todoT.insurancesHint,
        action: { href: "/admin/surveillance", label: todoT.watchAction },
      };
    case "paiements_echoues":
      return {
        icon: CreditCard,
        title: todoT.failed(o.paiements.echoues_7j),
        hint: todoT.failedHint,
        action: { href: "/admin/paiements?file=echoues", label: todoT.failedAction },
      };
    case "impayes":
      return {
        icon: CreditCard,
        title: todoT.unpaid(o.abonnements.impayes),
        hint: todoT.unpaidHint,
        action: { href: "/admin/abonnements?file=impayes", label: todoT.unpaidAction },
      };
    case "notifications":
      return {
        icon: TriangleAlert,
        title: todoT.webhooks(o.notifications.echecs),
        hint: todoT.webhooksHint,
        action: { href: "/admin/paiements/notifications", label: todoT.webhooksAction },
      };
  }
}

/** Échéance affichée à côté du titre : temps restant, ou date limite. */
function deadlineText(item: AdminQueueItem, now: Date): string | null {
  if (!item.deadline) return null;
  if (item.kind === "demandes_expirent") {
    const left = timeLeft(new Date(item.deadline), now);
    return left ? todoT.expiresIn(left.hours, left.minutes) : null;
  }
  return todoT.before(formatDay(item.deadline));
}

/**
 * Vue d'ensemble du back-office (F-58, ADR 0045 puis 0133) : « À traiter maintenant » en une
 * seule file triée par urgence (urgent, important, à faire), filtrable par pôle, puis le fil
 * d'activité en direct et les chiffres clés.
 */
export function OverviewScreen({
  overview,
  activity,
  todo,
  now,
  pole = null,
  basePath = "/admin",
}: {
  overview: Overview;
  activity: ActivityItem[];
  todo: Todo;
  now: Date;
  /** Pôle choisi dans les filtres (`?pole=`), ou tous. */
  pole?: AdminPole | null;
  basePath?: string;
}) {
  const o = overview;
  const queue = adminQueue(
    {
      litiges: o.tickets.litiges,
      tickets_retard: o.tickets.en_retard,
      demandes_expirent: o.demandes.expirent_12h,
      notifications: o.notifications.echecs,
      suppressions: o.tickets.suppressions,
      assurances: o.documents.assurances_7j,
      paiements_echoues: o.paiements.echoues_7j,
      impayes: o.abonnements.impayes,
      dossiers: o.artisans.en_verification,
      controles: todo.spotChecks,
      renouvellements: o.documents.renouvellements,
    },
    {
      demandes_expirent: todo.expiringRequests[0]?.expiresAt ?? null,
      suppressions: o.tickets.suppression_echeance,
    },
  );
  const poles = adminQueuePoles(queue);
  const shown = pole ? queue.filter((item) => item.pole === pole) : queue;
  const chip = (value: AdminPole | null, label: string, count: number) => {
    const active = value === pole;
    return (
      <li key={value ?? "all"}>
        <Link
          href={(value ? `${basePath}?pole=${value}` : basePath) as Route}
          aria-current={active ? "page" : undefined}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-pill border px-3 text-sm font-medium transition-colors focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none ${
            active
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface hover:bg-background"
          }`}
        >
          {label}
          <span className={active ? "text-primary-foreground/80" : "text-muted-foreground"}>
            {count}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.intro}</p>
        </div>
        <LiveRefresh renderedAt={now.toISOString()} />
      </header>

      <section aria-labelledby="a-traiter" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="a-traiter" className="shrink-0 text-lg font-medium">
            {todoT.title}
          </h2>
          {poles.length > 1 && (
            <nav aria-label={todoT.filters}>
              <ul className="flex flex-wrap gap-2 sm:justify-end">
                {chip(null, todoT.poles.all, queue.length)}
                {poles.map((p) => chip(p.pole, todoT.poles[p.pole], p.count))}
              </ul>
            </nav>
          )}
        </div>
        {shown.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-5 text-sm text-muted-foreground shadow-card">
            {queue.length === 0 ? todoT.empty : todoT.emptyPole}
          </p>
        ) : (
          ADMIN_QUEUE_SEVERITIES.map((severity) => {
            const items = shown.filter((item) => item.severity === severity);
            if (items.length === 0) return null;
            return (
              <div key={severity} className="flex flex-col gap-2">
                <h3 className="ml-1 text-sm font-medium text-muted-foreground">
                  {todoT.severities[severity]} · {items.length}
                </h3>
                <ul className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
                  {items.map((item) => {
                    const e = entry(item.kind, o, todo, now);
                    const deadline = deadlineText(item, now);
                    return (
                      <li key={item.kind} className="border-t border-border first:border-t-0">
                        <article
                          aria-label={e.title}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4"
                        >
                          <span
                            aria-hidden="true"
                            className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${SEVERITY_TONE[severity]}`}
                          >
                            <e.icon className="size-5" />
                          </span>
                          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                              <h4 className="font-medium">{e.title}</h4>
                              {deadline && (
                                <span
                                  className={`text-xs font-medium ${severity === "urgent" ? "text-danger" : "text-warning"}`}
                                >
                                  {deadline}
                                </span>
                              )}
                            </div>
                            {e.hint && <p className="text-sm text-muted-foreground">{e.hint}</p>}
                            {e.children}
                          </div>
                          <Link
                            href={e.action.href as Route}
                            className="shrink-0 self-start text-sm font-medium text-primary underline-offset-2 hover:underline sm:self-center"
                          >
                            {e.action.label} →
                          </Link>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section
          aria-labelledby="activite"
          className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
        >
          <h2 id="activite" className="text-lg font-medium">
            {t.activity.title}
          </h2>
          <ActivityFeed items={activity} now={now} />
        </section>
        <section aria-labelledby="chiffres" className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 id="chiffres" className="text-lg font-medium">
              {t.figures.title}
            </h2>
            <p className="text-xs text-muted-foreground">{t.figures.intro}</p>
          </div>
          <KeyFigures overview={o} />
        </section>
      </div>
    </div>
  );
}
