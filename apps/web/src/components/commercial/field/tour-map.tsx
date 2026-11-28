"use client";

import { fitView, projectPoint, visibleTiles } from "@menao/core";
import { planIgnTileUrl } from "@menao/validation";
import { useEffect, useMemo, useRef, useState } from "react";
import { fr } from "@/i18n/fr";

type Point = { lat: number; lng: number };

/**
 * Carte d'une tournée (F-194, ADR 0394) sur le Plan IGN : le parcours en pointillés, les arrêts
 * numérotés (faits en vert, l'arrêt en cours en bleu) et, si elle est donnée, la position de
 * départ. Cadrée sur l'ensemble, sans bibliothèque (mêmes briques que la carte des prospects).
 */
export function TourMap({
  stops,
  start = null,
  current = -1,
  done = [],
  height = "h-80",
}: {
  stops: readonly Point[];
  start?: Point | null;
  current?: number;
  /** Arrêts déjà passés, dans l'ordre des arrêts. */
  done?: readonly boolean[];
  height?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

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
    return () => observer.disconnect();
  }, []);

  const all = useMemo(
    () => [...(start ? [start] : []), ...stops].map((p) => ({ lon: p.lng, lat: p.lat })),
    [start, stops],
  );
  const view = size.width ? fitView(all, size.width, size.height, 36) : null;
  const project = (p: Point) =>
    view ? projectPoint(view, size.width, size.height, p.lng, p.lat) : { x: 0, y: 0 };
  const route = [...(start ? [start] : []), ...stops].map(project);

  return (
    <div
      ref={frame}
      role="img"
      aria-label={fr.commercialField.tour.mapLabel}
      className={`relative ${height} overflow-hidden rounded-card border border-border bg-primary-softer select-none`}
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
      {view && route.length > 1 && (
        <svg
          className="pointer-events-none absolute inset-0"
          width={size.width}
          height={size.height}
        >
          <polyline
            points={route.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={3.5}
            strokeDasharray="1 7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {view && start && (
        <span
          aria-hidden="true"
          className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface bg-primary shadow-[0_0_0_10px_rgb(72_105_246/0.18)]"
          style={{ left: project(start).x, top: project(start).y }}
        />
      )}
      {view &&
        stops.map((stop, i) => {
          const p = project(stop);
          const tone =
            done[i] && i !== current
              ? "bg-success"
              : i === current
                ? "bg-primary size-8 text-sm"
                : "bg-foreground";
          return (
            <span
              key={`${stop.lat},${stop.lng},${i}`}
              aria-hidden="true"
              className={`absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[2.5px] border-surface text-[0.6875rem] font-bold text-white shadow-[0_1px_4px_rgb(17_23_40/0.35)] ${tone}`}
              style={{ left: p.x, top: p.y }}
            >
              {i + 1}
            </span>
          );
        })}
      <span className="absolute right-1.5 bottom-1 rounded-sm bg-surface/80 px-1 text-[10px] text-muted-foreground">
        {fr.zoneMap.credit}
      </span>
    </div>
  );
}
