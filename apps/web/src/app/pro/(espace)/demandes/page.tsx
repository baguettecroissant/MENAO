import { exampleInbox, teamCan } from "@menao/core";
import type { Metadata } from "next";
import { fr } from "@/i18n/fr";
import { artisanActivity, requireTeamPermission, spaceExamples } from "@/lib/artisan/space";
import { EXAMPLES_BASE } from "@/lib/artisan/examples";
import { planUsage } from "@/lib/artisan/plan-limits";
import { EmptyState } from "@/components/empty-state";
import { SpaceExamplesNotice } from "@/components/pro/examples";
import { PlanLimitBanner } from "@/components/pro/plan-limit-banner";
import { RequestsTabs } from "@/components/pro/requests-tabs";
import { RequestsView } from "@/components/pro/requests-view";

const t = fr.pro.onboarding.requests;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Demandes reçues (F-16, F-17), refonte « Nette » (ADR 0248) : chiffres clés, demandes à traiter
 * puis déjà traitées. Tant que l'artisan n'a rien reçu : demandes d'exemple (ADR 0184).
 */
export default async function ArtisanRequestsPage() {
  const { supabase, teamPosition } = await requireTeamPermission("requests");
  const [{ inbox: rows }, examples, { data: response }, usage] = await Promise.all([
    artisanActivity(),
    spaceExamples(),
    supabase.rpc("my_response_stats"),
    // Demandes du mois face à la limite de la formule (ADR 0290).
    planUsage(supabase),
  ]);
  const now = new Date();
  const paths = rows.map((r) => r.photo_path).filter((p): p is string => Boolean(p));
  const { data: signed } = paths.length
    ? await supabase.storage.from("project-photos").createSignedUrls(paths, 3600)
    : { data: [] };
  const photo = (path: string | null) =>
    path ? (signed?.find((s) => s.path === path)?.signedUrl ?? null) : null;

  return (
    <RequestsView
      rows={
        examples
          ? exampleInbox(now).map((r) => ({ ...r, thumbUrl: null }))
          : rows.map((r) => ({ ...r, thumbUrl: photo(r.photo_path) }))
      }
      now={now}
      responseMinutes={examples ? null : (response?.[0]?.minutes ?? null)}
      base={examples ? EXAMPLES_BASE : undefined}
      example={examples}
      notice={
        examples ? (
          <SpaceExamplesNotice />
        ) : teamPosition === "patron" ? (
          <PlanLimitBanner usage={usage} />
        ) : undefined
      }
      // Appels d'offres (ADR 0287) : pour qui gère l'argent (patron, chef d'équipe).
      tabs={teamCan(teamPosition, "money") ? <RequestsTabs current="demandes" /> : undefined}
      empty={
        !examples && rows.length === 0 ? (
          <EmptyState illustration="demandes">{t.empty}</EmptyState>
        ) : undefined
      }
    />
  );
}
