import { voiceGauge, type AiAgentsState } from "@menao/core";
import { Headset } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Alert, Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDay, formatDayMonth, formatDayTimeInline } from "@/lib/format";
import { TopUpForm } from "./top-up-form";

const t = fr.pro.onboarding.plans.agents;

/** Premier jour du mois suivant (« 1er décembre »). */
function nextMonthLabel(month: string | null): string {
  const base = month ? new Date(`${month}T12:00:00Z`) : new Date();
  const next = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1, 12));
  return formatDayMonth(next.toISOString()).replace(/^1 /, "1er ");
}

type TopUp = {
  offer: { code: string; minutes: number; priceCents: number; months: number } | null;
  nextExpiry: string | null;
} | null;

/**
 * « Vos agents IA » (F-82, ADR 0231) : ce que comprend la formule. Refonte « Nette » (lot 46,
 * ADR 0315) : une pastille par agent ; minutes et appels dans leurs propres cartes, à droite.
 */
export function AiAgentsCard({
  state,
  planName,
}: {
  state: AiAgentsState;
  planName: string | null;
}) {
  const a = state.agents;
  const rows: { label: string; value: string; on: boolean }[] = [
    { label: t.items.dictation, value: t.included, on: true },
    { label: t.items.expenses, value: t.included, on: true },
    // Secrétaire dédiée (ADR 0232), devis avec Manon (ADR 0234) et agent comptable avancé
    // (ADR 0237, 0238) disponibles.
    { label: t.items.secretary, value: a.secretary ? t.included : t.upgrade, on: a.secretary },
    {
      label: t.items.conversationalQuote,
      value: a.conversationalQuote ? t.included : t.upgrade,
      on: a.conversationalQuote,
    },
    {
      label: t.items.accounting,
      value: a.advancedAccounting ? t.included : t.upgrade,
      on: a.advancedAccounting,
    },
    {
      label: t.items.reminders,
      value: t.reminderModes[a.reminders] ?? t.upgrade,
      on: a.reminders !== "non",
    },
  ];
  return (
    <Card id="agents" className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[1.0625rem] font-bold tracking-tight">{t.title}</h2>
        <p className="text-[0.84375rem] text-muted-foreground">
          {planName ? t.intro(planName) : t.noPlan}
        </p>
      </div>
      <ul className="flex flex-col">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-3 border-t border-border py-2.5 text-[0.90625rem]"
          >
            <span className="min-w-0">{row.label}</span>
            <StatusBadge tone={row.on ? "success" : "neutral"}>{row.value}</StatusBadge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Minutes de voix du mois, recharge et prochaine échéance (colonne de droite, lot 46). */
export function VoiceMinutesCard({
  state,
  topUp = null,
  topUpDone = false,
}: {
  state: AiAgentsState;
  /** Recharge proposée (Premium et Entreprise) et prochaine échéance des minutes rechargées. */
  topUp?: TopUp;
  topUpDone?: boolean;
}) {
  const gauge = voiceGauge(state);
  if (gauge.level === "sans_voix") return null;
  return (
    <Card className="flex flex-col gap-2.5">
      <h2 id="minutes-voix" className="text-base font-bold tracking-tight">
        {t.minutesTitle}
      </h2>
      <p className="font-display text-[1.875rem] leading-none font-bold tracking-tight tabular-nums">
        {gauge.usedMinutes}{" "}
        <span className="text-[1.0625rem] font-semibold text-muted-foreground">
          {t.minutesOf(gauge.includedMinutes)}
        </span>
      </p>
      <div
        role="progressbar"
        aria-labelledby="minutes-voix"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(gauge.ratio * 100)}
        className="h-2.5 overflow-hidden rounded-pill bg-border"
      >
        <div
          className={`h-full rounded-pill ${gauge.level === "ok" ? "bg-primary" : gauge.level === "alerte" ? "bg-warning" : "bg-danger"}`}
          style={{ width: `${Math.round(gauge.ratio * 100)}%` }}
        />
      </div>
      <p className="text-[0.84375rem] leading-normal text-label">
        {gauge.level === "epuise"
          ? t.minutesEmpty
          : `${t.minutesLeft(gauge.remainingMinutes, gauge.topUpMinutes)} ${t.minutesReset(nextMonthLabel(state.month))}`}
      </p>
      {gauge.level === "alerte" && <p className="text-sm text-warning">{t.minutesAlert}</p>}
      {topUp?.nextExpiry && gauge.topUpMinutes > 0 && (
        <p className="text-xs text-muted-foreground">
          {t.topUpExpiry(formatDay(topUp.nextExpiry))}
        </p>
      )}
      {topUpDone && <Alert tone="success">{t.topUpDone}</Alert>}
      {state.agents.topUps && topUp?.offer && (
        <div className="border-t border-border pt-3">
          <TopUpForm offer={topUp.offer} primary={gauge.level !== "ok"} />
        </div>
      )}
    </Card>
  );
}

/** Derniers appels des agents vocaux (colonne de droite, lot 46). */
export function RecentCallsCard({ state }: { state: AiAgentsState }) {
  if (state.calls.length === 0) return null;
  return (
    <Card className="flex flex-col gap-2">
      <h2 className="text-base font-bold tracking-tight">{t.callsTitle}</h2>
      <ul className="flex flex-col">
        {state.calls.map((call) => (
          <li
            key={`${call.at}-${call.agent}`}
            className="flex items-center justify-between gap-3 border-t border-border py-2.5 text-sm"
          >
            <span className="flex flex-col">
              <b className="font-semibold">{t.agentNames[call.agent] ?? call.agent}</b>
              <span className="text-[0.78125rem] text-muted-foreground">
                {formatDayTimeInline(call.at)}
              </span>
            </span>
            <span className="text-muted-foreground tabular-nums">
              {t.duration(Math.floor(call.seconds / 60), call.seconds % 60)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Lien vers la rubrique de la secrétaire (ADR 0244), dans la colonne de droite. */
export function SecretaryLinkCard() {
  const m = fr.pro.secretaryPage.moved;
  return (
    <Card className="flex flex-col gap-2">
      <span className="flex items-center gap-2.5">
        <span className="flex size-[2.125rem] items-center justify-center rounded-[0.625rem] bg-primary-soft text-primary-strong">
          <Headset aria-hidden="true" className="size-[1.0625rem]" />
        </span>
        <b className="text-[0.9375rem] font-semibold">{m.title}</b>
      </span>
      <p className="text-[0.84375rem] leading-[1.45] text-muted-foreground">{m.text}</p>
      <Link
        href={"/pro/secretaire" as Route}
        className="text-sm font-semibold text-primary-strong hover:underline"
      >
        {m.cta} ›
      </Link>
    </Card>
  );
}
