import { parisToday, timeLeft } from "@menao/core";
import { Clock } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { DetailHeader, StickyActions } from "@/components/pro/detail";
import { ExpertiseButton } from "@/components/pro/expertise-button";
import { RequestBlocks } from "@/components/pro/request-blocks";
import { StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
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

  const [{ data: signed }, { data: trades }] = await Promise.all([
    r.photos.length
      ? supabase.storage.from("project-photos").createSignedUrls(r.photos, 3600)
      : Promise.resolve({ data: [] }),
    supabase.from("trades").select("code, label").eq("active", true).order("sort_order"),
  ]);
  const left = r.status === "envoyee" ? timeLeft(new Date(r.expires_at), new Date()) : null;
  // En attente de réponse, ou acceptée avant la phase 3 sans rendez-vous (ADR 0016).
  const open = (r.status === "envoyee" && left !== null) || r.status === "acceptee";

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
        {!open && (
          <div>
            <StatusBadge tone="neutral">{t.status[r.status]}</StatusBadge>
          </div>
        )}
      </div>

      {open && (
        <StickyActions>
          <OpportunityActions
            requestId={r.id}
            clientFirstName={r.client.first_name}
            minDate={parisToday()}
            canRefuse={r.status === "envoyee"}
          />
        </StickyActions>
      )}
    </main>
  );
}
