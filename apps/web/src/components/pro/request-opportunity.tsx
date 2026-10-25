import { Clock } from "lucide-react";
import type { RequestDetail } from "@menao/validation";
import { OpportunityActions } from "@/app/pro/(espace)/demandes/[id]/opportunity-actions";
import { StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { AppointmentAgenda } from "@/lib/artisan/agenda";
import { DetailHeader, StickyActions } from "./detail";
import { ExampleLock } from "./examples";
import { ExpertiseButton } from "./expertise-button";
import { FakeClientReport } from "./fake-client-report";
import { PartnerRecommendations, type PartnerOption } from "./partner-recommendations";
import { RequestBlocks } from "./request-blocks";

const t = fr.pro.onboarding.requests;

export type ClientReputation = {
  ratings: number;
  welcome: number;
  clarity: number;
  payment: number;
};

/**
 * Opportunité (F-17), maquette « Vue d'une opportunité » : fixer un rendez-vous ou refuser.
 * Exemple (ADR 0184) : mêmes blocs, actions inactives, retour vers la liste des exemples (`base`).
 */
export function RequestOpportunityView({
  r,
  photoUrls,
  left,
  open,
  minDate,
  trades,
  agenda,
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
  clientReputation: ClientReputation | null;
  partners: readonly PartnerOption[];
  base?: string;
  example?: boolean;
}) {
  return (
    <main className="flex flex-1 flex-col">
      <DetailHeader
        backHref={`${base}/demandes`}
        backLabel={t.backToList}
        title={r.summary || r.trade || t.title}
      >
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-pill bg-white/15 px-3 py-1">{t.status[r.status]}</span>
          {r.urgence && (
            <span className="rounded-pill bg-white px-3 py-1 font-medium text-danger">
              {t.urgent}
            </span>
          )}
          {left && (
            <span className="inline-flex items-center gap-1.5 text-white/85">
              <Clock aria-hidden="true" className="size-4" />
              {t.timeLeft(left.hours, left.minutes)}
            </span>
          )}
        </div>
      </DetailHeader>
      {open && (
        <ExampleLock locked={example}>
          <ExpertiseButton requestId={r.id} trades={trades} />
        </ExampleLock>
      )}

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-4 py-5 sm:px-6 sm:py-6">
        <RequestBlocks detail={r} photoUrls={photoUrls} variant="opportunite" />
        {clientReputation && (
          <section
            aria-labelledby="client-reputation"
            className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
          >
            <h2 id="client-reputation" className="font-medium">
              {fr.pro.clientRating.reputationTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              {fr.pro.clientRating.reputation(clientReputation.ratings)}
            </p>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
              {(["welcome", "clarity", "payment"] as const).map((key) => (
                <div key={key} className="rounded-input bg-background px-3 py-2">
                  <dt className="text-muted-foreground">{fr.pro.clientRating.criteria[key]}</dt>
                  <dd className="font-medium tabular-nums">
                    {fr.review.percent(clientReputation[key])}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        {partners.length > 0 && (
          <PartnerRecommendations
            requestId={r.id}
            clientFirstName={r.client.first_name ?? fr.pro.partners.client}
            options={[...partners]}
          />
        )}
        {!open && (
          <div>
            <StatusBadge tone="neutral">{t.status[r.status]}</StatusBadge>
          </div>
        )}
        <ExampleLock locked={example}>
          <FakeClientReport requestId={r.id} />
        </ExampleLock>
      </div>

      {open && (
        <StickyActions>
          <ExampleLock locked={example} note>
            <OpportunityActions
              requestId={r.id}
              clientFirstName={r.client.first_name}
              minDate={minDate}
              canRefuse={r.status === "envoyee"}
              partnersAfterRefusal={partners.some((p) => p.sameProject)}
              agenda={agenda}
            />
          </ExampleLock>
        </StickyActions>
      )}
    </main>
  );
}
