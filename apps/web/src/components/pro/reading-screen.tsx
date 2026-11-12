"use client";

import { Check } from "lucide-react";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { fr } from "@/i18n/fr";

const t = fr.pro.tenders.waiting;

export type ReadingKind = "plan" | "dpgf";

/** Rythme des étapes, des « Le saviez-vous ? » et des pièces qui apparaissent (millisecondes). */
const STEP_MS = 9000;
const FACT_MS = 6000;
const ROOM_MS = 2600;
/** Au-delà, on dit que c'est plus long que d'habitude (la lecture continue). */
const LONG_S = 80;

/** Pièces du plan type : rectangle, surface affichée, couleur (dessin, pas le plan lu). */
const ROOMS = [
  { x: 14, y: 14, w: 150, h: 98, fill: "fill-primary-soft", label: "a" },
  { x: 164, y: 14, w: 122, h: 70, fill: "fill-success-soft", label: "b" },
  { x: 14, y: 112, w: 90, h: 64, fill: "fill-warning-soft", label: "c" },
  { x: 104, y: 112, w: 60, h: 64, fill: "fill-primary-softer", label: "d" },
  { x: 164, y: 84, w: 122, h: 92, fill: "fill-primary-soft", label: "e" },
] as const;

/** Plan type qui se dessine : murs tracés, pièces qui apparaissent une à une, trait de lecture. */
function PlanVisual({ shown }: { shown: number }) {
  return (
    <svg viewBox="0 0 300 190" className="h-auto w-full" aria-hidden="true">
      {ROOMS.map((room, i) => (
        <g
          key={room.label}
          className={`transition-opacity duration-700 motion-reduce:transition-none ${
            i < shown ? "opacity-100" : "opacity-0"
          }`}
        >
          <rect x={room.x} y={room.y} width={room.w} height={room.h} className={room.fill} />
          <text
            x={room.x + room.w / 2}
            y={room.y + room.h / 2 - 2}
            textAnchor="middle"
            className="fill-foreground text-[11px] font-semibold"
          >
            {t.rooms[i]?.name}
          </text>
          <text
            x={room.x + room.w / 2}
            y={room.y + room.h / 2 + 13}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {t.rooms[i]?.area}
          </text>
        </g>
      ))}
      <path
        d="M14 14H286V176H14Z"
        pathLength={1}
        className="animate-menao-draw fill-none stroke-foreground"
        strokeWidth={3}
        strokeLinejoin="round"
        style={{ animationDuration: "1.6s" }}
      />
      <path
        d="M164 14V176M14 112H164M104 112V176M164 84H286"
        pathLength={1}
        className="animate-menao-draw fill-none stroke-foreground"
        strokeWidth={2}
        strokeLinecap="round"
        style={{ animationDuration: "1.6s", animationDelay: "0.6s" }}
      />
      {/* Ouvertures : portes en arc, fenêtres en double trait. */}
      <path
        d="M60 112a16 16 0 0 1 16 -16M200 84a14 14 0 0 0 14 14M40 14h40M210 176h40"
        pathLength={1}
        className="animate-menao-draw fill-none stroke-primary"
        strokeWidth={2}
        strokeLinecap="round"
        style={{ animationDuration: "1.2s", animationDelay: "1.4s" }}
      />
      <ScanLine width={300} height={190} />
    </svg>
  );
}

/** Tableau type qui se remplit : lots, puis postes avec quantité et prix. */
function DpgfVisual({ shown }: { shown: number }) {
  const rows = 7;
  const visible = Math.min(rows, shown * 2);
  return (
    <svg viewBox="0 0 300 190" className="h-auto w-full" aria-hidden="true">
      <rect
        x={10}
        y={8}
        width={280}
        height={174}
        rx={8}
        className="fill-surface stroke-border"
        strokeWidth={1}
      />
      <rect x={10} y={8} width={280} height={24} rx={8} className="fill-primary-softer" />
      <text x={22} y={24} className="fill-foreground text-[10px] font-semibold">
        {t.table.designation}
      </text>
      <text x={196} y={24} className="fill-foreground text-[10px] font-semibold">
        {t.table.quantity}
      </text>
      <text x={250} y={24} className="fill-foreground text-[10px] font-semibold">
        {t.table.unit}
      </text>
      {Array.from({ length: rows }, (_, i) => {
        const y = 42 + i * 20;
        const lot = i === 0 || i === 4;
        return (
          <g
            key={i}
            className={`transition-opacity duration-500 motion-reduce:transition-none ${
              i < visible ? "opacity-100" : "opacity-0"
            }`}
          >
            <rect
              x={lot ? 22 : 30}
              y={y}
              width={lot ? 110 : 90 + ((i * 37) % 60)}
              height={8}
              rx={4}
              className={lot ? "fill-primary" : "fill-border-strong"}
            />
            {!lot && (
              <>
                <rect x={196} y={y} width={30} height={8} rx={4} className="fill-primary-soft" />
                <rect x={250} y={y} width={22} height={8} rx={4} className="fill-border" />
              </>
            )}
          </g>
        );
      })}
      <ScanLine width={300} height={190} />
    </svg>
  );
}

/** Trait bleu qui balaie le document de haut en bas (coupé si moins de mouvement demandé). */
function ScanLine({ width, height }: { width: number; height: number }) {
  return (
    <g
      className="animate-menao-scan motion-reduce:hidden"
      style={{ ["--scan" as string]: `${height - 24}px` }}
    >
      <rect x={6} y={8} width={width - 12} height={16} className="fill-primary/10" />
      <line x1={6} y1={8} x2={width - 6} y2={8} className="stroke-primary" strokeWidth={2} />
    </g>
  );
}

const noSubscribe = () => () => {};

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * Écran d'attente pendant la lecture d'un document par l'IA (F-140) : plan qui se dessine ou
 * tableau qui se remplit, étapes qui se cochent avec le temps (l'IA lit tout d'un coup : la
 * dernière reste en cours jusqu'à la réponse, sans pourcentage inventé), durée écoulée et
 * « Le saviez-vous ? ». Au-dessus de la page, jusqu'à la réponse.
 */
export function ReadingScreen({
  kind,
  uploading = false,
  quick = false,
}: {
  kind: ReadingKind;
  /** Fichiers en cours d'envoi : la première étape reste en cours. */
  uploading?: boolean;
  /** Excel repris sans IA : quelques secondes, étapes plus rapides. */
  quick?: boolean;
}) {
  const titleId = useId();
  // Rendu dans <body> : seulement côté navigateur (le serveur ne connaît pas document).
  const inBrowser = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const copy = t[kind];
  const [elapsed, setElapsed] = useState(0);
  const [readingFor, setReadingFor] = useState(0);
  const [fact, setFact] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    const facts = setInterval(() => setFact((i) => (i + 1) % copy.facts.length), FACT_MS);
    return () => {
      clearInterval(timer);
      clearInterval(facts);
    };
  }, [copy.facts.length]);

  // Temps de lecture, compté une fois les fichiers envoyés.
  useEffect(() => {
    if (uploading) return;
    const timer = setInterval(() => setReadingFor((ms) => ms + 500), 500);
    return () => clearInterval(timer);
  }, [uploading]);

  const last = copy.steps.length - 1;
  const pace = quick ? 5 : 1;
  const step = uploading ? 0 : Math.min(last, 1 + Math.floor((readingFor * pace) / STEP_MS));
  const shown = uploading ? 0 : 1 + Math.floor((readingFor * pace) / ROOM_MS);

  if (!inBrowser) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="grid max-h-[calc(100dvh-2rem)] w-full max-w-3xl animate-menao-fade-up overflow-y-auto gap-6 rounded-card border border-border bg-surface p-5 shadow-raised sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] sm:p-7"
      >
        <div className="flex items-center rounded-input bg-background p-3">
          {kind === "plan" ? <PlanVisual shown={shown} /> : <DpgfVisual shown={shown} />}
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold">
              {copy.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {elapsed >= LONG_S ? t.long : quick ? t.quick : t.duration} ·{" "}
              <span className="tabular-nums">{clock(elapsed)}</span>
            </p>
          </div>
          <ol className="flex flex-col gap-2.5" aria-live="polite">
            {copy.steps.map((label, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <li
                  key={label}
                  aria-current={current ? "step" : undefined}
                  className={`flex items-center gap-2.5 text-sm ${
                    current
                      ? "font-semibold text-foreground"
                      : done
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                      done
                        ? "bg-success text-white"
                        : current
                          ? "animate-spin border-2 border-primary border-t-transparent"
                          : "border-[1.5px] border-border-strong"
                    }`}
                  >
                    {done && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  {label}
                  {done && <span className="sr-only">{t.done}</span>}
                </li>
              );
            })}
          </ol>
          <p
            key={fact}
            className="min-h-16 animate-menao-fade-up rounded-input bg-primary-softer px-3.5 py-3 text-sm text-foreground"
          >
            <span className="font-semibold">{t.factTitle} </span>
            {copy.facts[fact]}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
