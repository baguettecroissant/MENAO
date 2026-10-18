"use client";

import { zoneMapView } from "@menao/core";
import { planIgnTileUrl } from "@menao/validation";
import { useEffect, useRef, useState } from "react";
import { fr } from "@/i18n/fr";

const t = fr.pro.signUp.zone;

/**
 * Aperçu de la zone d'intervention sur le Plan IGN (ADR 0126) : la carte s'éloigne quand le rayon
 * grandit, le cercle reste à l'échelle. Le quadrillage de fond reste visible tant que les tuiles
 * chargent, ou si elles ne chargent pas.
 */
export function ZoneMap({
  lon,
  lat,
  radiusKm,
  label,
}: {
  lon: number;
  lat: number;
  radiusKm: number;
  label: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const view = zoneMapView({ lon, lat, radiusKm, ...size });

  return (
    <div
      ref={frame}
      aria-hidden="true"
      className="relative h-52 overflow-hidden rounded-card border border-border bg-primary-softer [background-image:repeating-linear-gradient(0deg,transparent_0_34px,rgb(255_255_255/0.9)_34px_37px),repeating-linear-gradient(90deg,transparent_0_46px,rgb(255_255_255/0.9)_46px_49px)]"
    >
      {view.tiles.map((tile) => (
        // eslint-disable-next-line @next/next/no-img-element -- tuiles IGN, sans optimisation Vercel (spec §4.4)
        <img
          key={`${tile.z}/${tile.x}/${tile.y}`}
          src={planIgnTileUrl(tile)}
          alt=""
          draggable={false}
          decoding="async"
          onError={(event) => {
            event.currentTarget.style.visibility = "hidden";
          }}
          className="absolute max-w-none select-none"
          style={{ left: tile.left, top: tile.top, width: tile.width, height: tile.height }}
        />
      ))}
      {view.circle > 0 && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary/15"
          style={{ width: view.circle, height: view.circle }}
        />
      )}
      <div className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface bg-primary" />
      <span className="absolute top-[calc(50%+14px)] left-1/2 -translate-x-1/2 rounded-pill bg-surface px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-sm">
        {label}
      </span>
      <span className="absolute right-1.5 bottom-1 rounded-sm bg-surface/80 px-1 text-[10px] text-muted-foreground">
        {t.mapCredit}
      </span>
    </div>
  );
}
