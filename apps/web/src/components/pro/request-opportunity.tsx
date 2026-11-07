import type { RequestDetail } from "@menao/validation";
import { OpportunityActions } from "@/app/pro/(espace)/demandes/[id]/opportunity-actions";
import { fr } from "@/i18n/fr";
import type { AppointmentAgenda } from "@/lib/artisan/agenda";
import { formatDay } from "@/lib/format";
import { ExampleLock } from "./examples";
import { ExpertiseButton } from "./expertise-button";
import { FakeClientReport } from "./fake-client-report";
import { PartnerRecommendations, type PartnerOption } from "./partner-recommendations";
import {
  RequestBrief,
  RequestClientCard,
  RequestClientWords,
  RequestDetails,
} from "./request-blocks";
import { Countdown, SheetChip, SheetColumns, SheetHeader, SheetPage, SheetSection } from "./sheet";

const t = fr.pro.onboarding.requests;

export type ClientReputation = {
  ratings: number;
  welcome: number;
  clarity: number;
  payment: number;
};

/**
 * Opportunité (F-17), refonte « Nette » (ADR 0246) : en-tête à grand titre et compte à rebours,
 * bandeau de décision (fixer un rendez-vous ou refuser), puis la demande en bref, ce que dit le
 * client et les détails ; à droite le client, l'expertise et le signalement. Sur téléphone, les
 * boutons restent en bas de l'écran. Exemple (ADR 0184) : mêmes blocs, actions inactives.
 */
export function RequestOpportunityView({
  r,
  photoUrls,
  left,
  open,
  minDate,
  trades,
  agenda,
  proposedSlots = null,
  clientReputation,
  partners,
  base = "/pro",
  example = false,
}: {
  r: RequestDetail;
  photoUrls: string[];
  left: { hours: number; minutes: number } | null;
  open: boolean;
  minDate: string;
  trades: readonly { code: string; label: string }[];
  agenda?: AppointmentAgenda;
  /** Créneaux proposés en attente du choix du client (ADR 0222). */
  proposedSlots?: readonly string[] | null;
  clientReputation: ClientReputation | null;
  partners: readonly PartnerOption[];
  base?: string;
  example?: boolean;
}) {
  const st = fr.pro.sheet;
  const place = [r.code_postal, r.ville_nom].filter(Boolean).join(" ");
  const statusTone =
    r.status === "envoyee" ? "primary" : r.status === "acceptee" ? "success" : "neutral";
  return (
    <SheetPage>
      <SheetHeader
        backHref={`${base}/demandes`}
        backLabel={t.backToList}
        chips={
          <>
            {r.trade && <SheetChip tone="neutral">{r.trade}</SheetChip>}
            <SheetChip tone={statusTone} dot>
              {t.status[r.status]}
            </SheetChip>
            {r.urgence && (
              <SheetChip tone="danger" dot>
                {t.urgent}
              </SheetChip>
            )}
          </>
        }
        title={r.summary || r.trade || t.title}
        meta={[r.client.first_name, place, st.received(formatDay(r.created_at))]
          .filter(Boolean)
          .join(" · ")}
        aside={left && <Countdown hours={left.hours} minutes={left.minutes} urgent={r.urgence} />}
      />

      {open && (
        // Un seul jeu de boutons : bandeau bleu nuit sous l'en-tête en grand écran, barre collée
        // en bas de l'écran sur téléphone (ordre des blocs inversé par `order-last`).
        <div className="sticky bottom-0 z-20 order-last -mx-4 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:order-none lg:mx-0 lg:flex lg:items-center lg:justify-between lg:gap-6 lg:rounded-card lg:border-0 lg:bg-foreground lg:px-6 lg:py-5 lg:text-surface lg:backdrop-blur-none">
          <div className="hidden flex-col gap-0.5 lg:flex">
            <span className="text-base font-semibold">{st.waiting(r.client.first_name)}</span>
            <span className="text-sm text-surface/75">{st.waitingHint}</span>
          </div>
          <div className="flex flex-col gap-2 lg:shrink-0">
            <ExampleLock locked={example} note>
              <OpportunityActions
                requestId={r.id}
                clientFirstName={r.client.first_name}
                minDate={minDate}
                canRefuse={r.status === "envoyee"}
                partnersAfterRefusal={partners.some((p) => p.sameProject)}
                agenda={agenda}
                proposedSlots={proposedSlots}
                layout="bar"
              />
            </ExampleLock>
          </div>
        </div>
      )}

      <div className="pb-6 lg:pb-0">
        <SheetColumns
          main={
            <>
              <RequestBrief detail={r} />
              <RequestClientWords detail={r} photoUrls={photoUrls} />
              <RequestDetails detail={r} />
              {clientReputation && (
                <SheetSection id="client-reputation" title={fr.pro.clientRating.reputationTitle}>
                  <p className="text-sm text-muted-foreground">
                    {fr.pro.clientRating.reputation(clientReputation.ratings)}
                  </p>
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(["welcome", "clarity", "payment"] as const).map((key) => (
                      <div key={key} className="flex flex-col gap-0.5">
                        <dt className="text-[0.8125rem] text-muted-foreground">
                          {fr.pro.clientRating.criteria[key]}
                        </dt>
                        <dd className="font-display text-[1.375rem] font-bold tabular-nums">
                          {fr.review.percent(clientReputation[key])}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </SheetSection>
              )}
              {partners.length > 0 && (
                <PartnerRecommendations
                  requestId={r.id}
                  clientFirstName={r.client.first_name ?? fr.pro.partners.client}
                  options={[...partners]}
                />
              )}
            </>
          }
          aside={
            <>
              <RequestClientCard detail={r} />
              {open && (
                <ExampleLock locked={example}>
                  <ExpertiseButton requestId={r.id} trades={trades} variant="card" />
                </ExampleLock>
              )}
              <ExampleLock locked={example}>
                <FakeClientReport requestId={r.id} />
              </ExampleLock>
            </>
          }
        />
      </div>
    </SheetPage>
  );
}
