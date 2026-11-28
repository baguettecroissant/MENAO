"use client";

import {
  TOUR_DURATION_KEYS,
  TOUR_TRADES,
  orderStops,
  routeMeters,
  tourMinutes,
  type GeoPoint,
  type TourDuration,
} from "@menao/core";
import { LoaderCircle, LocateFixed, Lock, MapPin, Navigation, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Alert, Button, Select } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { proposeTour, startTour, type TourCandidateView } from "@/lib/commercial/tour-actions";
import { TourMap } from "./tour-map";

const t = fr.commercialField.tour;
const DEFAULT_TRADES = ["plombiers", "chauffagistes", "electriciens"];

export type TourStart = { commune: string; lat: number; lng: number; prospects: number };

const km = (meters: number) =>
  (meters / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
function duration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}` : `${m} min`;
}

/**
 * Préparer une tournée (F-194, lot 83, ADR 0394) : départ (position du téléphone ou commune),
 * métiers, durée ; MENAO propose des arrêts dans l'ordre, le conseiller retire ou ajoute, puis
 * commence. La position reste dans le navigateur et sert seulement au calcul.
 */
export function TourPlanner({ starts }: { starts: TourStart[] }) {
  const [mode, setMode] = useState<"geo" | "commune">("geo");
  const [geo, setGeo] = useState<GeoPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [commune, setCommune] = useState("");
  const [trades, setTrades] = useState<string[]>(DEFAULT_TRADES);
  const [dur, setDur] = useState<TourDuration>("matinee");
  const [stops, setStops] = useState<TourCandidateView[] | null>(null);
  const [others, setOthers] = useState<TourCandidateView[]>([]);
  const [showOthers, setShowOthers] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const chosenCommune = starts.find((s) => s.commune === commune) ?? null;
  const start: GeoPoint | null =
    mode === "geo"
      ? geo
      : chosenCommune
        ? { lat: chosenCommune.lat, lng: chosenCommune.lng }
        : null;
  const route = start && stops ? routeMeters(start, stops) : null;

  function locate() {
    setMode("geo");
    setGeoError(false);
    if (!("geolocation" in navigator)) return setGeoError(true);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setGeoError(true);
        setMode("commune");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 },
    );
  }

  function propose() {
    if (!start) return;
    setMessage(null);
    startTransition(async () => {
      const result = await proposeTour({ ...start, trades, duration: dur });
      if (result.status === "ok") {
        setStops(result.stops);
        setOthers(result.others);
        setShowOthers(false);
      } else {
        setStops(null);
        setMessage(result.status === "empty" ? t.empty : t.errors.unavailable);
      }
    });
  }

  function reorder(next: TourCandidateView[]) {
    setStops(start ? orderStops(start, next) : next);
  }

  function begin() {
    if (!stops?.length) return;
    startTransition(async () => {
      const result = await startTour({
        ids: stops.map((s) => s.id),
        trades,
        duration: dur,
        meters: route?.total ?? 0,
      });
      setMessage(result.status === "not_free" ? t.errors.notFree : t.errors.unavailable);
    });
  }

  const chip = (on: boolean) =>
    `inline-flex min-h-10 items-center rounded-pill px-4 text-sm font-semibold transition-colors ${
      on ? "bg-foreground text-surface" : "border border-border bg-surface hover:border-primary/40"
    }`;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {t.where}
          </legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={locate} className={chip(mode === "geo")}>
              {locating ? (
                <LoaderCircle aria-hidden="true" className="mr-1.5 size-4 animate-spin" />
              ) : (
                <LocateFixed aria-hidden="true" className="mr-1.5 size-4" />
              )}
              {t.aroundMe}
            </button>
            <button
              type="button"
              onClick={() => setMode("commune")}
              className={chip(mode === "commune")}
            >
              <MapPin aria-hidden="true" className="mr-1.5 size-4" />
              {t.fromCommune}
            </button>
          </div>
          {locating && <p className="text-sm text-muted-foreground">{t.locating}</p>}
          {geoError && <Alert tone="info">{t.locationDenied}</Alert>}
          {mode === "commune" && (
            <label className="flex flex-col gap-1.5">
              <span className="sr-only">{t.communeLabel}</span>
              <Select
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                aria-label={t.communeLabel}
              >
                <option value="">{t.communePlaceholder}</option>
                {starts.map((s) => (
                  <option key={s.commune} value={s.commune}>
                    {s.commune}
                  </option>
                ))}
              </Select>
            </label>
          )}
        </fieldset>
        <fieldset className="flex flex-col">
          <legend className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {t.trades}
          </legend>
          <div className="flex flex-wrap gap-2">
            {TOUR_TRADES.map((trade) => {
              const on = trades.includes(trade.code);
              return (
                <button
                  key={trade.code}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setTrades(on ? trades.filter((x) => x !== trade.code) : [...trades, trade.code])
                  }
                  className={chip(on)}
                >
                  {trade.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="flex flex-col">
          <legend className="mb-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {t.duration}
          </legend>
          <div className="flex gap-1 self-start rounded-pill border border-border bg-surface p-1">
            {TOUR_DURATION_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={dur === key}
                onClick={() => setDur(key)}
                className={`min-h-10 rounded-pill px-4 text-sm font-semibold ${dur === key ? "bg-foreground text-surface" : ""}`}
              >
                {t.durations[key]}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <Button
        type="button"
        block={false}
        className="self-start"
        disabled={!start || !trades.length || pending}
        onClick={propose}
      >
        {pending && !stops ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : null}
        {pending && !stops ? t.proposing : t.propose}
      </Button>
      {message && <Alert tone={message === t.empty ? "info" : "error"}>{message}</Alert>}

      {stops && start && route && (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="relative">
            <TourMap stops={stops} start={start} height="h-80 lg:h-[34rem]" />
            <span className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-input bg-surface px-3 py-2 text-sm font-semibold shadow-card">
              <Navigation aria-hidden="true" className="size-4" />
              {t.summary(
                stops.length,
                km(route.total),
                duration(tourMinutes(route.total, stops.length)),
              )}
            </span>
          </div>
          <div className="flex flex-col gap-4">
            <section className="overflow-hidden rounded-card border border-border bg-surface">
              <div className="flex items-center justify-between px-4 py-3">
                <h2 className="text-[1.0625rem] font-semibold">{t.stopsTitle(stops.length)}</h2>
                {others.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowOthers(!showOthers)}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary-strong"
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    {t.add}
                  </button>
                )}
              </div>
              <ol className="max-h-[26rem] overflow-y-auto">
                {stops.map((stop, i) => (
                  <li
                    key={stop.id}
                    className="flex items-center gap-3 border-t border-border px-4 py-2.5"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[0.6875rem] font-bold text-surface">
                      {i + 1}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold">{stop.nom}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {[
                          stop.mine ? t.mine : null,
                          stop.commune,
                          route.legs[i] ? `${route.legs[i]} m` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={t.remove(stop.nom)}
                      onClick={() => {
                        setStops(stops.filter((s) => s.id !== stop.id));
                        setOthers([stop, ...others]);
                      }}
                      className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-background"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  </li>
                ))}
              </ol>
            </section>
            {showOthers && others.length > 0 && (
              <section className="overflow-hidden rounded-card border border-border bg-surface">
                <h3 className="px-4 py-3 text-sm font-semibold">{t.addTitle}</h3>
                <ul className="max-h-64 overflow-y-auto">
                  {others.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center gap-3 border-t border-border px-4 py-2"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">{o.nom}</span>
                        <span className="truncate text-xs text-muted-foreground">{o.commune}</span>
                      </span>
                      <button
                        type="button"
                        aria-label={t.addOne(o.nom)}
                        disabled={stops.length >= 30}
                        onClick={() => {
                          reorder([...stops, o]);
                          setOthers(others.filter((x) => x.id !== o.id));
                        }}
                        className="inline-flex size-9 items-center justify-center rounded-full text-primary-strong hover:bg-primary-softer disabled:opacity-40"
                      >
                        <Plus aria-hidden="true" className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <Button
              type="button"
              size="lg"
              data-demo-block="save"
              disabled={pending || !stops.length}
              onClick={begin}
            >
              {pending ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Navigation aria-hidden="true" className="size-4" />
              )}
              {pending ? t.starting : t.start}
            </Button>
            <p className="hidden text-sm text-muted-foreground lg:block">{t.phoneTip}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row">
        <section className="flex-1 rounded-card bg-primary-softer p-4 text-sm text-label">
          <p className="mb-1 font-semibold text-foreground">{t.how}</p>
          {t.howText}
        </section>
        <p className="flex flex-1 items-start gap-2.5 rounded-card border border-border bg-surface p-4 text-sm text-label">
          <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t.privacy}
        </p>
      </div>
    </div>
  );
}
