import { cancellationPlan, parisDay, subscriptionTermSummary } from "@menao/core";
import { ArrowLeft, Check, Info } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { StopForm } from "./stop-form";

const t = fr.pro.onboarding.plans.stop;
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });
/** Jour civil (AAAA-MM-JJ) écrit en toutes lettres. */
const civil = (d: string) => day.format(new Date(`${d}T12:00:00Z`));

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Arrêter mon abonnement (F-184, ADR 0383, maquette du lot 74) : sans frais pendant l'essai ;
 * pendant l'année, l'arrêt prend effet à l'échéance, date limite en vue, et aucune sortie en
 * cours de période. Abonnement souscrit avant l'engagement : fin de la période payée.
 */
export default async function StopSubscriptionPage() {
  const { subscription } = await getOnboardingContext();
  if (!subscription || !["trialing", "active", "past_due"].includes(subscription.status)) {
    redirect("/pro/onboarding/formule" as Route);
  }
  const today = parisDay(new Date());
  const engaged = Boolean(subscription.engagement_version);
  const summary = subscriptionTermSummary({
    engaged,
    status: subscription.status,
    trialEnd: subscription.trial_end,
    goLiveAt: subscription.essai_demarre_le,
    stopLastDay: subscription.arret_effet_le,
    today,
  });
  const requested =
    summary.phase === "stopping" || subscription.cancel_at || subscription.cancel_at_period_end;
  const plan = cancellationPlan({
    engaged,
    firstPaymentDay: subscription.trial_end ? parisDay(subscription.trial_end) : null,
    today,
  });
  const periodEnd = subscription.current_period_end
    ? day.format(new Date(subscription.current_period_end))
    : "—";

  let body: React.ReactNode;
  let confirm = "";
  if (requested) {
    body = (
      <p className="text-label">
        {t.alreadyRequested(summary.phase === "stopping" ? civil(summary.stopLastDay) : periodEnd)}
      </p>
    );
  } else if (plan.kind === "trial") {
    const started = summary.phase === "trial" || !engaged;
    const until = summary.phase === "trial" ? civil(summary.trialLastDay) : periodEnd;
    confirm = t.renounce;
    body = (
      <>
        <div className="flex gap-3 rounded-2xl bg-success-soft p-4">
          <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
          <div className="flex flex-col gap-0.5">
            <p className="font-bold">{t.trialTitle}</p>
            <p className="text-sm text-label">{started ? t.trialText(until) : t.awaitingText}</p>
          </div>
        </div>
        <dl className="flex flex-col rounded-2xl border border-border bg-surface px-4 text-[0.9375rem]">
          {[
            [t.toPay, t.zero],
            [t.profile, started ? t.profileUntil(until) : t.profileNow],
            [t.documents, t.documentsValue],
          ].map(([dt, dd], i) => (
            <div
              key={dt}
              className={`flex justify-between gap-3 py-3 ${i > 0 ? "border-t border-border" : ""}`}
            >
              <dt className="text-label">{dt}</dt>
              <dd className="text-right font-semibold">{dd}</dd>
            </div>
          ))}
        </dl>
      </>
    );
  } else if (plan.kind === "renewal" && summary.phase === "engaged") {
    confirm = t.confirm(civil(plan.lastDay));
    body = (
      <>
        <p className="text-label">{t.yearIntro(civil(summary.termLastDay))}</p>
        <div className="flex flex-col gap-1 rounded-2xl border-2 border-primary bg-surface p-4">
          <p className="flex items-baseline justify-between gap-3">
            <b>{plan.late ? t.atNextRenewal : t.atRenewal}</b>
            <b className="whitespace-nowrap text-success">{t.noFee}</b>
          </p>
          <p className="text-sm text-label">
            {plan.late
              ? t.lateText(civil(plan.lastDay))
              : t.atRenewalText(civil(plan.lastDay), civil(summary.cancelDeadline))}
          </p>
        </div>
        <div className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
          <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="flex flex-col gap-0.5">
            <p className="font-bold">{t.noExitTitle(civil(summary.termLastDay))}</p>
            <p className="text-sm text-label">{t.noExitText}</p>
          </div>
        </div>
      </>
    );
  } else {
    confirm = t.confirm(periodEnd);
    body = <p className="text-label">{t.periodEndText(periodEnd)}</p>;
  }

  return (
    <Card className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <Link
        href={"/pro/onboarding/formule" as Route}
        className={`inline-flex items-center gap-2 self-start rounded-sm text-sm font-semibold text-label ${focusRing}`}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t.back}
      </Link>
      <h1 className="font-display text-[1.75rem] leading-tight font-bold tracking-tight">
        {t.title}
      </h1>
      {body}
      {!requested && <StopForm confirmLabel={confirm} />}
    </Card>
  );
}
