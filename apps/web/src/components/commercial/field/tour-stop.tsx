"use client";

import { apeLabel, tourDirectionsUrl, tourSummary, type TourOutcome } from "@menao/core";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  DoorClosed,
  LoaderCircle,
  Mic,
  Navigation,
  Phone,
  QrCode,
  Send,
  Smartphone,
  Sparkles,
  ThumbsUp,
  CircleX,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { ReportPanel } from "@/components/commercial/prospect-copilot";
import { Alert, Button, ButtonLink, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { Tour } from "@/lib/commercial/tour";
import { endTour, recordStopOutcome } from "@/lib/commercial/tour-actions";
import { parisInputValues } from "@/lib/format";
import { TourMap } from "./tour-map";

const t = fr.commercialField.stop;
const staff = fr.commercialProspects.detail.staffBands;

const OUTCOMES: readonly { key: TourOutcome; icon: typeof ThumbsUp; className: string }[] = [
  { key: "interesse", icon: ThumbsUp, className: "bg-success text-white" },
  { key: "a_rappeler", icon: Clock, className: "bg-primary text-primary-foreground" },
  { key: "absent", icon: DoorClosed, className: "border border-border bg-surface" },
  { key: "pas_interesse", icon: CircleX, className: "border border-border bg-surface" },
];

const noSubscribe = () => () => {};

/** Demain à 18 h, heure de Paris, au format du champ date et heure. */
function tomorrowAt18(): string {
  const { date } = parisInputValues(new Date(Date.now() + 86_400_000).toISOString());
  return `${date}T18:00`;
}

/**
 * Tournée en cours (F-194, lot 83, ADR 0394) : un arrêt à la fois, ce qu'il faut savoir (accroche du
 * copilote), 4 gros boutons pour la suite de la visite, la note vocale résumée par le copilote,
 * « Montrer à l'artisan » et « Et maintenant ? » quand il est intéressé.
 */
export function TourStopView({ tour, link }: { tour: Tour; link: string | null }) {
  const router = useRouter();
  const firstOpen = tour.stops.findIndex((s) => s.outcome === null);
  const [index, setIndex] = useState(firstOpen === -1 ? tour.stops.length - 1 : firstOpen);
  const [editing, setEditing] = useState(false);
  const [callBack, setCallBack] = useState<string | null>(null);
  const [note, setNote] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Plans sur iPhone et Mac, Google Maps ailleurs (lu une fois, côté navigateur).
  const apple = useSyncExternalStore(
    noSubscribe,
    () => /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent),
    () => false,
  );

  const stop = tour.stops[index];
  const outcomes = tour.stops.map((s) => s.outcome);
  const counts = useMemo(() => tourSummary(outcomes), [outcomes]);
  const points = tour.stops
    .filter((s) => s.lat !== null && s.lng !== null)
    .map((s) => ({ lat: s.lat as number, lng: s.lng as number }));
  if (!stop) return null;
  const recorded = stop.outcome !== null && !editing;
  const year = stop.date_creation?.slice(0, 4);

  function goTo(i: number) {
    setIndex(Math.max(0, Math.min(tour.stops.length - 1, i)));
    setEditing(false);
    setCallBack(null);
    setNote(false);
    setError(null);
  }

  function record(outcome: TourOutcome, nextActionAt: string | null = null) {
    if (!stop) return;
    setError(null);
    startTransition(async () => {
      const result = await recordStopOutcome({
        tourId: tour.id,
        prospectId: stop.prospect_id,
        outcome,
        nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : null,
      });
      if (result.status !== "ok") {
        setError(result.status === "date" ? t.errors.date : t.errors.unavailable);
        return;
      }
      setEditing(false);
      setCallBack(null);
      router.refresh();
    });
  }

  const nextOpen = tour.stops.findIndex((s, i) => i > index && s.outcome === null);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold tracking-wide text-muted-foreground uppercase">
          {t.progress(index + 1, tour.stops.length)}
        </span>
        <span className="text-muted-foreground">{t.counts(counts.seen, counts.interested)}</span>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {tour.stops.map((s, i) => (
          <span
            key={s.prospect_id}
            className={`h-1.5 flex-1 rounded-full ${s.outcome ? "bg-success" : i === index ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>
      <div className="relative">
        <TourMap
          stops={points}
          current={index}
          done={outcomes.map((o) => o !== null)}
          height="h-44"
        />
        {stop.lat !== null && stop.lng !== null && (
          <a
            href={tourDirectionsUrl({ lat: stop.lat, lng: stop.lng }, apple)}
            target="_blank"
            rel="noreferrer"
            className="absolute right-3 bottom-3 inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-surface px-4 text-sm font-bold shadow-card"
          >
            <Navigation aria-hidden="true" className="size-4" />
            {t.go}
          </a>
        )}
      </div>

      <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[1.375rem] leading-tight font-semibold">{stop.nom}</h1>
          <p className="text-[0.8125rem] text-muted-foreground">
            {[
              apeLabel(stop.ape_code),
              year ? t.created(year) : null,
              stop.tranche_effectif ? staff[stop.tranche_effectif] : null,
              [stop.adresse, stop.commune].filter(Boolean).join(", ") || null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex gap-2.5 rounded-input bg-primary-softer p-3 text-sm">
          <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-strong" />
          {stop.accroche ? (
            <p>
              <strong>{t.hookTitle}</strong> {stop.accroche}
            </p>
          ) : (
            <p className="flex flex-col gap-1">
              <span>{t.hookMissing}</span>
              <Link
                href={`/commercial/prospects/${stop.prospect_id}` as Route}
                className="font-semibold text-primary-strong hover:underline"
              >
                {t.prepare}
              </Link>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {stop.phone && (
            <a
              href={`tel:${stop.phone}`}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-button border border-border-strong bg-surface text-sm font-semibold"
            >
              <Phone aria-hidden="true" className="size-4" />
              {t.call}
            </a>
          )}
          <ButtonLink href={"/commercial/montrer" as Route} variant="dark" className="flex-1">
            <Smartphone aria-hidden="true" className="size-4" />
            {t.show}
          </ButtonLink>
        </div>
      </section>

      {recorded && stop.outcome ? (
        <div className="flex items-center justify-between gap-3 rounded-input bg-success-soft px-4 py-3 text-sm">
          <span className="flex items-center gap-2 font-semibold text-success">
            <Check aria-hidden="true" className="size-4" />
            {t.done(t.outcomes[stop.outcome])}
          </span>
          {tour.status === "en_cours" && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="font-semibold text-primary-strong hover:underline"
            >
              {t.fix}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {OUTCOMES.map(({ key, icon: Icon, className }) => (
            <button
              key={key}
              type="button"
              data-demo-block="save"
              disabled={pending}
              onClick={() => (key === "a_rappeler" ? setCallBack(tomorrowAt18()) : record(key))}
              className={`flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-card text-[0.9375rem] font-bold disabled:opacity-60 ${className}`}
            >
              <Icon aria-hidden="true" className="size-6" />
              {t.outcomes[key]}
              {key === "absent" && (
                <span className="text-xs font-medium opacity-75">{t.absentHint}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {callBack !== null && (
        <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
          <label htmlFor="rappel" className="text-sm font-semibold">
            {t.callBackAt}
          </label>
          <input
            id="rappel"
            type="datetime-local"
            value={callBack}
            onChange={(e) => setCallBack(e.target.value)}
            className={inputClasses}
          />
          <Button
            type="button"
            disabled={pending || !callBack}
            onClick={() => record("a_rappeler", callBack)}
          >
            {t.callBackSave}
          </Button>
        </div>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      {recorded && stop.outcome === "interesse" && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {t.afterTitle}
          </h2>
          <Link
            href={"/commercial/montrer?onglet=inscription" as Route}
            className="flex items-center gap-3 rounded-input bg-primary p-4 text-primary-foreground"
          >
            <QrCode aria-hidden="true" className="size-5" />
            <span className="flex flex-1 flex-col">
              <span className="font-semibold">{t.signup}</span>
              <span className="text-[0.8125rem] opacity-85">{t.signupHint}</span>
            </span>
            <ChevronRight aria-hidden="true" className="size-5" />
          </Link>
          {link && (
            <a
              href={`sms:${stop.phone ?? ""}?&body=${encodeURIComponent(t.smsBody(link))}`}
              className="flex items-center gap-3 rounded-input border border-border-strong bg-surface p-4"
            >
              <Send aria-hidden="true" className="size-5" />
              <span className="flex flex-1 flex-col">
                <span className="font-semibold">{t.sms}</span>
                <span className="text-[0.8125rem] text-muted-foreground">{t.smsHint}</span>
              </span>
            </a>
          )}
        </section>
      )}

      {note ? (
        <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
          <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold">
            <Mic aria-hidden="true" className="size-4" />
            {t.note}
          </h2>
          <ReportPanel prospectId={stop.prospect_id} phone={stop.phone} link={link ?? ""} />
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setNote(true)}
          className="flex min-h-14 items-center justify-center gap-2.5 rounded-pill border-2 border-dashed border-border-strong text-[0.9375rem] font-semibold"
        >
          <Mic aria-hidden="true" className="size-5" />
          {t.note}
        </button>
      )}

      <div className="flex items-center justify-between gap-2 text-sm font-semibold">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => goTo(index - 1)}
          className="inline-flex items-center gap-1 text-muted-foreground disabled:opacity-40"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          {t.previous}
        </button>
        {index < tour.stops.length - 1 && (
          <button
            type="button"
            onClick={() => goTo(recorded && nextOpen !== -1 ? nextOpen : index + 1)}
            className={`inline-flex items-center gap-1 ${recorded ? "text-primary-strong" : "text-muted-foreground"}`}
          >
            {recorded ? t.nextStop : t.skip}
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>

      {firstOpen === -1 && <Alert tone="success">{t.allDone}</Alert>}
      {tour.status === "en_cours" &&
        (confirmEnd ? (
          <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
            <p className="text-sm">{t.endConfirm}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                data-demo-block="save"
                disabled={pending}
                onClick={() => startTransition(() => endTour(tour.id))}
              >
                {pending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
                {t.end}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setConfirmEnd(false)}>
                {fr.commercialProspects.detail.doNotContactCancel}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant={firstOpen === -1 ? "primary" : "secondary"}
            onClick={() =>
              firstOpen === -1 ? startTransition(() => endTour(tour.id)) : setConfirmEnd(true)
            }
          >
            {t.end}
          </Button>
        ))}

      <details className="rounded-card border border-border bg-surface">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">{t.list}</summary>
        <ol>
          {tour.stops.map((s, i) => (
            <li key={s.prospect_id}>
              <button
                type="button"
                onClick={() => goTo(i)}
                className={`flex w-full items-center gap-3 border-t border-border px-4 py-2.5 text-left text-sm ${i === index ? "bg-primary-softer" : ""}`}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold text-white ${s.outcome ? "bg-success" : "bg-foreground"}`}
                >
                  {i + 1}
                </span>
                <span className="flex-1 truncate">{s.nom}</span>
                {s.outcome && (
                  <span className="text-xs text-muted-foreground">{t.outcomes[s.outcome]}</span>
                )}
              </button>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
