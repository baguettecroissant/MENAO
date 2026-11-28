import { tourSummary } from "@menao/core";
import { DoorClosed, Euro, Map as MapIcon, Phone, QrCode } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { TourMap } from "@/components/commercial/field/tour-map";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getCommercialSpace } from "@/lib/commercial/space";
import { getTour } from "@/lib/commercial/tour";
import { formatDayFull, formatTime } from "@/lib/format";

const t = fr.commercialField.summary;
const euros = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

export const metadata: Metadata = {
  title: `${fr.commercialField.tour.title} — MENAO`,
  robots: { index: false },
};

/**
 * Bilan d'une tournée (F-194, ADR 0394) : arrêts, vus, intéressés, inscriptions avec le code pendant
 * la tournée, primes en jeu et ce qui est déjà rangé. Pour le conseiller seul : pas un rapport.
 */
export default async function TourSummaryPage({ params }: PageProps<"/commercial/tournee/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const space = await getCommercialSpace(`/commercial/tournee/${id}`);
  const tour = space.active ? await getTour(space.supabase, id) : null;
  if (!tour) notFound();
  if (tour.status === "en_cours") redirect("/commercial/tournee" as Route);

  const sum = tourSummary(tour.stops.map((s) => s.outcome));
  const prime = tour.prime_validation_centimes ?? 0;
  const funnel = [
    { label: t.funnel.stops, value: sum.stops, tone: "bg-foreground" },
    { label: t.funnel.seen, value: sum.seen, tone: "bg-primary" },
    { label: t.funnel.interested, value: sum.interested, tone: "bg-success" },
    { label: t.funnel.signups, value: tour.inscriptions, tone: "bg-success" },
  ];
  const max = Math.max(1, sum.stops);
  const callBacks = tour.stops.filter((s) => s.outcome === "a_rappeler").map((s) => s.nom);
  const points = tour.stops
    .filter((s) => s.lat !== null && s.lng !== null)
    .map((s) => ({ lat: s.lat as number, lng: s.lng as number }));

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-6 sm:py-10">
        <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
          {t.when(formatDayFull(tour.created_at))}
          {tour.ended_at ? ` · ${formatTime(tour.created_at)} – ${formatTime(tour.ended_at)}` : ""}
        </p>
        <h1 className="text-[1.875rem] leading-tight font-medium tracking-tight">
          {t.title(space.account.firstName)}
        </h1>
        <section
          aria-label={t.funnelLabel}
          className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-4"
        >
          {funnel.map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="w-28 text-sm text-label">{row.label}</span>
              <span className="h-6 flex-1 overflow-hidden rounded-input bg-border/60">
                <span
                  className={`flex h-full min-w-7 items-center justify-end rounded-input pr-2 text-xs font-bold text-white ${row.tone}`}
                  style={{ width: `${(row.value / max) * 100}%` }}
                >
                  {row.value}
                </span>
              </span>
            </div>
          ))}
        </section>
        {tour.inscriptions > 0 && prime > 0 && (
          <section className="flex items-center gap-3.5 rounded-card bg-foreground p-4 text-surface">
            <span className="flex size-11 items-center justify-center rounded-input bg-[#7ee2b0]/20 text-[#7ee2b0]">
              <Euro aria-hidden="true" className="size-5" />
            </span>
            <span className="flex flex-col">
              <span className="text-lg font-semibold">
                {t.atStake(euros(tour.inscriptions * prime))}
              </span>
              <span className="text-[0.8125rem] opacity-80">
                {t.atStakeText(tour.inscriptions, euros(prime))}
              </span>
            </span>
          </section>
        )}
        <section className="overflow-hidden rounded-card border border-border bg-surface">
          <h2 className="px-4 pt-3.5 pb-1.5 text-[1.0625rem] font-semibold">{t.sorted}</h2>
          <ul>
            {callBacks.length > 0 && (
              <li className="flex items-start gap-3 border-t border-border px-4 py-3 text-sm">
                <Phone aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span className="flex flex-col">
                  <span className="font-semibold">{t.callBacks(callBacks.length)}</span>
                  <span className="text-muted-foreground">{callBacks.join(", ")}</span>
                </span>
              </li>
            )}
            {sum.absents > 0 && (
              <li className="flex items-start gap-3 border-t border-border px-4 py-3 text-sm">
                <DoorClosed aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span className="font-semibold">{t.absents(sum.absents)}</span>
              </li>
            )}
            <li className="flex items-start gap-3 border-t border-border px-4 py-3 text-sm">
              <QrCode aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span className="flex flex-col">
                <span className="font-semibold">{t.signups(tour.inscriptions)}</span>
                <span className="text-muted-foreground">{t.signupsHint}</span>
              </span>
            </li>
          </ul>
        </section>
        {points.length > 0 && (
          <TourMap stops={points} done={tour.stops.map((s) => s.outcome !== null)} height="h-56" />
        )}
        <ButtonLink href={"/commercial/tournee" as Route} size="lg">
          <MapIcon aria-hidden="true" className="size-4" />
          {t.next}
        </ButtonLink>
        <p className="text-sm text-muted-foreground">{t.private}</p>
      </div>
    </main>
  );
}
