import { timeLeft } from "@menao/core";
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
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";
import type { ActivityItem, Overview, Todo } from "@/lib/admin/overview";
import { formatDay, formatTimeAgo } from "@/lib/format";
import { LiveRefresh } from "./live-refresh";
import { ActivityFeed, KeyFigures, TodoCard } from "./overview";

const t = fr.admin.overview;

/**
 * Vue d'ensemble du back-office (F-58, ADR 0045) : ce qui demande l'attention de l'équipe (seules
 * les cartes non vides s'affichent), le fil d'activité en direct et les chiffres clés.
 */
export function OverviewScreen({
  overview,
  activity,
  todo,
  now,
}: {
  overview: Overview;
  activity: ActivityItem[];
  todo: Todo;
  now: Date;
}) {
  const o = overview;
  const todoT = t.todo;

  const cards: { key: string; node: ReactNode }[] = [];
  if (o.artisans.en_verification > 0) {
    cards.push({
      key: "dossiers",
      node: (
        <TodoCard
          icon={ShieldCheck}
          tone="primary"
          title={todoT.dossiers(o.artisans.en_verification)}
          hint={
            o.artisans.plus_ancien_dossier
              ? todoT.oldest(formatTimeAgo(o.artisans.plus_ancien_dossier, now))
              : ""
          }
          action={{ href: "/admin/artisans?statut=en_verification", label: todoT.dossiersAction }}
        >
          <ul className="flex flex-col gap-1.5 text-sm">
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
        </TodoCard>
      ),
    });
  }
  if (todo.spotChecks > 0) {
    cards.push({
      key: "controles",
      node: (
        <TodoCard
          icon={ClipboardCheck}
          tone="primary"
          title={todoT.spotChecks(todo.spotChecks)}
          hint={todoT.spotChecksHint}
          action={{ href: "/admin/controles", label: todoT.spotChecksAction }}
        />
      ),
    });
  }
  if (o.tickets.litiges > 0) {
    cards.push({
      key: "litiges",
      node: (
        <TodoCard
          icon={Scale}
          tone="danger"
          title={todoT.disputes(o.tickets.litiges)}
          hint={todoT.disputesHint}
          action={{ href: "/admin/tickets?file=litiges", label: todoT.disputesAction }}
        />
      ),
    });
  }
  if (o.tickets.en_retard > 0) {
    cards.push({
      key: "retard",
      node: (
        <TodoCard
          icon={MessagesSquare}
          tone="danger"
          title={todoT.late(o.tickets.en_retard)}
          hint={todoT.lateHint}
          action={{ href: "/admin/tickets?file=en_retard", label: todoT.lateAction }}
        />
      ),
    });
  }
  if (o.demandes.expirent_12h > 0) {
    cards.push({
      key: "demandes",
      node: (
        <TodoCard
          icon={Hourglass}
          tone="warning"
          title={todoT.expiring(o.demandes.expirent_12h)}
          hint={todoT.expiringHint}
          action={{ href: "/admin/demandes?filtre=expirent", label: todoT.expiringAction }}
        >
          <ul className="flex flex-col gap-1.5 text-sm">
            {todo.expiringRequests.map((r) => {
              const left = timeLeft(new Date(r.expiresAt), now);
              return (
                <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
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
        </TodoCard>
      ),
    });
  }
  if (o.tickets.suppressions > 0) {
    cards.push({
      key: "suppressions",
      node: (
        <TodoCard
          icon={UserX}
          tone="warning"
          title={todoT.deletions(o.tickets.suppressions)}
          hint={
            o.tickets.suppression_echeance
              ? todoT.deletionsHint(formatDay(o.tickets.suppression_echeance))
              : ""
          }
          action={{ href: "/admin/tickets?file=suppressions", label: todoT.deletionsAction }}
        />
      ),
    });
  }
  if (o.documents.renouvellements > 0) {
    cards.push({
      key: "renouvellements",
      node: (
        <TodoCard
          icon={FileClock}
          tone="primary"
          title={todoT.renewals(o.documents.renouvellements)}
          hint={todoT.renewalsHint}
          action={{ href: "/admin/surveillance", label: todoT.watchAction }}
        />
      ),
    });
  }
  if (o.documents.assurances_7j > 0) {
    cards.push({
      key: "assurances",
      node: (
        <TodoCard
          icon={ShieldAlert}
          tone="warning"
          title={todoT.insurances(o.documents.assurances_7j)}
          hint={todoT.insurancesHint}
          action={{ href: "/admin/surveillance", label: todoT.watchAction }}
        />
      ),
    });
  }
  if (o.paiements.echoues_7j > 0) {
    cards.push({
      key: "paiements",
      node: (
        <TodoCard
          icon={CreditCard}
          tone="warning"
          title={todoT.failed(o.paiements.echoues_7j)}
          hint={todoT.failedHint}
          action={{ href: "/admin/paiements?file=echoues", label: todoT.failedAction }}
        />
      ),
    });
  }
  if (o.abonnements.impayes > 0) {
    cards.push({
      key: "impayes",
      node: (
        <TodoCard
          icon={CreditCard}
          tone="warning"
          title={todoT.unpaid(o.abonnements.impayes)}
          hint={todoT.unpaidHint}
          action={{ href: "/admin/abonnements?file=impayes", label: todoT.unpaidAction }}
        />
      ),
    });
  }
  if (o.notifications.echecs > 0) {
    cards.push({
      key: "notifications",
      node: (
        <TodoCard
          icon={TriangleAlert}
          tone="danger"
          title={todoT.webhooks(o.notifications.echecs)}
          hint={todoT.webhooksHint}
          action={{ href: "/admin/paiements/notifications", label: todoT.webhooksAction }}
        />
      ),
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.intro}</p>
        </div>
        <LiveRefresh renderedAt={now.toISOString()} />
      </header>

      <section aria-labelledby="a-traiter" className="flex flex-col gap-3">
        <h2 id="a-traiter" className="text-lg font-medium">
          {todoT.title}
        </h2>
        {cards.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-5 text-sm text-muted-foreground shadow-card">
            {todoT.empty}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <li key={card.key}>{card.node}</li>
            ))}
          </ul>
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
