import {
  ANNUAL_FREE_MONTHS,
  ENGAGEMENT_GUARANTEE,
  ENGAGEMENT_MONTHS,
  annualPriceCents,
  firstPaymentDate,
  monthlyEquivalentCents,
  parseAiAgents,
  parseClientReminders,
} from "@menao/core";
import { CalendarDays, Check, Repeat, ShieldCheck } from "lucide-react";
import {
  AiAgentsCard,
  RecentCallsCard,
  SecretaryLinkCard,
  VoiceMinutesCard,
} from "@/components/pro/ai-agents-card";
import { ClientRemindersCard } from "@/components/pro/client-reminders-card";
import { Alert, ButtonLink, Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { ChoosePlan, ManageSubscription } from "./plan-forms";

const t = fr.pro.onboarding.plans;
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });
const euros = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/**
 * Étape 7 — formule et abonnement (Stripe Billing, web uniquement) : au mois sans engagement ou à
 * l'année payée d'avance (ADR 0200), engagement et date du premier paiement affichés avant de payer.
 */
export default async function PlanStepPage({ searchParams }: PageProps<"/pro/onboarding/formule">) {
  const params = await searchParams;
  const { supabase, artisan, subscription, snapshot } = await getOnboardingContext();
  const { data: plans } = await supabase
    .from("plans")
    .select("code, nom, prix_mensuel_ht_centimes, avantages, ouverte, recommandee")
    .order("ordre");

  if (artisan.status !== "valide") {
    return (
      <Card>
        <p>{t.notValidated}</p>
      </Card>
    );
  }

  if (subscription) {
    const plan = plans?.find((p) => p.code === subscription.plan_code);
    const { data: agents } = await supabase.rpc("my_ai_agents");
    const agentsState = parseAiAgents(agents);
    // Recharges de minutes (ADR 0233) : offre et prochaine échéance.
    const { data: topUps } = agentsState.agents.topUps
      ? await supabase.rpc("my_voice_topups")
      : { data: null };
    const topUpData = (topUps ?? null) as {
      prochaine_echeance?: string | null;
      offres?: {
        code: string;
        minutes: number;
        prix_ht_centimes: number;
        validite_mois: number;
      }[];
    } | null;
    const firstOffer = topUpData?.offres?.[0];
    // Rappels aux clients par SMS (ADR 0239), si inclus.
    const { data: reminders } =
      agentsState.agents.reminders !== "non"
        ? await supabase.rpc("my_client_reminders")
        : { data: null };
    const remindersState = reminders ? parseClientReminders(reminders) : null;
    const status = subscription.status as keyof typeof t.status;
    const label =
      status === "trialing"
        ? t.status.trialing(
            subscription.trial_end ? day.format(new Date(subscription.trial_end)) : "—",
          )
        : status === "active"
          ? t.status.active(
              subscription.current_period_end
                ? day.format(new Date(subscription.current_period_end))
                : "—",
            )
          : t.status[status];
    const healthy = snapshot.subscriptionActive && status !== "past_due";
    const monthlyCents = plan?.prix_mensuel_ht_centimes ?? null;
    // Refonte « Nette » (lot 46, ADR 0315) : la formule et ses agents à gauche, les minutes de
    // voix, les derniers appels et la secrétaire à droite.
    return (
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23.75rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <section aria-labelledby="abonnement" className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <span
                    aria-hidden="true"
                    className="text-[0.8125rem] font-semibold tracking-[0.04em] text-muted-foreground uppercase"
                  >
                    {t.current}
                  </span>
                  <h2
                    id="abonnement"
                    className="font-display text-[1.875rem] leading-none font-bold tracking-tight"
                  >
                    <span className="sr-only">{t.current} : </span>
                    {plan?.nom ?? "—"}
                  </h2>
                </div>
                <StatusBadge tone={healthy ? "success" : "danger"}>
                  {t.statusShort[status] ?? t.statusShort.other}
                </StatusBadge>
              </div>
              <dl className="flex flex-col text-[0.90625rem]">
                <div className="flex justify-between gap-3 border-t border-border py-2.5">
                  <dt className="text-muted-foreground">{t.statusRow}</dt>
                  <dd
                    role="status"
                    className={`text-right font-semibold ${healthy ? "" : "text-danger"}`}
                  >
                    {label}
                  </dd>
                </div>
                {monthlyCents !== null && (
                  <div className="flex justify-between gap-3 border-t border-border py-2.5">
                    <dt className="text-muted-foreground">{t.paymentRow}</dt>
                    <dd className="text-right font-semibold">
                      {subscription.periodicite === "annuel"
                        ? t.paymentYearly(euros.format(annualPriceCents(monthlyCents) / 100))
                        : t.paymentMonthly(euros.format(monthlyCents / 100))}
                    </dd>
                  </div>
                )}
              </dl>
              {subscription.periodicite === "annuel" &&
                (status === "trialing" && subscription.trial_end ? (
                  <p className="text-sm text-muted-foreground">
                    {t.yearlyTrial(day.format(new Date(subscription.trial_end)))}
                  </p>
                ) : status === "active" &&
                  subscription.current_period_end &&
                  !subscription.cancel_at_period_end ? (
                  <p className="text-sm text-muted-foreground">
                    {t.yearlyActive(day.format(new Date(subscription.current_period_end)))}
                  </p>
                ) : null)}
              {subscription.cancel_at_period_end && subscription.current_period_end && (
                <p className="text-sm text-muted-foreground">
                  {t.cancelAtPeriodEnd(day.format(new Date(subscription.current_period_end)))}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <ManageSubscription />
                <p className="min-w-0 flex-1 text-[0.8125rem] text-muted-foreground">
                  {t.manageHint}
                </p>
              </div>
            </section>
          </Card>
          <AiAgentsCard
            state={agentsState}
            planName={snapshot.subscriptionActive ? (plan?.nom ?? null) : null}
          />
          {remindersState?.included && <ClientRemindersCard state={remindersState} />}
        </div>
        <div className="flex flex-col gap-4">
          <VoiceMinutesCard
            state={agentsState}
            topUp={
              topUpData
                ? {
                    offer: firstOffer
                      ? {
                          code: firstOffer.code,
                          minutes: firstOffer.minutes,
                          priceCents: firstOffer.prix_ht_centimes,
                          months: firstOffer.validite_mois,
                        }
                      : null,
                    nextExpiry: topUpData.prochaine_echeance ?? null,
                  }
                : null
            }
            topUpDone={params.recharge === "ok"}
          />
          <RecentCallsCard state={agentsState} />
          {/* Secrétaire dédiée : sa propre rubrique dans le menu (ADR 0244). */}
          {agentsState.agents.secretary && <SecretaryLinkCard />}
        </div>
      </div>
    );
  }

  const firstPayment = day.format(firstPaymentDate());
  return (
    <div className="flex flex-col gap-6">
      {params.paiement === "ok" && <Alert tone="success">{t.processing}</Alert>}
      <p className="max-w-3xl text-label">{t.intro(firstPayment)}</p>
      {/* Refonte « Nette » (ADR 0254) : cartes de formule, la recommandée bordée de bleu nuit. */}
      <ul className="grid gap-5 pt-2 md:grid-cols-3">
        {(plans ?? []).map((plan) => (
          <li key={plan.code}>
            <section
              aria-labelledby={`plan-${plan.code}`}
              className={`relative flex h-full flex-col gap-4 rounded-card bg-surface p-6 shadow-card ${
                plan.recommandee ? "border-2 border-foreground" : "border border-border"
              }`}
            >
              {/* Formule mise en avant (ADR 0200). */}
              {plan.recommandee && (
                <span className="absolute -top-3 left-5 rounded-chip bg-foreground px-2.5 py-1 text-xs font-bold text-white">
                  {t.recommended}
                </span>
              )}
              <h2 id={`plan-${plan.code}`} className="text-[1.375rem]">
                {plan.nom}
              </h2>
              <p className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="font-display text-[2.5rem] leading-none font-bold tracking-tight">
                  {t.priceHt(euros.format(plan.prix_mensuel_ht_centimes / 100))}
                </span>
                <span className="text-sm text-muted-foreground">{t.perMonth}</span>
              </p>
              <p className="-mt-2 text-sm text-muted-foreground">
                {t.yearlyAlt(
                  euros.format(annualPriceCents(plan.prix_mensuel_ht_centimes) / 100),
                  euros.format(
                    monthlyEquivalentCents(annualPriceCents(plan.prix_mensuel_ht_centimes)) / 100,
                  ),
                )}
              </p>
              {plan.ouverte && (
                <span className="self-start rounded-chip bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
                  {t.trialBadge}
                </span>
              )}
              <ul className="flex grow flex-col gap-2.5 border-t border-border pt-4 text-sm text-label">
                {(Array.isArray(plan.avantages) ? plan.avantages : []).map((a) => (
                  <li key={String(a)} className="flex gap-2.5">
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                    {String(a)}
                  </li>
                ))}
              </ul>
              {plan.ouverte ? (
                <ChoosePlan code={plan.code} nom={plan.nom} />
              ) : (
                <p className="text-center text-muted-foreground">{t.soon}</p>
              )}
            </section>
          </li>
        ))}
      </ul>
      <ul className="flex flex-col gap-2 text-sm text-label">
        <li className="flex gap-2.5">
          <CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t.monthlyNote}
        </li>
        <li className="flex gap-2.5">
          <Repeat aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t.yearlyNote(ENGAGEMENT_MONTHS, ANNUAL_FREE_MONTHS, firstPayment)}
        </li>
        <li className="flex gap-2.5">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t.guaranteeNote(
            ENGAGEMENT_GUARANTEE.minRequests,
            ENGAGEMENT_GUARANTEE.consecutiveMonths,
          )}
        </li>
      </ul>
      <p className="text-sm text-muted-foreground">{t.vatNote}</p>
    </div>
  );
}
