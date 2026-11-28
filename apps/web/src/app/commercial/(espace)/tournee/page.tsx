import { partnerLinks, tourSummary, type TourOutcome } from "@menao/core";
import { ChevronRight } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { TourPlanner, type TourStart } from "@/components/commercial/field/tour-planner";
import { TourStopView } from "@/components/commercial/field/tour-stop";
import { Alert } from "@/components/ui";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { getCommercialSpace } from "@/lib/commercial/space";
import { getTour } from "@/lib/commercial/tour";
import { formatDay } from "@/lib/format";

const t = fr.commercialField.tour;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * « Ma tournée » (F-194, lot 83, ADR 0394) : la tournée en cours, arrêt par arrêt ; sinon, la
 * préparation d'une nouvelle tournée et les dernières tournées (vers leur bilan).
 */
export default async function CommercialTourPage() {
  const space = await getCommercialSpace("/commercial/tournee");
  const link = space.commercial
    ? partnerLinks(env.NEXT_PUBLIC_SITE_URL, space.commercial.code).pros
    : null;

  if (!space.commercial || !space.active) {
    return (
      <main className="bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
          <Alert tone={space.commercial ? "error" : "info"}>
            {space.commercial ? fr.commercialSpace.suspended : fr.commercialSpace.missing}
          </Alert>
        </div>
      </main>
    );
  }

  const { data: current } = await space.supabase
    .from("commercial_tours")
    .select("id")
    .eq("status", "en_cours")
    .maybeSingle();
  const tour = current ? await getTour(space.supabase, current.id) : null;
  if (tour) {
    return (
      <main className="bg-background">
        <div className="px-4 py-5 sm:px-6 sm:py-8">
          <TourStopView tour={tour} link={link} />
        </div>
      </main>
    );
  }

  const [{ data: starts }, { data: recent }] = await Promise.all([
    space.supabase.rpc("commercial_tour_starts"),
    space.supabase
      .from("commercial_tours")
      .select("id, created_at, commercial_tour_stops(outcome)")
      .eq("status", "terminee")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  const startList: TourStart[] = (starts ?? [])
    .filter((s) => typeof s.lat === "number" && typeof s.lng === "number")
    .map((s) => ({ commune: s.commune, lat: s.lat, lng: s.lng, prospects: s.prospects }))
    .sort((a, b) => a.commune.localeCompare(b.commune, "fr"));

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex max-w-3xl flex-col gap-2">
          <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
            {t.title}
          </h1>
          <p className="text-[0.9375rem] text-label sm:text-base">{t.intro}</p>
        </div>
        <TourPlanner starts={startList} />
        {recent && recent.length > 0 && (
          <section aria-labelledby="dernieres-tournees" className="flex flex-col gap-3">
            <h2 id="dernieres-tournees" className="text-lg">
              {t.recent}
            </h2>
            <ul className="overflow-hidden rounded-card border border-border bg-surface">
              {recent.map((r) => {
                const outcomes = (r.commercial_tour_stops ?? []).map(
                  (s) => s.outcome as TourOutcome | null,
                );
                const sum = tourSummary(outcomes);
                return (
                  <li key={r.id} className="border-t border-border first:border-t-0">
                    <Link
                      href={`/commercial/tournee/${r.id}` as Route}
                      className="flex min-h-14 items-center gap-3 px-4 py-3 text-sm hover:bg-background"
                    >
                      <span className="flex-1">
                        {t.recentRow(formatDay(r.created_at), sum.stops, sum.interested)}
                      </span>
                      <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
