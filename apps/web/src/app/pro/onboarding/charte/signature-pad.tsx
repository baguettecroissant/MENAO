"use client";

import { useEffect, useRef } from "react";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding.charter;

// Cadre de référence du tracé enregistré (chemin SVG en coordonnées entières, ADR 0104).
const FRAME = { width: 600, height: 150 };

/**
 * Zone de signature au doigt ou à la souris. Le tracé est transmis sous forme de chemin SVG
 * (« M x y L x y … ») dans un cadre de 600 × 150, ou une chaîne vide après « Effacer ».
 */
export function SignaturePad({ onChange }: { onChange: (path: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const hint = useRef<HTMLSpanElement>(null);
  const path = useRef<string[]>([]);
  const clearRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const fit = () => {
      const r = c.getBoundingClientRect();
      const d = window.devicePixelRatio || 1;
      c.width = r.width * d;
      c.height = r.height * d;
      const x = c.getContext("2d");
      if (!x) return;
      x.scale(d, d);
      x.lineWidth = 2.4;
      x.lineCap = "round";
      x.lineJoin = "round";
      x.strokeStyle = "#111728";
    };
    fit();
    let drawing = false;
    let last: [number, number] | null = null;
    const pos = (ev: PointerEvent): [number, number] => {
      const r = c.getBoundingClientRect();
      return [ev.clientX - r.left, ev.clientY - r.top];
    };
    const toFrame = ([x, y]: [number, number]) => {
      const r = c.getBoundingClientRect();
      return `${Math.round((x / r.width) * FRAME.width)} ${Math.round((y / r.height) * FRAME.height)}`;
    };
    const down = (ev: PointerEvent) => {
      drawing = true;
      last = pos(ev);
      c.setPointerCapture(ev.pointerId);
      if (hint.current) hint.current.hidden = true;
      path.current.push(`M ${toFrame(last)}`);
    };
    const move = (ev: PointerEvent) => {
      if (!drawing || !last) return;
      const p = pos(ev);
      const x = c.getContext("2d");
      if (!x) return;
      x.beginPath();
      x.moveTo(last[0], last[1]);
      x.lineTo(p[0], p[1]);
      x.stroke();
      last = p;
      path.current.push(`L ${toFrame(p)}`);
      onChange(path.current.join(" "));
    };
    const up = () => {
      drawing = false;
    };
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    for (const type of ["pointerup", "pointercancel", "pointerleave"]) c.addEventListener(type, up);
    const clear = () => {
      fit();
      path.current = [];
      onChange("");
      if (hint.current) hint.current.hidden = false;
    };
    clearRef.current = clear;
    return () => {
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      for (const type of ["pointerup", "pointercancel", "pointerleave"])
        c.removeEventListener(type, up);
    };
  }, [onChange]);

  return (
    <div className="flex flex-col gap-2 text-sm font-bold">
      <div className="flex items-center justify-between">
        <span id="charter-signature-label">{t.signature}</span>
        <button
          type="button"
          onClick={() => clearRef.current()}
          className="rounded-sm py-1 font-bold text-primary-strong hover:underline"
        >
          {t.clear}
        </button>
      </div>
      <div className="relative h-[150px] touch-none rounded-input border-[1.5px] border-dashed border-primary/40 bg-[#fbfbff]">
        <canvas ref={canvas} aria-label={t.padLabel} className="block size-full rounded-input" />
        <span
          ref={hint}
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-normal text-subtle-foreground"
        >
          {t.padHint}
        </span>
      </div>
    </div>
  );
}
