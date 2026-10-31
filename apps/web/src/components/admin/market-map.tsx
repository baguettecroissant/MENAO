"use client";

import {
  demandByCommune,
  demandRadius,
  fitView,
  kmToPixels,
  marketStart,
  panView,
  projectPoint,
  stageAt,
  visibleTiles,
  zoomView,
  type MapView,
  type MarketArtisan,
  type MarketCommune,
  type MarketDemand,
  type MarketStage,
} from "@menao/core";
import { planIgnTileUrl } from "@menao/validation";
import { LocateFixed, Minus, Pause, Play, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { fr } from "@/i18n/fr";

const t = fr.admin.market.map;
const DAY_MS = 86_400_000;
/** Pas de l'animation « Voir grandir » : un jour toutes les 60 ms. */
const PLAY_STEP_MS = 60;

const STAGE_DOT: Record<MarketStage, string> = {
  valide: "size-3.5 border-2 border-surface bg-primary",
  en_cours: "size-3.5 border-[2.5px] border-primary bg-surface",
  suspendu: "size-3.5 border-2 border-surface bg-danger",
  refuse: "size-2.5 border border-surface bg-subtle-foreground",
};

const formatDate = (at: Date) =>
  at.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

type Hovered =
  | { kind: "artisan"; artisan: MarketArtisan; stage: MarketStage; x: number; y: number }
  | { kind: "demand"; row: MarketCommune; x: number; y: number };

/**
 * Carte du marché (ADR 0181) sur le Plan IGN : un point par artisan (couleur selon son étape),
 * zones d'intervention (les rayons, seuls dessinés ; les autres zones se lisent au survol),
 * cercles de demande par commune, filtre par métier et curseur « Voir
 * grandir » qui rejoue l'arrivée des artisans. Glisser pour déplacer, molette ou boutons pour
 * zoomer. Sans bibliothèque de cartes, comme l'aperçu de zone.
 */
export function MarketMap({
  artisans,
  demand,
  trades,
  today,
}: {
  artisans: MarketArtisan[];
  demand: MarketDemand[];
  trades: { code: string; label: string }[];
  /** Date du rendu (serveur), la même côté navigateur. */
  today: number;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [moved, setMoved] = useState<MapView | null>(null);
  const [layers, setLayers] = useState({ artisans: true, zones: false, demand: true });
  const [trade, setTrade] = useState<string | null>(null);
  const [at, setAt] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const tradeLabel = (code: string) => trades.find((tr) => tr.code === code)?.label ?? code;
  const shownArtisans = useMemo(
    () =>
      artisans.filter(
        (a) => a.lon !== null && a.lat !== null && (!trade || a.metiers.includes(trade)),
      ),
    [artisans, trade],
  );
  const communes = useMemo(
    () => demandByCommune(demand, trade).filter((row) => row.lon !== null && row.lat !== null),
    [demand, trade],
  );
  const maxSearches = communes.reduce((max, row) => Math.max(max, row.recherches), 0);
  const start = marketStart(artisans, new Date(today)).getTime();
  const atDate = at === null ? null : new Date(at);

  // Cadrage initial sur tous les points ; ensuite, la vue suit les déplacements.
  const fitted = useMemo(
    () =>
      size.width
        ? fitView(
            [
              ...artisans.flatMap((a) =>
                a.lon !== null && a.lat !== null ? [{ lon: a.lon, lat: a.lat }] : [],
              ),
              ...demand.flatMap((d) =>
                d.lon !== null && d.lat !== null ? [{ lon: d.lon, lat: d.lat }] : [],
              ),
            ],
            size.width,
            size.height,
          )
        : null,
    [artisans, demand, size.width, size.height],
  );
  const view = moved ?? fitted;

  // Valeurs à jour pour la molette (écouteur non passif, posé une seule fois).
  const latest = useRef({ view, size });
  useEffect(() => {
    latest.current = { view, size };
  });

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      });
    });
    observer.observe(element);
    const onWheel = (event: WheelEvent) => {
      const { view: current, size: box } = latest.current;
      if (!current) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      setMoved(
        zoomView(
          current,
          event.deltaY < 0 ? 1 : -1,
          box.width,
          box.height,
          event.clientX - rect.left,
          event.clientY - rect.top,
        ),
      );
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer.disconnect();
      element.removeEventListener("wheel", onWheel);
    };
  }, []);

  // « Voir grandir » : un jour toutes les 60 ms jusqu'à aujourd'hui.
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setAt((current) => {
        const next = (current ?? start) + DAY_MS;
        if (next >= today) {
          setPlaying(false);
          return null;
        }
        return next;
      });
    }, PLAY_STEP_MS);
    return () => clearInterval(timer);
  }, [playing, start, today]);

  const project = (lon: number, lat: number) =>
    view ? projectPoint(view, size.width, size.height, lon, lat) : { x: 0, y: 0 };
  const inFrame = (p: { x: number; y: number }, margin = 40) =>
    p.x > -margin && p.y > -margin && p.x < size.width + margin && p.y < size.height + margin;

  const visible = shownArtisans
    .map((artisan) => ({ artisan, stage: stageAt(artisan, atDate) }))
    .filter((item): item is { artisan: MarketArtisan; stage: MarketStage } => item.stage !== null);
  const counts = visible.reduce<Record<MarketStage, number>>(
    (total, { stage }) => ({ ...total, [stage]: total[stage] + 1 }),
    { valide: 0, en_cours: 0, suspendu: 0, refuse: 0 },
  );

  const zonesNotDrawn = visible.filter(
    ({ artisan, stage }) => stage === "valide" && !artisan.rayon_km,
  ).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{t.layers}</span>
        {(["artisans", "zones", "demand"] as const).map((layer) => (
          <label
            key={layer}
            className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-chip border border-border bg-surface px-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
          >
            <input
              type="checkbox"
              checked={layers[layer]}
              onChange={(e) => setLayers((current) => ({ ...current, [layer]: e.target.checked }))}
              className="accent-primary"
            />
            {t[layer]}
          </label>
        ))}
        <label className="ml-auto inline-flex items-center gap-2">
          <span className="font-medium">{t.trade}</span>
          <select
            value={trade ?? ""}
            onChange={(e) => setTrade(e.target.value || null)}
            className="min-h-9 rounded-input border border-border bg-surface px-3"
          >
            <option value="">{t.allTrades}</option>
            {trades.map((tr) => (
              <option key={tr.code} value={tr.code}>
                {tr.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        ref={frame}
        role="region"
        aria-label={t.label}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("a, button")) return;
          drag.current = { x: e.clientX, y: e.clientY, moved: false };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const start = drag.current;
          if (!start || !view) return;
          // Bouton relâché hors de la carte : le glisser s'arrête.
          if (e.pointerType === "mouse" && e.buttons === 0) {
            drag.current = null;
            return;
          }
          const dx = e.clientX - start.x;
          const dy = e.clientY - start.y;
          if (!start.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
          drag.current = { x: e.clientX, y: e.clientY, moved: true };
          setHovered(null);
          setMoved(panView(view, dx, dy));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
        className="relative h-[28rem] touch-none overflow-hidden rounded-card border border-border bg-primary-softer select-none sm:h-[34rem] [background-image:repeating-linear-gradient(0deg,transparent_0_34px,rgb(255_255_255/0.9)_34px_37px),repeating-linear-gradient(90deg,transparent_0_46px,rgb(255_255_255/0.9)_46px_49px)]"
      >
        {view &&
          visibleTiles(view, size.width, size.height).map((tile) => (
            // eslint-disable-next-line @next/next/no-img-element -- tuiles IGN, sans optimisation Vercel (spec §4.4)
            <img
              key={`${tile.z}/${tile.x}/${tile.y}/${tile.left}`}
              src={planIgnTileUrl(tile)}
              alt=""
              draggable={false}
              decoding="async"
              onError={(event) => {
                event.currentTarget.style.visibility = "hidden";
              }}
              className="pointer-events-none absolute size-64 max-w-none"
              style={{ left: tile.left, top: tile.top }}
            />
          ))}

        {view &&
          layers.zones &&
          visible
            .filter(({ artisan, stage }) => stage === "valide" && artisan.rayon_km)
            .map(({ artisan }) => {
              const p = project(artisan.lon!, artisan.lat!);
              const diameter = 2 * kmToPixels(artisan.rayon_km!, artisan.lat!, view.zoom);
              return (
                <div
                  key={`zone-${artisan.id}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/40 bg-primary/10"
                  style={{ left: p.x, top: p.y, width: diameter, height: diameter }}
                />
              );
            })}

        {view &&
          layers.demand &&
          communes.map((row) => {
            const p = project(row.lon!, row.lat!);
            if (!inFrame(p)) return null;
            const radius = demandRadius(row.recherches, maxSearches);
            return (
              <button
                key={`demande-${row.code_insee}`}
                type="button"
                aria-label={t.demandTip(
                  row.ville ?? row.code_insee,
                  row.recherches,
                  row.resultats,
                  row.demandes,
                )}
                onPointerEnter={() => setHovered({ kind: "demand", row, x: p.x, y: p.y })}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered({ kind: "demand", row, x: p.x, y: p.y })}
                onBlur={() => setHovered(null)}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-warning bg-warning/20 text-xs font-bold text-warning focus-visible:ring-4 focus-visible:ring-warning/30 focus-visible:outline-none"
                style={{ left: p.x, top: p.y, width: radius * 2, height: radius * 2 }}
              >
                {radius >= 14 ? row.recherches : null}
              </button>
            );
          })}

        {view &&
          layers.artisans &&
          visible.map(({ artisan, stage }) => {
            const p = project(artisan.lon!, artisan.lat!);
            if (!inFrame(p)) return null;
            return (
              <Link
                key={artisan.id}
                href={`/admin/artisans/${artisan.id}`}
                aria-label={`${artisan.nom ?? t.unnamed} — ${t.stages[stage]}`}
                onPointerEnter={() =>
                  setHovered({ kind: "artisan", artisan, stage, x: p.x, y: p.y })
                }
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered({ kind: "artisan", artisan, stage, x: p.x, y: p.y })}
                onBlur={() => setHovered(null)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_1px_4px_rgb(17_23_40/0.35)] transition-transform hover:scale-125 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none ${STAGE_DOT[stage]}`}
                style={{ left: p.x, top: p.y }}
              />
            );
          })}

        {hovered && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 w-64 -translate-x-1/2 rounded-input border border-border bg-surface px-3 py-2 text-xs shadow-card"
            style={{
              left: Math.min(Math.max(hovered.x, 136), size.width - 136),
              top: hovered.y > 120 ? hovered.y - 12 : hovered.y + 16,
              transform: `translate(-50%, ${hovered.y > 120 ? "-100%" : "0"})`,
            }}
          >
            {hovered.kind === "artisan" ? (
              <>
                <p className="text-sm font-medium">{hovered.artisan.nom ?? t.unnamed}</p>
                <p className="text-muted-foreground">
                  {t.stages[hovered.stage]}
                  {hovered.artisan.commune ? ` · ${hovered.artisan.commune}` : ""}
                </p>
                {hovered.artisan.metiers.length > 0 && (
                  <p>{hovered.artisan.metiers.map(tradeLabel).join(", ")}</p>
                )}
                {hovered.artisan.rayon_km ? (
                  <p>{t.zoneRadius(hovered.artisan.rayon_km)}</p>
                ) : hovered.artisan.zone_labels.length > 0 ? (
                  <p>{t.zoneList(hovered.artisan.zone_labels)}</p>
                ) : null}
                <p className="text-muted-foreground">
                  {t.joined(formatDate(new Date(hovered.artisan.inscrit_le)))}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">{hovered.row.ville ?? hovered.row.code_insee}</p>
                <p>{t.searches(hovered.row.recherches)}</p>
                <p className="text-muted-foreground">
                  {t.results(hovered.row.resultats)} · {t.requests(hovered.row.demandes)}
                </p>
                {hovered.row.metiers.length > 0 && (
                  <p className="text-muted-foreground">
                    {hovered.row.metiers.map(tradeLabel).join(", ")}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-col overflow-hidden rounded-input border border-border bg-surface shadow-card">
          {[
            { label: t.zoomIn, icon: Plus, delta: 1 },
            { label: t.zoomOut, icon: Minus, delta: -1 },
          ].map(({ label, icon: Icon, delta }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => view && setMoved(zoomView(view, delta, size.width, size.height))}
              className="inline-flex size-9 items-center justify-center border-b border-border hover:bg-primary-softer"
            >
              <Icon aria-hidden="true" className="size-4" />
            </button>
          ))}
          <button
            type="button"
            aria-label={t.recenter}
            onClick={() => setMoved(null)}
            className="inline-flex size-9 items-center justify-center hover:bg-primary-softer"
          >
            <LocateFixed aria-hidden="true" className="size-4" />
          </button>
        </div>

        <ul className="absolute bottom-3 left-3 flex flex-col gap-1 rounded-input border border-border bg-surface/95 px-3 py-2 text-xs shadow-card">
          {(["valide", "en_cours", "suspendu", "refuse"] as const).map((stage) => (
            <li key={stage} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`inline-block rounded-full ${STAGE_DOT[stage]}`}
              />
              {t.stages[stage]}
              <span className="ml-auto pl-3 font-medium tabular-nums">{counts[stage]}</span>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block size-3.5 rounded-full border-2 border-warning bg-warning/20"
            />
            {t.demand}
          </li>
        </ul>

        <span className="absolute right-1.5 bottom-1 rounded-sm bg-surface/80 px-1 text-[10px] text-muted-foreground">
          {t.credit}
        </span>
      </div>

      {layers.zones && zonesNotDrawn > 0 && (
        <p className="text-xs text-muted-foreground">{t.zonesNotDrawn(zonesNotDrawn)}</p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => {
            if (!playing && at === null) setAt(start);
            setPlaying((current) => !current);
          }}
          className="inline-flex min-h-9 items-center gap-2 rounded-button bg-primary px-4 font-medium text-primary-foreground hover:bg-primary-hover"
        >
          {playing ? (
            <Pause aria-hidden="true" className="size-4" />
          ) : (
            <Play aria-hidden="true" className="size-4" />
          )}
          {playing ? t.pause : t.grow}
        </button>
        <input
          type="range"
          aria-label={t.timeline}
          min={start}
          max={today}
          step={DAY_MS}
          value={at ?? today}
          onChange={(e) => {
            setPlaying(false);
            const value = Number(e.target.value);
            setAt(value >= today - DAY_MS ? null : value);
          }}
          className="min-w-40 flex-1 accent-primary"
        />
        <span className="tabular-nums" aria-live="polite">
          {atDate ? t.at(formatDate(atDate)) : t.today}
        </span>
      </div>
    </div>
  );
}
