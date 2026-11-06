import { voiceGauge, type AiAgentsState } from "@menao/core";
import { Check, Lock } from "lucide-react";
import { Alert, Card } from "@/components/ui";
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

/**
 * « Vos agents IA » (F-82, ADR 0231) : ce que comprend la formule, minutes de voix du mois et
 * derniers appels. Consultation seulement : les recharges s'achètent sur le site (lot 2).
 */
export function AiAgentsCard({
  state,
  planName,
  topUp = null,
  topUpDone = false,
}: {
  state: AiAgentsState;
  planName: string | null;
  /** Recharge proposée (Premium et Entreprise) et prochaine échéance des minutes rechargées. */
  topUp?: {
    offer: { code: string; minutes: number; priceCents: number; months: number } | null;
    nextExpiry: string | null;
  } | null;
  topUpDone?: boolean;
}) {
  const gauge = voiceGauge(state);
  const a = state.agents;
  const rows: { label: string; value: string; on: boolean }[] = [
    { label: t.items.dictation, value: t.included, on: true },
    { label: t.items.expenses, value: t.included, on: true },
    // Secrétaire dédiée (ADR 0232) et devis avec Camille (ADR 0234) disponibles : les agents
    // avancés arrivent.
    { label: t.items.secretary, value: a.secretary ? t.included : t.upgrade, on: a.secretary },
    {
      label: t.items.conversationalQuote,
      value: a.conversationalQuote ? t.included : t.upgrade,
      on: a.conversationalQuote,
    },
    {
      label: t.items.accounting,
      value: a.advancedAccounting ? t.soon : t.upgrade,
      on: a.advancedAccounting,
    },
    {
      label: t.items.reminders,
      value: t.reminderModes[a.reminders] ?? t.upgrade,
      on: a.reminders !== "non",
    },
  ];
  return (
    <Card id="agents" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{planName ? t.intro(planName) : t.noPlan}</p>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {rows.map((row) => (
          <li key={row.label} className="flex items-start gap-3 py-2.5 text-sm">
            {row.on ? (
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-subtle-foreground" />
            )}
            <span className="min-w-0 flex-1">{row.label}</span>
            <span
              className={row.on ? "text-right text-foreground" : "text-right text-muted-foreground"}
            >
              {row.value}
            </span>
          </li>
        ))}
      </ul>
      {gauge.level !== "sans_voix" && (
        <section
          aria-labelledby="minutes-voix"
          className="flex flex-col gap-2 border-t border-border pt-4"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="minutes-voix" className="font-medium">
              {t.minutesTitle}
            </h3>
            <span className="text-sm tabular-nums">
              {t.minutesUsed(gauge.usedMinutes, gauge.includedMinutes)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={t.minutesTitle}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(gauge.ratio * 100)}
            className="h-2 overflow-hidden rounded-pill bg-border"
          >
            <div
              className={`h-full rounded-pill ${gauge.level === "ok" ? "bg-primary" : gauge.level === "alerte" ? "bg-warning" : "bg-danger"}`}
              style={{ width: `${Math.round(gauge.ratio * 100)}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
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
            <TopUpForm offer={topUp.offer} primary={gauge.level !== "ok"} />
          )}
        </section>
      )}
      {state.calls.length > 0 && (
        <section
          aria-labelledby="derniers-appels"
          className="flex flex-col gap-2 border-t border-border pt-4"
        >
          <h3 id="derniers-appels" className="font-medium">
            {t.callsTitle}
          </h3>
          <ul className="flex flex-col gap-1 text-sm">
            {state.calls.map((call) => (
              <li key={`${call.at}-${call.agent}`} className="flex justify-between gap-3">
                <span>{t.agentNames[call.agent] ?? call.agent}</span>
                <span className="text-muted-foreground tabular-nums">
                  {t.duration(Math.floor(call.seconds / 60), call.seconds % 60)} ·{" "}
                  {formatDayTimeInline(call.at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Card>
  );
}
