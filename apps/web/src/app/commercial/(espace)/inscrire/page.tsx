import { ShieldCheck, Video } from "lucide-react";
import type { Metadata } from "next";
import { z } from "zod";
import { PrepareSignupWizard } from "@/components/commercial/field/prepare-signup";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getCommercialSpace } from "@/lib/commercial/space";
import { baseTradesLimit } from "@/lib/artisan/plan-limits";
import { createPublicClient } from "@/lib/supabase/public";

const t = fr.commercialField.prepare;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * « Inscrire un artisan » (F-195, lot 84, ADR 0395) : le conseiller prépare, l'artisan finit
 * lui-même avec son lien. Depuis un prospect (`?prospect=`), la recherche part de son SIRET.
 */
export default async function PrepareSignupPage({
  searchParams,
}: PageProps<"/commercial/inscrire">) {
  const { prospect } = await searchParams;
  const space = await getCommercialSpace("/commercial/inscrire");
  const prospectId =
    typeof prospect === "string" && z.uuid().safeParse(prospect).success ? prospect : null;
  const [{ data: trades }, { data: found }, { data: base }] = await Promise.all([
    createPublicClient()
      .from("trades")
      .select("code, label")
      .eq("active", true)
      .order("sort_order"),
    prospectId && space.active
      ? space.supabase.rpc("commercial_prospect", { p_id: prospectId })
      : Promise.resolve({ data: null }),
    // Métiers au plus avec la formule de Base (ADR 0290), comme dans le parcours de l'artisan.
    createPublicClient().from("plans").select("limites").eq("code", "base").maybeSingle(),
  ]);
  const initialQuery = found?.[0]?.siret ?? "";
  const advisor = space.account.firstName ?? space.commercial?.nom ?? "votre conseiller";

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex max-w-3xl flex-col gap-2">
          <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
            {t.title}
          </h1>
          <p className="text-[0.9375rem] text-label sm:text-base">{t.intro}</p>
        </div>
        {!space.commercial ? (
          <Alert tone="info">{fr.commercialSpace.missing}</Alert>
        ) : !space.active ? (
          <Alert tone="error">{fr.commercialSpace.suspended}</Alert>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0 rounded-card border border-border bg-surface p-4 sm:p-6">
              <PrepareSignupWizard
                trades={trades ?? []}
                advisor={advisor}
                initialQuery={initialQuery}
                maxTrades={baseTradesLimit(base?.limites)}
              />
            </div>
            <aside className="flex flex-col gap-4">
              <section className="flex flex-col gap-3 rounded-card bg-foreground p-5 text-surface">
                <h2 className="flex items-center gap-2 font-semibold">
                  <Video aria-hidden="true" className="size-4" />
                  {t.remoteRulesTitle}
                </h2>
                <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm opacity-90">
                  {t.remoteRules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </section>
              <p className="flex items-start gap-2.5 rounded-card border border-border bg-surface p-4 text-sm text-label">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {t.legalNote}
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
