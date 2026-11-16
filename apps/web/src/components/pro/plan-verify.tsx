"use client";

import {
  formatPlanMeasure,
  measureMark,
  parseContour,
  parseQuantity,
  planNameKey,
  verifyProgress,
  wallQuantityMilli,
  type PlanPoint,
  type PlanSymbol,
  type PlanTrace,
  type VerifyPoint,
} from "@menao/core";
import { AlertTriangle, Check, ChevronLeft, Ruler, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { startTransition, useActionState, useRef, useState, type MouseEvent } from "react";
import type { PlanFileLink } from "@/components/pro/plan-viewer";
import { Alert, Button, buttonClasses, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { checkPlanPoint } from "@/lib/artisan/tender-actions";
import type { PlanSymbolPage, TenderRoom, TenderWork } from "@/lib/artisan/tenders";
import { initialFormState } from "@/lib/auth/form";

const v = fr.pro.tenders.plan.verify;
const families = fr.pro.tenders.plan.works.symbols.families as Record<string, string>;
const units = fr.pro.tenders.plan.works.units;

/** Ce qu'il faut faire pour un point, en une ligne (liste « À vérifier » et « Ensuite »). */
function pointText(p: VerifyPoint, lotLabels: Record<string, string>) {
  if (p.kind === "room") return { title: p.name, detail: v.room[p.reason] };
  if (p.kind === "work") {
    const room = p.room ? ` · ${p.room}` : "";
    return {
      title: `${p.name}${room}`,
      detail: v.work[p.hint ?? "none"] ?? v.work.none!,
      lot: lotLabels[p.lot] ?? p.lot,
    };
  }
  return { title: families[p.type] ?? p.type, detail: v.symbol(p.total) };
}

/**
 * Carte « À vérifier » (maquette GuideOuvrages, lot 56) : « N faits sur M », la barre de progression,
 * les premiers points (faits barrés), puis « Vérifier point par point ».
 */
export function VerifyCard({
  points,
  lotLabels,
  href,
}: {
  points: VerifyPoint[];
  lotLabels: Record<string, string>;
  href: string;
}) {
  const { done, total, open } = verifyProgress(points);
  const first = points.slice(0, 5);
  const rest = points.slice(5);
  const row = (p: VerifyPoint) => {
    const { title, detail } = pointText(p, lotLabels);
    return (
      <li key={p.key} className="flex items-start gap-2.5 border-t border-border py-2">
        {p.done ? (
          <span
            aria-label={v.done}
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-white"
          >
            <Check aria-hidden="true" className="size-3" strokeWidth={3} />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 rounded-full border-2 border-warning"
          />
        )}
        <span
          className={`flex min-w-0 flex-col gap-0.5 ${p.done ? "text-muted-foreground line-through" : ""}`}
        >
          <b className="text-[0.8125rem] leading-snug">{title}</b>
          <span className="text-xs text-muted-foreground">{detail}</span>
        </span>
      </li>
    );
  };
  return (
    <section
      aria-label={v.title}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{v.title}</h2>
        {total > 0 && (
          <span className="text-sm text-muted-foreground">{v.progress(done, total)}</span>
        )}
      </div>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">{v.empty}</p>
      ) : (
        <>
          <div
            role="progressbar"
            aria-label={v.progressLabel}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            className="h-2 overflow-hidden rounded-pill bg-background"
          >
            <div
              className="h-full rounded-pill bg-success"
              style={{ width: `${Math.round((done / total) * 100)}%` }}
            />
          </div>
          <ul className="flex flex-col">{first.map(row)}</ul>
          {rest.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-semibold text-primary-strong">
                {v.more(rest.length)}
              </summary>
              <ul className="mt-1 flex flex-col">{rest.map(row)}</ul>
            </details>
          )}
          <Link
            href={href as Route}
            className={buttonClasses({ variant: open ? "primary" : "secondary" })}
          >
            {open ? v.start : v.review}
          </Link>
        </>
      )}
    </section>
  );
}

/** Image d'une page de plan : photo, ou page de PDF rendue en image. */
function imageOf(files: PlanFileLink[], file: number | null, page: number | null) {
  const link = files[(file ?? 1) - 1];
  if (!link) return null;
  if (link.kind !== "pdf") return link.url;
  return link.pages?.find((p) => p.page === (page ?? 1))?.url ?? null;
}

/**
 * Plan affiché à gauche, à la taille de l'écran : l'image et ce qui est dessiné dessus, dans les
 * pixels de l'image ; un clic donne sa position dans l'image.
 */
function PlanPane({
  url,
  size,
  hint,
  onPoint,
  children,
}: {
  url: string | null;
  size: { width: number; height: number } | null;
  hint: string;
  onPoint?: (p: PlanPoint) => void;
  children?: React.ReactNode;
}) {
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const box = size ?? natural;
  function click(event: MouseEvent<SVGSVGElement>) {
    const rect = svg.current?.getBoundingClientRect();
    if (!onPoint || !rect || !box || rect.width === 0) return;
    onPoint({
      x: ((event.clientX - rect.left) / rect.width) * box.width,
      y: ((event.clientY - rect.top) / rect.height) * box.height,
    });
  }
  return (
    <section className="flex w-full min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <p className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-sm text-muted-foreground">
        <Ruler aria-hidden="true" className="size-4 shrink-0" />
        {hint}
      </p>
      {url ? (
        <div className="relative bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element -- lien signé, pas d'optimisation Vercel (règle 13) */}
          <img
            src={url}
            alt=""
            className="block h-auto w-full"
            onLoad={(e) =>
              setNatural({
                width: e.currentTarget.naturalWidth,
                height: e.currentTarget.naturalHeight,
              })
            }
          />
          {box && (
            <svg
              ref={svg}
              viewBox={`0 0 ${box.width} ${box.height}`}
              preserveAspectRatio="none"
              onClick={click}
              className={`absolute inset-0 size-full ${onPoint ? "cursor-crosshair" : ""}`}
            >
              {children}
            </svg>
          )}
        </div>
      ) : (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">{v.noPlan}</p>
      )}
    </section>
  );
}

const field = `${inputClasses} !min-h-11 w-full px-3 text-right tabular-nums`;
const caption = "flex flex-col gap-1 text-sm font-semibold text-label";

/** Saisie d'une mesure : « 2,70 » → millièmes ; vide ou invalide → null. */
const milliOf = (text: string) => (text.trim() ? parseQuantity(text) : null);

/**
 * Vérifier point par point (maquette GuideVerifier, lot 56, ADR 0343) : le plan au bon endroit,
 * une question à la fois, « Valider et suivant » ou « Je le ferai plus tard ». Chaque validation
 * s'enregistre aussitôt ; le compteur descend jusqu'à zéro.
 */
export function PlanVerifier({
  tenderId,
  points,
  rooms,
  works,
  files,
  traces,
  symbols,
  symbolPages,
  lotLabels,
  closeHref,
  electricityHref,
}: {
  tenderId: string;
  points: VerifyPoint[];
  rooms: TenderRoom[];
  works: TenderWork[];
  files: PlanFileLink[];
  traces: PlanTrace[];
  symbols: PlanSymbol[];
  symbolPages: PlanSymbolPage[];
  lotLabels: Record<string, string>;
  closeHref: string;
  electricityHref: string;
}) {
  const [state, formAction, pending] = useActionState(checkPlanPoint, initialFormState);
  const [currentKey, setCurrentKey] = useState<string | null>(
    () => (points.find((p) => !p.done) ?? points[0])?.key ?? null,
  );
  const [finished, setFinished] = useState(false);
  const { done, total } = verifyProgress(points);
  const index = Math.max(
    0,
    points.findIndex((p) => p.key === currentKey),
  );
  const point = finished ? undefined : points[index];

  /** Point suivant encore à faire, après celui-ci (puis depuis le début). */
  function nextOpen(after: number, skip?: string) {
    const order = [...points.slice(after + 1), ...points.slice(0, after + 1)];
    return order.find((p) => !p.done && p.key !== skip) ?? null;
  }
  function goNext(skip?: string) {
    const next = nextOpen(index, skip);
    if (next) setCurrentKey(next.key);
    else setFinished(true);
  }

  function validate(values: { target?: string; value?: number | null; heightMm?: number | null }) {
    if (!point) return;
    const formData = new FormData();
    formData.set("tenderId", tenderId);
    formData.set("key", point.key);
    if (values.target) formData.set("target", values.target);
    if (values.value != null) formData.set("value", String(values.value));
    if (values.heightMm != null) formData.set("heightMm", String(values.heightMm));
    startTransition(() => formAction(formData));
    goNext(point.key);
  }

  const header = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={closeHref as Route}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <X aria-hidden="true" className="size-4" />
          {v.close}
        </Link>
        {point && <b className="text-[0.9375rem]">{v.position(index + 1, total)}</b>}
        <span role="status" className="text-sm text-muted-foreground">
          {pending ? v.saving : v.saved}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={v.progressLabel}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="h-2 overflow-hidden rounded-pill bg-background"
      >
        <div
          className="h-full rounded-pill bg-primary"
          style={{ width: `${total ? Math.round((done / total) * 100) : 100}%` }}
        />
      </div>
    </div>
  );

  if (!point) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <section className="flex max-w-xl flex-col items-start gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
          <h2 className="text-xl font-semibold">{v.finishedTitle}</h2>
          <p className="text-sm text-muted-foreground">{v.finishedText}</p>
          <Link href={closeHref as Route} className={buttonClasses({ block: false })}>
            {v.finishedBack}
          </Link>
        </section>
      </div>
    );
  }

  const upcoming = [...points.slice(index + 1), ...points.slice(0, index)]
    .filter((p) => !p.done)
    .slice(0, 3);
  const nav = (
    <div className="flex items-center justify-between gap-3 text-sm font-semibold">
      <button
        type="button"
        disabled={index === 0}
        onClick={() => setCurrentKey(points[index - 1]?.key ?? currentKey)}
        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        {v.previous}
      </button>
      <button type="button" onClick={() => goNext()} className="text-primary-strong">
        {v.later}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {header}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <PointStep
        // Un écran neuf par point : saisies et tracé repartent de zéro.
        key={point.key}
        point={point}
        rooms={rooms}
        works={works}
        files={files}
        traces={traces}
        symbols={symbols}
        symbolPages={symbolPages}
        lotLabels={lotLabels}
        electricityHref={electricityHref}
        pending={pending}
        nav={nav}
        upcoming={upcoming.map((p) => pointText(p, lotLabels))}
        onValidate={validate}
      />
    </div>
  );
}

function PointStep({
  point,
  rooms,
  works,
  files,
  traces,
  symbols,
  symbolPages,
  lotLabels,
  electricityHref,
  pending,
  nav,
  upcoming,
  onValidate,
}: {
  point: VerifyPoint;
  rooms: TenderRoom[];
  works: TenderWork[];
  files: PlanFileLink[];
  traces: PlanTrace[];
  symbols: PlanSymbol[];
  symbolPages: PlanSymbolPage[];
  lotLabels: Record<string, string>;
  electricityHref: string;
  pending: boolean;
  nav: React.ReactNode;
  upcoming: { title: string; detail: string }[];
  onValidate: (values: {
    target?: string;
    value?: number | null;
    heightMm?: number | null;
  }) => void;
}) {
  const room = point.kind === "room" ? rooms.find((r) => r.id === point.id) : undefined;
  const work = point.kind === "work" ? works.find((w) => w.id === point.id) : undefined;
  // Pièce de l'ouvrage : sa hauteur sert à la surface d'une cloison tracée.
  const workRoom =
    point.kind === "work" && point.room
      ? rooms.find((r) => planNameKey(r.name) === planNameKey(point.room!))
      : undefined;
  const heightOf = (mm: number | null | undefined) => (mm ? formatPlanMeasure(mm) : "");
  const [area, setArea] = useState(() =>
    point.kind === "room" && point.areaCm2 ? formatPlanMeasure(Math.round(point.areaCm2 / 10)) : "",
  );
  const [height, setHeight] = useState(() =>
    heightOf(point.kind === "room" ? point.heightMm : (workRoom?.height_mm ?? null)),
  );
  const [length, setLength] = useState("");
  const [quantity, setQuantity] = useState("");
  const [line, setLine] = useState<PlanPoint[]>([]);

  // Page à montrer : celle de la pièce ou de l'ouvrage, sinon la première page comptée.
  const symbolPage =
    point.kind === "symbol"
      ? (symbolPages.find((p) =>
          symbols.some(
            (s) => s.type === point.type && s.doubt && s.file === p.file && s.page === p.page,
          ),
        ) ?? symbolPages[0])
      : undefined;
  const where =
    point.kind === "room"
      ? { file: room?.file_index ?? 1, page: room?.page ?? 1 }
      : point.kind === "work"
        ? { file: work?.file_index ?? 1, page: work?.page ?? 1 }
        : { file: symbolPage?.file ?? 1, page: symbolPage?.page ?? 1 };
  const trace = traces.find((x) => x.file === where.file && (x.page ?? 1) === where.page);
  const size = trace
    ? { width: trace.width, height: trace.height }
    : symbolPage
      ? { width: symbolPage.width, height: symbolPage.height }
      : null;
  const url = imageOf(files, where.file, where.page);
  const mmPerPx = trace ? trace.umPerPx / 1000 : null;

  const traced =
    point.kind === "work" && line.length >= 2 ? measureMark("longueur", line, mmPerPx) : null;
  const lengthMm = traced?.kind === "longueur" ? traced.lengthMm : (milliOf(length) ?? null);
  const heightMm = milliOf(height);
  const hint = point.kind === "work" ? point.hint : null;
  const traceable = hint === "length" || hint === "wall";

  // Valeur validée selon le point.
  let value: number | null = null;
  if (point.kind === "room") {
    const m = milliOf(area);
    value = m ? m * 10 : null;
  } else if (point.kind === "work") {
    if (hint === "wall")
      value = lengthMm && heightMm ? wallQuantityMilli(lengthMm, heightMm) : null;
    else if (hint === "length") value = lengthMm;
    else value = milliOf(quantity);
    if (value !== null && point.workKind === "nombre") value = Math.round(value / 1000) * 1000;
  }
  const heightOk = heightMm === null || (heightMm >= 1500 && heightMm <= 10_000);
  const valid =
    point.kind === "symbol" ||
    (value !== null &&
      value > 0 &&
      (point.kind !== "room" || heightOk) &&
      (hint !== "wall" || heightOk));

  let eyebrow: string;
  let title: string;
  let lead: string;
  if (point.kind === "room") {
    eyebrow = v.eyebrowRoom;
    title = v.roomTitle(point.name);
    lead = v.roomLead[point.reason];
  } else if (point.kind === "work") {
    eyebrow = [lotLabels[point.lot] ?? point.lot, point.room].filter(Boolean).join(" · ");
    title = point.name;
    lead = v.workLead[hint ?? "none"] ?? v.workLead.none!;
  } else {
    const label = families[point.type] ?? point.type;
    eyebrow = v.eyebrowSymbol;
    title = v.symbolTitle(label);
    lead = v.symbolLead(point.total);
  }

  // Ce qui est dessiné sur le plan : la pièce, le tracé en cours, ou les symboles du type.
  const roomShape =
    point.kind === "room" && trace && size
      ? trace.rooms.find((r) => planNameKey(r.name) === planNameKey(point.name))
      : undefined;
  const roomPoints =
    roomShape && size ? parseContour(roomShape.contour, size.width, size.height) : null;
  const radius = size ? Math.max(6, Math.round(size.width / 140)) : 8;
  const overlay = (
    <>
      {roomPoints && (
        <polygon
          points={roomPoints.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="rgb(217 119 6 / 0.18)"
          stroke="rgb(217 119 6)"
          strokeWidth={radius / 2}
        />
      )}
      {line.length > 0 && (
        <>
          <polyline
            points={line.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#7c3aed"
            strokeWidth={radius / 1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {line.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={radius}
              fill={i === line.length - 1 ? "#7c3aed" : "#fff"}
              stroke="#7c3aed"
              strokeWidth={radius / 3}
            />
          ))}
        </>
      )}
      {point.kind === "symbol" &&
        symbols
          .filter((s) => s.type === point.type && s.file === where.file && s.page === where.page)
          .map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={radius * 1.4}
              fill={s.doubt ? "rgb(217 119 6 / 0.25)" : "rgb(37 99 235 / 0.18)"}
              stroke={s.doubt ? "rgb(217 119 6)" : "rgb(37 99 235)"}
              strokeWidth={radius / 3}
            />
          ))}
    </>
  );

  const planHint =
    point.kind === "work" && traceable
      ? mmPerPx
        ? v.traceHint
        : v.noScale
      : point.kind === "room"
        ? v.roomPlanHint
        : point.kind === "symbol"
          ? v.symbolPlanHint
          : v.planHint;

  return (
    <div className="flex flex-col items-start gap-5 lg:flex-row">
      <PlanPane
        url={url}
        size={size}
        hint={planHint}
        onPoint={
          point.kind === "work" && traceable && mmPerPx
            ? (p) => setLine((list) => [...list, p])
            : undefined
        }
      >
        {overlay}
      </PlanPane>
      <div className="flex w-full flex-col gap-4 lg:w-[23rem] lg:shrink-0">
        <section
          aria-label={title}
          className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card"
        >
          <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {eyebrow}
          </span>
          <h2 className="text-xl leading-snug font-semibold">{title}</h2>
          <p className="text-sm text-label">{lead}</p>

          {point.kind === "room" && (
            <div className="grid grid-cols-2 gap-3">
              <label className={caption}>
                {v.area}
                <input
                  inputMode="decimal"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className={field}
                />
              </label>
              <label className={caption}>
                {v.height}
                <input
                  inputMode="decimal"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className={field}
                />
              </label>
            </div>
          )}

          {point.kind === "work" && traceable && (
            <div className="flex flex-col gap-3 rounded-input bg-background p-3.5">
              <label className={caption}>
                {v.length}
                <input
                  inputMode="decimal"
                  value={traced?.kind === "longueur" ? formatPlanMeasure(traced.lengthMm) : length}
                  readOnly={traced !== null}
                  onChange={(e) => setLength(e.target.value)}
                  className={field}
                />
              </label>
              {line.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLine([])}
                  className="self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  {v.clear}
                </button>
              )}
              {hint === "wall" && (
                <>
                  <label className={caption}>
                    {point.room ? v.roomHeight(point.room) : v.roomHeightAny}
                    <input
                      inputMode="decimal"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className={field}
                    />
                  </label>
                  <p className="flex items-center justify-between border-t border-border pt-2.5 text-[0.9375rem] font-bold">
                    <span>{v.surface}</span>
                    <span className="text-primary-strong tabular-nums">
                      {value ? `${formatPlanMeasure(value)} ${units.surface}` : "—"}
                    </span>
                  </p>
                </>
              )}
            </div>
          )}

          {point.kind === "work" && !traceable && (
            <label className={caption}>
              {v.quantity(units[point.workKind] ?? "")}
              <input
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={field}
              />
            </label>
          )}

          {point.kind === "symbol" && (
            <Link
              href={electricityHref as Route}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-strong"
            >
              <AlertTriangle aria-hidden="true" className="size-4" />
              {v.symbolFix}
            </Link>
          )}

          <Button
            type="button"
            disabled={pending || !valid}
            onClick={() =>
              onValidate(
                point.kind === "symbol"
                  ? {}
                  : {
                      target: point.id,
                      value,
                      heightMm: point.kind === "room" ? heightMm : null,
                    },
              )
            }
          >
            <Check aria-hidden="true" className="size-4" />
            {point.kind === "symbol" ? v.confirm : v.validate}
          </Button>
          {nav}
        </section>
        {upcoming.length > 0 && (
          <section className="flex flex-col rounded-card border border-border bg-surface p-5 shadow-card">
            <h3 className="mb-1 font-semibold">{v.next}</h3>
            {upcoming.map((u) => (
              <p
                key={`${u.title}-${u.detail}`}
                className="flex justify-between gap-3 border-t border-border py-2 text-sm"
              >
                <span className="min-w-0 truncate">{u.title}</span>
                <span className="shrink-0 text-muted-foreground">{u.detail}</span>
              </p>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
