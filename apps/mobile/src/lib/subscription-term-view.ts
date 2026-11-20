import { cancellationPlan, parisDay, subscriptionTermSummary } from "@menao/core";
import { fr } from "@/i18n/fr";
import { formatCivilDay, formatDay } from "./format";

/**
 * Engagement d'un an dans l'application (F-184, ADR 0383, maquette du lot 74) : l'état, les dates
 * qui comptent et ce que propose « Arrêter mon abonnement », à partir du cœur, comme sur le site.
 */

const t = fr.proPlan;
const civil = formatCivilDay;

export type TermSubscription = {
  status: string;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  cancel_at: string | null;
  engagement_version: string | null;
  essai_demarre_le: string | null;
  arret_effet_le: string | null;
};

const OPEN = ["trialing", "active", "past_due"];

function summary(sub: TermSubscription, today: string) {
  return subscriptionTermSummary({
    engaged: Boolean(sub.engagement_version),
    status: sub.status,
    trialEnd: sub.trial_end,
    goLiveAt: sub.essai_demarre_le,
    stopLastDay: sub.arret_effet_le,
    today,
  });
}

export type TermView = {
  /** Ligne d'état sous le nom de la formule. */
  state: string;
  rows: [string, string][];
  canStop: boolean;
};

export function termView(sub: TermSubscription, today: string): TermView {
  const term = summary(sub, today);
  const state =
    term.phase === "awaitingGoLive"
      ? t.term.awaitingStatus
      : term.phase === "trial"
        ? t.term.trialStatus(civil(term.trialLastDay))
        : term.phase === "stopping"
          ? t.states.ending(civil(term.stopLastDay))
          : sub.status === "trialing" && sub.trial_end
            ? t.states.trial(formatDay(sub.trial_end))
            : sub.cancel_at_period_end && sub.current_period_end
              ? t.states.ending(formatDay(sub.current_period_end))
              : t.states.active;
  const rows: [string, string][] =
    term.phase === "awaitingGoLive"
      ? [[t.term.engagementRow, t.term.awaitingEngagement]]
      : term.phase === "trial"
        ? [
            [t.term.firstPaymentRow, civil(term.firstPaymentDay)],
            [
              t.term.engagementRow,
              t.term.fromTo(civil(term.firstPaymentDay), civil(term.termLastDay)),
            ],
            [t.term.renounceRow, t.term.before(civil(term.firstPaymentDay))],
          ]
        : term.phase === "engaged"
          ? [
              [t.term.engagementRow, t.term.until(civil(term.termLastDay))],
              [t.term.renewalRow, t.term.renewalOn(civil(term.renewal))],
              [t.term.stopRow, t.term.stopBy(civil(term.cancelDeadline))],
            ]
          : term.phase === "stopping"
            ? [[t.term.stoppingRow, t.term.stoppingOn(civil(term.stopLastDay))]]
            : [];
  const canStop =
    term.phase !== "stopping" &&
    OPEN.includes(sub.status) &&
    !sub.cancel_at_period_end &&
    !sub.cancel_at;
  return { state, rows, canStop };
}

/** Ce que montre « Arrêter mon abonnement » (écrans 4 et 5 de la maquette du lot 74). */
export type StopView =
  | { kind: "closed" }
  | { kind: "requested"; text: string }
  | {
      kind: "trial";
      title: string;
      text: string;
      rows: [string, string][];
      confirm: string;
    }
  | {
      kind: "renewal";
      intro: string;
      option: string;
      optionText: string;
      noExitTitle: string;
      confirm: string;
    }
  | { kind: "periodEnd"; text: string; confirm: string };

export function stopView(sub: TermSubscription | null, today: string): StopView {
  const s = t.stop;
  if (!sub || !OPEN.includes(sub.status)) return { kind: "closed" };
  const engaged = Boolean(sub.engagement_version);
  const term = summary(sub, today);
  const periodEnd = sub.current_period_end ? formatDay(sub.current_period_end) : "—";
  if (term.phase === "stopping" || sub.cancel_at || sub.cancel_at_period_end) {
    return {
      kind: "requested",
      text: s.alreadyRequested(term.phase === "stopping" ? civil(term.stopLastDay) : periodEnd),
    };
  }
  const plan = cancellationPlan({
    engaged,
    firstPaymentDay: sub.trial_end ? parisDay(sub.trial_end) : null,
    today,
  });
  if (plan.kind === "trial") {
    const started = term.phase === "trial" || !engaged;
    const until = term.phase === "trial" ? civil(term.trialLastDay) : periodEnd;
    return {
      kind: "trial",
      title: s.trialTitle,
      text: started ? s.trialText(until) : s.awaitingText,
      rows: [
        [s.toPay, s.zero],
        [s.profile, started ? s.profileUntil(until) : s.profileNow],
        [s.documents, s.documentsValue],
      ],
      confirm: s.renounce,
    };
  }
  if (plan.kind === "renewal" && term.phase === "engaged") {
    return {
      kind: "renewal",
      intro: s.yearIntro(civil(term.termLastDay)),
      option: plan.late ? s.atNextRenewal : s.atRenewal,
      optionText: plan.late
        ? s.lateText(civil(plan.lastDay))
        : s.atRenewalText(civil(plan.lastDay), civil(term.cancelDeadline)),
      noExitTitle: s.noExitTitle(civil(term.termLastDay)),
      confirm: s.confirm(civil(plan.lastDay)),
    };
  }
  return { kind: "periodEnd", text: s.periodEndText(periodEnd), confirm: s.confirm(periodEnd) };
}
