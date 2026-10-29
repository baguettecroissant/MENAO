"use client";

import { fitView, panView, projectPoint, visibleTiles, zoomView, type MapView } from "@menao/core";
import { planIgnTileUrl } from "@menao/validation";
import { LocateFixed, Minus, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { fr } from "@/i18n/fr";

const t = fr.commercialProspects.list;

export type ProspectPointKind = "mine" | "free" | "other";
export type ProspectPoint = {
  id: string;
  nom: string;
  lon: number;
  lat: number;
  kind: ProspectPointKind;
};

const KINDS: readonly ProspectPointKind[] = ["mine", "free", "other"];
const DOT: Record<ProspectPointKind, string> = {
  mine: "size-3.5 border-2 border-surface bg-primary",
  free: "size-3.5 border-[2.5px] border-primary bg-surface",
  other: "size-2.5 border border-surface bg-subtle-foreground",
};

type Hovered = { point: ProspectPoint; x: number; y: number };

/**
 * Carte des prospects (F-65, lot 2, ADR 0206) sur le Plan IGN : un point par entreprise localisée
 * (mes prospects, libres, suivis par un collègue), clic vers la fiche. Glisser pour déplacer,
 * molette ou boutons pour zoomer. Mêmes briques sans bibliothèque que la carte du marché.
 */
export function ProspectMap({ points }: { points: ProspectPoint[] }) {
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [moved, setMoved] = useState<MapView | null>(null);
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  // Cadrage initial sur tous les points ; ensuite, la vue suit les déplacements.
  const fitted = useMemo(
    () => (size.width ? fitView(points, size.width, size.height) : null),
    [points, size.width, size.height],
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

  const project = (lon: number, lat: number) =>
    view ? projectPoint(view, size.width, size.height, lon, lat) : { x: 0, y: 0 };
  const inFrame = (p: { x: number; y: number }, margin = 20) =>
    p.x > -margin && p.y > -margin && p.x < size.width + margin && p.y < size.height + margin;
  const counts = points.reduce<Record<ProspectPointKind, number>>(
    (total, point) => ({ ...total, [point.kind]: total[point.kind] + 1 }),
    { mine: 0, free: 0, other: 0 },
  );
  // Mes prospects dessinés en dernier : au-dessus des autres.
  const ordered = useMemo(
    () => [...points].sort((a, b) => KINDS.indexOf(b.kind) - KINDS.indexOf(a.kind)),
    [points],
  );

  return (
    <div
      ref={frame}
      role="region"
      aria-label={t.mapLabel}
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
      className="relative h-[65vh] max-h-[40rem] min-h-80 touch-none overflow-hidden rounded-card border border-border bg-primary-softer select-none [background-image:repeating-linear-gradient(0deg,transparent_0_34px,rgb(255_255_255/0.9)_34px_37px),repeating-linear-gradient(90deg,transparent_0_46px,rgb(255_255_255/0.9)_46px_49px)]"
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
        ordered.map((point) => {
          const p = project(point.lon, point.lat);
          if (!inFrame(p)) return null;
          return (
            <Link
              key={point.id}
              href={`/commercial/prospects/${point.id}` as Route}
              aria-label={`${point.nom} — ${t.mapLegend[point.kind]}`}
              onPointerEnter={() => setHovered({ point, x: p.x, y: p.y })}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered({ point, x: p.x, y: p.y })}
              onBlur={() => setHovered(null)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_1px_4px_rgb(17_23_40/0.35)] transition-transform hover:scale-125 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none ${DOT[point.kind]}`}
              style={{ left: p.x, top: p.y }}
            />
          );
        })}

      {hovered && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 w-56 rounded-input border border-border bg-surface px-3 py-2 text-xs shadow-card"
          style={{
            left: Math.min(Math.max(hovered.x, 120), size.width - 120),
            top: hovered.y > 90 ? hovered.y - 12 : hovered.y + 16,
            transform: `translate(-50%, ${hovered.y > 90 ? "-100%" : "0"})`,
          }}
        >
          <p className="text-sm font-medium">{hovered.point.nom}</p>
          <p className="text-muted-foreground">{t.mapLegend[hovered.point.kind]}</p>
        </div>
      )}

      <div className="absolute top-3 left-3 flex flex-col overflow-hidden rounded-input border border-border bg-surface shadow-card">
        {[
          { label: t.mapZoomIn, icon: Plus, delta: 1 },
          { label: t.mapZoomOut, icon: Minus, delta: -1 },
        ].map(({ label, icon: Icon, delta }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            onClick={() => view && setMoved(zoomView(view, delta, size.width, size.height))}
            className="inline-flex size-10 items-center justify-center border-b border-border hover:bg-primary-softer"
          >
            <Icon aria-hidden="true" className="size-4" />
          </button>
        ))}
        <button
          type="button"
          aria-label={t.mapRecenter}
          onClick={() => setMoved(null)}
          className="inline-flex size-10 items-center justify-center hover:bg-primary-softer"
        >
          <LocateFixed aria-hidden="true" className="size-4" />
        </button>
      </div>

      <ul className="absolute bottom-3 left-3 flex flex-col gap-1 rounded-input border border-border bg-surface/95 px-3 py-2 text-xs shadow-card">
        {KINDS.map((kind) => (
          <li key={kind} className="flex items-center gap-2">
            <span aria-hidden="true" className={`inline-block rounded-full ${DOT[kind]}`} />
            {t.mapLegend[kind]}
            <span className="ml-auto pl-3 font-medium tabular-nums">{counts[kind]}</span>
          </li>
        ))}
      </ul>

      <span className="absolute right-1.5 bottom-1 rounded-sm bg-surface/80 px-1 text-[10px] text-muted-foreground">
        {fr.zoneMap.credit}
      </span>
    </div>
  );
}
