import {
  ADMIN_QUEUE_SEVERITIES,
  SUPPORT_ALERT_DAYS,
  SUPPORT_ALERT_REQUESTS,
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
  HeartHandshake,
  Hourglass,
  MessagesSquare,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Target,
  TriangleAlert,
  UserX,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";
import type { ActivityItem, NewArtisans, Overview, Todo } from "@/lib/admin/overview";
import { formatDay, formatTimeAgo } from "@/lib/format";
import { MoneyFigures } from "@/components/pro/money-figures";
import { SheetChip, sheetCard } from "@/components/pro/sheet";
import { LiveRefresh } from "./live-refresh";
import { AdminTabs } from "./admin-tabs";
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

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const SEVERITY_TONE: Record<AdminQueueSeverity, string> = {
  urgent: "bg-danger-soft text-danger",
  important: "bg-warning-soft text-warning",
  a_faire: "bg-primary-softer text-primary-strong",
};

/** Ce qu'affiche chaque élément de la file : titre, raison, action et détails éventuels. */
function entry(
  kind: AdminQueueKind,
  o: Overview,
  todo: Todo,
  now: Date,
  newArtisans: NewArtisans | null,
  leadAlerts = 0,
): Entry {
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
        action: { href: "/admin/conformite/controles", label: todoT.spotChecksAction },
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
        action: { href: "/admin/conformite", label: todoT.renewalsAction },
      };
    case "assurances":
      return {
        icon: ShieldAlert,
        title: todoT.insurances(o.documents.assurances_7j),
        hint: todoT.insurancesHint,
        action: { href: "/admin/conformite/echeances", label: todoT.watchAction },
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
    case "accompagnements":
      return {
        icon: HeartHandshake,
        title: todoT.support(newArtisans?.a_accompagner ?? 0),
        hint: todoT.supportHint(SUPPORT_ALERT_REQUESTS, SUPPORT_ALERT_DAYS),
        // Objet des tickets créés par l'alerte : « Accompagnement : <artisan> ».
        action: { href: "/admin/tickets?q=Accompagnement", label: todoT.supportAction },
      };
    case "objectifs":
      return {
        icon: Target,
        title: todoT.leads(leadAlerts),
        hint: todoT.leadsHint,
        action: { href: "/admin/objectifs?statut=alertes", label: todoT.leadsAction },
      };
    case "notifications":
      return {
        icon: TriangleAlert,
        title: todoT.webhooks(o.notifications.echecs),
        hint: todoT.webhooksHint,
        action: { href: "/admin/technique/notifications", label: todoT.webhooksAction },
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
  newArtisans = null,
  leadAlerts = 0,
  now,
  pole = null,
  basePath = "/admin",
}: {
  overview: Overview;
  activity: ActivityItem[];
  todo: Todo;
  /** Nouveaux artisans (ADR 0160), absents si la fonction n'est pas encore déployée. */
  newArtisans?: NewArtisans | null;
  /** Artisans en manque de demandes (ADR 0282). */
  leadAlerts?: number;
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
      accompagnements: newArtisans?.a_accompagner ?? 0,
      objectifs: leadAlerts,
      dossiers: o.artisans.en_verification,
      controles: todo.spotChecks,
      renouvellements: o.documents.renouvellements,
    },
    {
      demandes_expirent: todo.expiringRequests[0]?.expiresAt ?? null,
      suppressions: o.tickets.suppression_echeance,
      accompagnements: newArtisans?.echeance ?? null,
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
              ? "border-foreground bg-foreground text-surface"
              : "border-border bg-surface hover:bg-background"
          }`}
        >
          {label}
          <span className={active ? "text-surface/75" : "text-muted-foreground"}>{count}</span>
        </Link>
      </li>
    );
  };

  const severityChip: Record<AdminQueueSeverity, "danger" | "warning" | "neutral"> = {
    urgent: "danger",
    important: "warning",
    a_faire: "neutral",
  };
  const urgent = queue.filter((item) => item.severity === "urgent").length;
  // Refonte « Nette » (ADR 0252) : grand titre, bandeau de chiffres, une seule file triée par
  // urgence avec ses pastilles, l'activité et les chiffres détaillés à droite.
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{t.title}</h1>
          <p className="max-w-3xl text-[0.9375rem] text-label sm:text-base">{t.intro}</p>
        </div>
        <LiveRefresh renderedAt={now.toISOString()} />
      </header>
      {/* Onglets de la rubrique (ADR 0283) : « Toute l'activité » est l'ancienne page Activité. */}
      <AdminTabs set="overview" current="summary" />

      <MoneyFigures
        label={t.band.label}
        dense
        cells={[
          {
            label: t.band.visible,
            short: t.band.visibleShort,
            value: String(o.artisans.visibles),
            hint: t.band.visibleHint(o.artisans.inscrits_30j),
          },
          {
            label: t.band.requests,
            short: t.band.requestsShort,
            value: String(o.demandes.j7),
            hint: t.band.requestsHint(o.demandes.aujourdhui),
          },
          {
            label: t.band.urgent,
            short: t.band.urgentShort,
            value: String(urgent),
            tone: urgent > 0 ? "danger" : undefined,
            phoneOnly: true,
          },
          {
            label: t.band.signed,
            value: String(o.devis.signes_30j),
            hint: t.band.signedHint(euros.format(o.devis.signes_30j_cents / 100)),
            desktopOnly: true,
          },
          {
            label: t.band.paying,
            value: String(o.abonnements.payants),
            hint: t.band.payingHint(o.abonnements.essais),
            desktopOnly: true,
          },
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section aria-labelledby="a-traiter" className="flex min-w-0 flex-col gap-3">
          <h2 id="a-traiter" className="text-xl">
            {todoT.title}
          </h2>
          {poles.length > 1 && (
            <nav aria-label={todoT.filters}>
              <ul className="flex flex-wrap gap-2">
                {chip(null, todoT.poles.all, queue.length)}
                {poles.map((p) => chip(p.pole, todoT.poles[p.pole], p.count))}
              </ul>
            </nav>
          )}
          {shown.length === 0 ? (
            <p className="rounded-card border border-border bg-surface p-5 text-sm text-muted-foreground shadow-card">
              {queue.length === 0 ? todoT.empty : todoT.emptyPole}
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-card">
              {ADMIN_QUEUE_SEVERITIES.flatMap((severity) =>
                shown
                  .filter((item) => item.severity === severity)
                  .map((item) => {
                    const e = entry(item.kind, o, todo, now, newArtisans, leadAlerts);
                    const deadline = deadlineText(item, now);
                    return (
                      <li key={item.kind}>
                        <article
                          aria-label={e.title}
                          className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:gap-4 sm:px-5"
                        >
                          <span
                            aria-hidden="true"
                            className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl ${SEVERITY_TONE[severity]}`}
                          >
                            <e.icon className="size-5" />
                          </span>
                          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <SheetChip tone={severityChip[severity]} dot>
                                {todoT.severities[severity]}
                              </SheetChip>
                              <SheetChip tone="neutral">{todoT.poles[item.pole]}</SheetChip>
                              {deadline && (
                                <span
                                  className={`text-xs font-semibold ${severity === "urgent" ? "text-danger" : "text-warning"}`}
                                >
                                  {deadline}
                                </span>
                              )}
                            </div>
                            <h3 className="font-sans text-base font-bold">{e.title}</h3>
                            {e.hint && <p className="text-sm text-muted-foreground">{e.hint}</p>}
                            {e.children}
                          </div>
                          <Link
                            href={e.action.href as Route}
                            className="inline-flex min-h-10 shrink-0 items-center self-start rounded-pill border border-border-strong bg-surface px-4 text-sm font-semibold hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none sm:self-center"
                          >
                            {e.action.label}
                          </Link>
                        </article>
                      </li>
                    );
                  }),
              )}
            </ul>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="activite" className={sheetCard}>
            <h2 id="activite" className="text-lg">
              {t.activity.title}
            </h2>
            <ActivityFeed items={activity} now={now} />
            {/* Les 10 derniers événements ; l'historique complet est paginé (ADR 0146). */}
            <Link
              href={"/admin/activite" as Route}
              className="self-start text-sm font-semibold text-primary-strong underline-offset-2 hover:underline"
            >
              {t.activity.seeAll} →
            </Link>
          </section>
          <section aria-labelledby="chiffres" className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 id="chiffres" className="text-lg">
                {t.figures.title}
              </h2>
              <p className="text-xs text-muted-foreground">{t.figures.intro}</p>
            </div>
            <KeyFigures overview={o} newArtisans={newArtisans} />
          </section>
        </div>
      </div>
    </div>
  );
}
