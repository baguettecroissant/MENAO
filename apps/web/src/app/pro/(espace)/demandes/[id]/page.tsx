import { parisToday, timeLeft } from "@menao/core";
import { Clock } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { DetailHeader, StickyActions } from "@/components/pro/detail";
import { ExpertiseButton } from "@/components/pro/expertise-button";
import { FakeClientReport } from "@/components/pro/fake-client-report";
import { RequestBlocks } from "@/components/pro/request-blocks";
import { StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { appointmentAgenda } from "@/lib/artisan/agenda";
import { getRequestDetail } from "@/lib/artisan/requests";
import { requireProSpace } from "@/lib/artisan/space";
import { OpportunityActions } from "./opportunity-actions";

const t = fr.pro.onboarding.requests;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Opportunité (F-17), maquette « Vue d'une opportunité » : fixer un rendez-vous ou refuser.
 * Une fois le rendez-vous fixé, la demande s'ouvre sur la vue du chantier (F-18).
 */
export default async function ArtisanRequestPage({ params }: PageProps<"/pro/demandes/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireProSpace();
  const r = await getRequestDetail(supabase, id);
  if (!r) notFound();
  if (r.chantier_id) redirect(`/pro/chantiers/${r.chantier_id}` as Route);

  const left = r.status === "envoyee" ? timeLeft(new Date(r.expires_at), new Date()) : null;
  // En attente de réponse, ou acceptée avant la phase 3 sans rendez-vous (ADR 0016).
  const open = (r.status === "envoyee" && left !== null) || r.status === "acceptee";
  const [{ data: signed }, { data: trades }, agenda, { data: reputation }] = await Promise.all([
    r.photos.length
      ? supabase.storage.from("project-photos").createSignedUrls(r.photos, 3600)
      : Promise.resolve({ data: [] }),
    supabase.from("trades").select("code, label").eq("active", true).order("sort_order"),
    // F-44 : créneaux libres et avertissements du tiroir « Fixer un rendez-vous ».
    open ? appointmentAgenda() : undefined,
    // F-23 : moyenne des notes du client par les artisans, si l'équipe l'a rendue visible.
    supabase.rpc("client_reputation", { p_request_id: r.id }),
  ]);
  const clientReputation = reputation?.[0] ?? null;

  return (
    <main className="flex flex-1 flex-col">
      <DetailHeader
        backHref="/pro/demandes"
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
      {open && <ExpertiseButton requestId={r.id} trades={trades ?? []} />}

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-4 py-5 sm:px-6 sm:py-6">
        <RequestBlocks
          detail={r}
          photoUrls={(signed ?? []).flatMap((p) => (p.signedUrl ? [p.signedUrl] : []))}
          variant="opportunite"
        />
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
        {!open && (
          <div>
            <StatusBadge tone="neutral">{t.status[r.status]}</StatusBadge>
          </div>
        )}
        <FakeClientReport requestId={r.id} />
      </div>

      {open && (
        <StickyActions>
          <OpportunityActions
            requestId={r.id}
            clientFirstName={r.client.first_name}
            minDate={parisToday()}
            canRefuse={r.status === "envoyee"}
            agenda={agenda}
          />
        </StickyActions>
      )}
    </main>
  );
}
