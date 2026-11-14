"use client";

import {
  contourText,
  formatPlanMeasure,
  measureMark,
  parseContour,
  planNameKey,
  scaleFromCalibration,
  type PlanMarkKind,
  type PlanMarkMeasure,
  type PlanPoint,
  type PlanTrace,
} from "@menao/core";
import {
  CheckCircle2,
  HelpCircle,
  Layers,
  Pencil,
  Plus,
  Ruler,
  Spline,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useActionState, useRef, useState, type PointerEvent } from "react";
import type { PlanFileLink } from "@/components/pro/plan-viewer";
import { Alert, Button, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { addPlanMeasures } from "@/lib/artisan/tender-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.tenders.plan.measure;

type Tool = "echelle" | "surface" | "longueur" | "comptage" | "contour";
const TOOLS: { tool: Tool; icon: typeof Ruler }[] = [
  { tool: "echelle", icon: Ruler },
  { tool: "surface", icon: Layers },
  { tool: "longueur", icon: Spline },
  { tool: "comptage", icon: Plus },
  { tool: "contour", icon: Pencil },
];
const ZOOMS = [1, 1.5, 2, 3] as const;

type Measure = {
  key: string;
  kind: PlanMarkKind;
  name: string;
  /** Image mesurée (fichier × 1 000 + page), puis fichier déposé et page, à partir de 1. */
  image: number;
  file: number;
  page: number;
  points: PlanPoint[];
  roomId: string | null;
  trade: string;
  measure: PlanMarkMeasure;
};

/** Mesure en clair : « 14,62 m² · périmètre 15,40 ml », « 2,69 ml », « 6 u ». */
function label(m: PlanMarkMeasure): string {
  if (m.kind === "surface") {
    return t.live.surface(
      formatPlanMeasure(Math.round(m.areaCm2 / 10)),
      formatPlanMeasure(m.perimeterMm),
    );
  }
  return m.kind === "longueur"
    ? t.live.longueur(formatPlanMeasure(m.lengthMm))
    : t.live.comptage(m.count);
}

/**
 * Métré à la main sur le plan (F-159 lot 3, ADR 0327), maquette du lot 53 (planche 2) : la photo du
 * plan avec ses outils (caler l'échelle, surface, longueur, compter, corriger un contour), les
 * mesures prises à droite, puis « Ajouter au relevé ». Les calculs sont ceux de packages/core ;
 * l'échelle vient du tracé de MENAO, ou de deux clics sur une cote connue.
 */
export function PlanMeasure({
  tenderId,
  files,
  traces,
  rooms,
  trades,
}: {
  tenderId: string;
  /** Plans déposés, avec leur lien signé ; seules les photos se mesurent. */
  files: PlanFileLink[];
  traces: PlanTrace[];
  rooms: { id: string; name: string }[];
  trades: { code: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(addPlanMeasures, initialFormState);
  // Images mesurables : les photos, et les pages de PDF rendues en images (ADR 0328). `index`
  // les distingue (fichier × 1 000 + page).
  const images = files.flatMap((f, i) =>
    f.kind !== "pdf"
      ? f.url
        ? [{ name: f.name, url: f.url, file: i + 1, page: 1, index: (i + 1) * 1000 + 1 }]
        : []
      : (f.pages ?? []).flatMap((p) =>
          p.url
            ? [
                {
                  name: `${f.name} · ${fr.pro.tenders.plan.viewerPage(p.page)}`,
                  url: p.url,
                  file: i + 1,
                  page: p.page,
                  index: (i + 1) * 1000 + p.page,
                },
              ]
            : [],
        ),
  );
  const [current, setCurrent] = useState(images[0]?.index ?? 0);
  const [sizes, setSizes] = useState<Record<number, { width: number; height: number }>>({});
  const [calibrated, setCalibrated] = useState<Record<number, { mmPerPx: number; cm: string }>>({});
  const [tool, setTool] = useState<Tool>("surface");
  const [points, setPoints] = useState<PlanPoint[]>([]);
  const [editing, setEditing] = useState<{ roomId: string | null; name: string } | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [zoom, setZoom] = useState<(typeof ZOOMS)[number]>(1);
  const [value, setValue] = useState("");
  const [draft, setDraft] = useState<{
    kind: PlanMarkKind;
    points: PlanPoint[];
    name: string;
    roomId: string;
    trade: string;
  } | null>(null);
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [count, setCount] = useState(0);
  const svg = useRef<SVGSVGElement>(null);

  const file = images.find((f) => f.index === current);
  const trace = traces.find((x) => x.file === file?.file && (x.page ?? 1) === file.page);
  const size = trace ? { width: trace.width, height: trace.height } : sizes[current];
  const mmPerPx = calibrated[current]?.mmPerPx ?? (trace ? trace.umPerPx / 1000 : null);
  const kind: PlanMarkKind | null =
    tool === "surface" || tool === "contour" ? "surface" : tool === "echelle" ? null : tool;
  const live = kind && points.length ? measureMark(kind, points, mmPerPx) : null;
  const needsScale = (tool === "surface" || tool === "longueur" || tool === "contour") && !mmPerPx;

  function reset(next?: Tool) {
    setPoints([]);
    setEditing(null);
    setDrag(null);
    setValue("");
    if (next) setTool(next);
  }

  /** Position d'un clic dans les pixels de l'image. */
  function at(event: { clientX: number; clientY: number }): PlanPoint | null {
    const box = svg.current?.getBoundingClientRect();
    if (!box || !size || box.width === 0) return null;
    return {
      x: ((event.clientX - box.left) / box.width) * size.width,
      y: ((event.clientY - box.top) / box.height) * size.height,
    };
  }

  function finish(done: PlanPoint[]) {
    if (!kind || !measureMark(kind, done, mmPerPx)) return;
    const room = editing?.roomId ?? "";
    setDraft({
      kind,
      points: done,
      name: editing?.name ?? (kind === "surface" ? "" : (t.defaults[kind] ?? "")),
      roomId: room,
      trade: "",
    });
    reset();
  }

  function click(event: PointerEvent<SVGSVGElement>) {
    if (drag !== null || draft || needsScale) return;
    const p = at(event);
    if (!p || !size) return;
    if (tool === "contour" && !editing) return;
    if (tool === "echelle") {
      setPoints((list) => (list.length >= 2 ? [p] : [...list, p]));
      return;
    }
    if (tool === "surface" && points.length >= 3) {
      // Retour sur le premier point : le contour se ferme (14 px à l'écran).
      const first = points[0];
      const box = svg.current?.getBoundingClientRect();
      const near =
        first && box ? Math.hypot(p.x - first.x, p.y - first.y) * (box.width / size.width) : 99;
      if (near <= 14) return finish(points);
    }
    setPoints((list) => [...list, p]);
  }

  /** Corriger un contour : la pièce tracée par MENAO devient un tracé à retoucher. */
  function pick(name: string, contour: string) {
    if (tool !== "contour" || editing || !size) return;
    const parsed = parseContour(contour, size.width, size.height);
    if (!parsed) return;
    const room = rooms.find((r) => planNameKey(r.name) === planNameKey(name));
    setEditing({ roomId: room?.id ?? null, name: room?.name ?? name });
    setPoints(parsed);
  }

  function calibrate() {
    const [a, b] = points;
    const cm = Number(value.replace(",", ".").trim());
    const scale = a && b && cm > 0 ? scaleFromCalibration(a, b, Math.round(cm * 10)) : null;
    if (!scale) return;
    setCalibrated((all) => ({ ...all, [current]: { mmPerPx: scale, cm: value.trim() } }));
    reset("surface");
  }

  function addDraft() {
    if (!draft) return;
    const measure = measureMark(draft.kind, draft.points, mmPerPx);
    const room = rooms.find((r) => r.id === draft.roomId);
    const name = (room?.name ?? draft.name).trim();
    if (!measure || !name) return;
    setMeasures((list) => [
      ...list,
      {
        key: `mesure-${count}`,
        kind: draft.kind,
        name,
        image: current,
        file: file?.file ?? 1,
        page: file?.page ?? 1,
        points: draft.points,
        roomId: room?.id ?? null,
        trade: draft.trade,
        measure,
      },
    ]);
    setCount((n) => n + 1);
    setDraft(null);
  }

  function submit(formData: FormData) {
    formData.set("tenderId", tenderId);
    formData.set(
      "measures",
      JSON.stringify(
        measures.map((m) => ({
          kind: m.kind,
          name: m.name,
          file: m.file,
          page: m.page,
          points: contourText(m.points),
          ...(m.measure.kind === "surface"
            ? { roomId: m.roomId, areaCm2: m.measure.areaCm2, perimeterMm: m.measure.perimeterMm }
            : {
                trade: m.trade || null,
                quantityMilli:
                  m.measure.kind === "longueur" ? m.measure.lengthMm : m.measure.count * 1000,
              }),
        })),
      ),
    );
    formAction(formData);
  }

  const back = `/pro/demandes/appels-offres/${tenderId}?etape=releve` as Route;
  if (!file) {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <Alert tone="info">{t.noImage}</Alert>
        <Link href={back} className="self-start text-sm font-semibold text-primary-strong">
          ← {t.back}
        </Link>
      </div>
    );
  }

  const path = (list: readonly PlanPoint[]) => list.map((p) => `${p.x},${p.y}`).join(" ");
  const drawn = measures.filter((m) => m.image === current);
  const side = "flex w-full flex-col gap-4 lg:w-[22rem] lg:shrink-0";
  const card = "flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card";
  const field = `${inputClasses} !min-h-10 w-full px-2.5 text-sm`;
  const caption = "flex flex-col gap-1 text-xs font-semibold text-muted-foreground";
  const last = points[points.length - 1];

  return (
    <form action={submit} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Link
        href={back}
        className="self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        ← {t.back}
      </Link>
      <div className="flex flex-col items-start gap-5 lg:flex-row">
        <section
          aria-label={t.boardLabel}
          className="flex w-full min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card"
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
            <div role="toolbar" aria-label={t.toolsLabel} className="flex flex-wrap gap-2">
              {TOOLS.map(({ tool: item, icon: Icon }) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={tool === item}
                  onClick={() => reset(item)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-input border border-border bg-surface px-3 text-sm font-semibold hover:bg-background aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-surface"
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {t.tools[item]}
                </button>
              ))}
            </div>
            <span className="ml-auto flex flex-wrap items-center gap-3 text-sm">
              <span
                className={`inline-flex items-center gap-1.5 font-semibold ${mmPerPx ? "text-success" : "text-warning"}`}
              >
                {mmPerPx && <CheckCircle2 aria-hidden="true" className="size-4" />}
                {calibrated[current]
                  ? t.scaleSet(calibrated[current].cm)
                  : mmPerPx
                    ? t.scaleFromTrace
                    : t.scaleMissing}
              </span>
              <span className="inline-flex items-center gap-1">
                {(
                  [
                    [ZoomOut, t.zoomOut, -1],
                    [ZoomIn, t.zoomIn, 1],
                  ] as const
                ).map(([Icon, name, step]) => (
                  <button
                    key={name}
                    type="button"
                    aria-label={name}
                    onClick={() =>
                      setZoom(
                        ZOOMS[
                          Math.min(ZOOMS.length - 1, Math.max(0, ZOOMS.indexOf(zoom) + step))
                        ] ?? 1,
                      )
                    }
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </button>
                ))}
              </span>
            </span>
          </div>
          {images.length > 1 && (
            <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
              {images.map((f) => (
                <button
                  key={f.index}
                  type="button"
                  aria-pressed={current === f.index}
                  onClick={() => {
                    setCurrent(f.index);
                    reset();
                    setDraft(null);
                  }}
                  className="max-w-56 truncate rounded-pill px-3.5 py-1.5 text-sm font-medium whitespace-nowrap hover:bg-background aria-pressed:bg-foreground aria-pressed:font-semibold aria-pressed:text-surface"
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}
          <div className="max-h-[42rem] overflow-auto bg-background">
            <div
              className="relative"
              style={{
                width: `${zoom * 100}%`,
                aspectRatio: size ? `${size.width} / ${size.height}` : undefined,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- lien signé du stockage privé. */}
              <img
                src={file.url ?? ""}
                alt={fr.pro.tenders.plan.viewerTitle(file.name)}
                className={size ? "absolute inset-0 size-full select-none" : "w-full select-none"}
                draggable={false}
                onLoad={(event) => {
                  const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
                  if (width && height)
                    setSizes((all) => ({ ...all, [file.index]: { width, height } }));
                }}
              />
              {size && (
                <svg
                  ref={svg}
                  viewBox={`0 0 ${size.width} ${size.height}`}
                  role="img"
                  aria-label={t.boardLabel}
                  className={`absolute inset-0 size-full touch-none ${needsScale ? "cursor-not-allowed" : "cursor-crosshair"}`}
                  onPointerUp={(event) => {
                    if (drag !== null) return setDrag(null);
                    click(event);
                  }}
                  onPointerMove={(event) => {
                    if (drag === null) return;
                    const p = at(event);
                    if (p) setPoints((list) => list.map((q, i) => (i === drag ? p : q)));
                  }}
                >
                  {/* Contours tracés par MENAO : à choisir avec « Corriger un contour ». */}
                  {!editing &&
                    trace?.rooms.map((room, i) => (
                      <polygon
                        key={`${i}-${room.name}`}
                        points={room.contour}
                        vectorEffect="non-scaling-stroke"
                        strokeWidth={2}
                        strokeDasharray="7 4"
                        onPointerUp={(event) => {
                          if (tool !== "contour") return;
                          event.stopPropagation();
                          pick(room.name, room.contour);
                        }}
                        className={`stroke-warning ${tool === "contour" ? "cursor-pointer fill-warning-soft/50 hover:fill-warning-soft/80" : "pointer-events-none fill-warning-soft/20"}`}
                      />
                    ))}
                  {/* Mesures déjà prises sur ce plan. */}
                  {drawn.map((m) =>
                    m.kind === "surface" ? (
                      <polygon
                        key={m.key}
                        points={path(m.points)}
                        vectorEffect="non-scaling-stroke"
                        strokeWidth={2}
                        className="pointer-events-none fill-primary-soft/50 stroke-primary"
                      />
                    ) : m.kind === "longueur" ? (
                      <polyline
                        key={m.key}
                        points={path(m.points)}
                        vectorEffect="non-scaling-stroke"
                        strokeWidth={4}
                        fill="none"
                        className="pointer-events-none stroke-primary-strong"
                      />
                    ) : (
                      <g key={m.key} className="pointer-events-none">
                        {m.points.map((p, i) => (
                          <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={size.width / 160}
                            className="fill-success"
                          />
                        ))}
                      </g>
                    ),
                  )}
                  {/* Tracé en cours. */}
                  {points.length > 0 &&
                    (kind === "surface" ? (
                      <polygon
                        points={path(points)}
                        vectorEffect="non-scaling-stroke"
                        strokeWidth={3}
                        className="pointer-events-none fill-primary-soft/40 stroke-primary"
                      />
                    ) : kind === "comptage" ? null : (
                      <polyline
                        points={path(points)}
                        vectorEffect="non-scaling-stroke"
                        strokeWidth={3}
                        fill="none"
                        className={`pointer-events-none ${tool === "echelle" ? "stroke-success" : "stroke-primary"}`}
                      />
                    ))}
                  {points.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={size.width / (i === 0 && tool === "surface" ? 130 : 180)}
                      vectorEffect="non-scaling-stroke"
                      strokeWidth={3}
                      onPointerDown={(event) => {
                        // Le premier point ferme une surface : il ne se déplace qu'en correction.
                        if (i === 0 && tool === "surface" && points.length >= 3) return;
                        event.stopPropagation();
                        setDrag(i);
                      }}
                      className={`cursor-grab fill-surface ${tool === "echelle" ? "stroke-success" : kind === "comptage" ? "stroke-success" : "stroke-primary"}`}
                    />
                  ))}
                </svg>
              )}
            </div>
          </div>
          <p className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <HelpCircle aria-hidden="true" className="size-4 shrink-0" />
              {needsScale ? t.needScale : t.hints[tool]}
            </span>
            {live && last && <b className="text-foreground">{label(live)}</b>}
            {points.length > 0 && (
              <span className="ml-auto flex flex-wrap gap-3 font-semibold">
                <button type="button" onClick={() => setPoints((list) => list.slice(0, -1))}>
                  {t.undo}
                </button>
                <button type="button" onClick={() => reset()}>
                  {t.cancel}
                </button>
                {kind && live && (tool !== "surface" || editing) && (
                  <button
                    type="button"
                    className="text-primary-strong"
                    onClick={() => finish(points)}
                  >
                    {t.finish}
                  </button>
                )}
              </span>
            )}
          </p>
        </section>

        <aside className={side}>
          {tool === "echelle" && points.length === 2 && (
            <section className={card}>
              <h2 className="text-lg font-semibold">{t.calibrateTitle}</h2>
              <p className="text-sm text-muted-foreground">{t.calibrateText}</p>
              <label className={caption}>
                {t.calibrateValue}
                <input
                  value={value}
                  inputMode="decimal"
                  autoFocus
                  onChange={(event) => setValue(event.target.value)}
                  className={`${field} text-foreground`}
                />
              </label>
              <Button
                type="button"
                onClick={calibrate}
                disabled={!(Number(value.replace(",", ".")) > 0)}
              >
                {t.calibrateApply}
              </Button>
            </section>
          )}
          {draft && (
            <section className={card}>
              <h2 className="text-lg font-semibold">{t.pendingTitle}</h2>
              <p className="text-sm font-semibold">
                {(() => {
                  const m = measureMark(draft.kind, draft.points, mmPerPx);
                  return m ? label(m) : "";
                })()}
              </p>
              {draft.kind === "surface" && (
                <label className={caption}>
                  {t.room}
                  <select
                    value={draft.roomId}
                    onChange={(event) => setDraft({ ...draft, roomId: event.target.value })}
                    className={`${field} text-foreground`}
                  >
                    <option value="">{t.newRoom}</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {(draft.kind !== "surface" || !draft.roomId) && (
                <label className={caption}>
                  {t.name}
                  <input
                    value={draft.name}
                    maxLength={draft.kind === "surface" ? 80 : 120}
                    autoFocus
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    className={`${field} text-foreground`}
                  />
                </label>
              )}
              {draft.kind !== "surface" && (
                <label className={caption}>
                  {t.trade}
                  <select
                    value={draft.trade}
                    onChange={(event) => setDraft({ ...draft, trade: event.target.value })}
                    className={`${field} text-foreground`}
                  >
                    <option value="">{t.noTrade}</option>
                    {trades.map((trade) => (
                      <option key={trade.code} value={trade.code}>
                        {trade.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={addDraft}
                  disabled={!draft.roomId && !draft.name.trim()}
                >
                  {t.add}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setDraft(null)}>
                  {t.cancel}
                </Button>
              </div>
            </section>
          )}
          <section className={card}>
            <h2 className="text-lg font-semibold">{t.listTitle}</h2>
            {measures.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.listEmpty}</p>
            ) : (
              <ul className="flex flex-col">
                {measures.map((m) => (
                  <li key={m.key} className="flex items-center gap-3 border-t border-border py-2.5">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <b className="truncate text-sm">{m.name}</b>
                      <span className="text-xs text-muted-foreground">
                        {[t.kinds[m.kind], trades.find((x) => x.code === m.trade)?.label]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <b className="text-sm whitespace-nowrap tabular-nums">
                      {m.measure.kind === "surface"
                        ? `${formatPlanMeasure(Math.round(m.measure.areaCm2 / 10))} m²`
                        : label(m.measure)}
                    </b>
                    <button
                      type="button"
                      aria-label={t.remove(m.name)}
                      onClick={() => setMeasures((list) => list.filter((x) => x.key !== m.key))}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <HelpCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {t.listNote}
            </p>
          </section>
          <section className={card}>
            <h2 className="text-lg font-semibold">{t.doneTitle}</h2>
            <p className="text-sm text-muted-foreground">{t.doneText}</p>
            <Button type="submit" disabled={pending || measures.length === 0}>
              {pending ? t.submitting : t.submit}
            </Button>
          </section>
        </aside>
      </div>
    </form>
  );
}
