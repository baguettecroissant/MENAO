import { parisToday } from "@menao/core";
import { parseMyLaunchPlan } from "@menao/validation";
import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { LaunchBoard } from "@/components/launch/launch-board";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getCommercialSpace } from "@/lib/commercial/space";
import { parseLaunchView } from "@/lib/launch/board";

const t = fr.commercialLaunch;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * « Mon planning » des commerciaux (F-66, ADR 0208) : leur tableau de lancement (my_launch_plan),
 * avec leurs tâches à cocher et, en lecture, les dates clés et tâches partagées avec toute
 * l'équipe. Rien d'interne : ni objectif, ni autres membres.
 */
export default async function CommercialPlanningPage({
  searchParams,
}: PageProps<"/commercial/planning">) {
  const space = await getCommercialSpace();
  const view = parseLaunchView((await searchParams).vue);
  const response = space.active ? await space.supabase.rpc("my_launch_plan") : null;
  const plan = response && !response.error ? parseMyLaunchPlan(response.data) : null;

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.intro}</p>
        </div>

        {!space.commercial ? (
          <Alert tone="info">{fr.commercialSpace.missing}</Alert>
        ) : !space.active ? (
          <Alert tone="error">{fr.commercialSpace.suspended}</Alert>
        ) : !plan ? (
          <Alert tone="error">{fr.commercialProspects.errors.unavailable}</Alert>
        ) : !plan.member ? (
          <EmptyState illustration="agenda" title={t.notReady}>
            {t.notReadyText}
          </EmptyState>
        ) : (
          <LaunchBoard
            member={plan.member}
            tasks={plan.tasks}
            today={parisToday()}
            view={view}
            path="/commercial/planning"
          />
        )}
      </div>
    </main>
  );
}
