"use client";

import {
  ELECTRICAL_SYMBOLS,
  symbolCounts,
  symbolsInRooms,
  type PlanTrace,
  type SymbolKind,
} from "@menao/core";
import { CheckCircle2, HelpCircle, Plus, TriangleAlert, X } from "lucide-react";
import { useActionState, useMemo, useState, type MouseEvent } from "react";
import type { PlanFileLink } from "@/components/pro/plan-viewer";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { savePlanSymbols } from "@/lib/artisan/tender-actions";
import type { PlanSymbolPage } from "@/lib/artisan/tenders";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.tenders.plan.works.symbols;

type Draft = {
  key: string;
  type: SymbolKind;
  x: number;
  y: number;
  room: string | null;
  doubt: boolean;
};

export type PlanSymbolItem = Omit<Draft, "key"> & { file: number; page: number };

/** Familles affichées, dans l'ordre de la maquette (lot 55), avec leur couleur. */
const FAMILIES: { key: string; kinds: SymbolKind[]; color: string }[] = [
  { key: "point_lumineux", kinds: ["point_lumineux", "applique"], color: "#2563eb" },
  { key: "spot", kinds: ["spot"], color: "#0f766e" },
  { key: "prise", kinds: ["prise"], color: "#c026d3" },
  { key: "prise_specialisee", kinds: ["prise_specialisee"], color: "#7c3aed" },
  { key: "interrupteur", kinds: ["interrupteur", "commande_volet"], color: "#ea580c" },
  { key: "autre", kinds: ["tableau", "prise_rj45_tv", "detecteur"], color: "#475569" },
];
const familyOf = (kind: SymbolKind) =>
  FAMILIES.find((f) => f.kinds.includes(kind)) ?? (FAMILIES[5] as (typeof FAMILIES)[number]);
/** Colonnes du tableau par pièce. */
const COLUMNS: SymbolKind[] = [
  "point_lumineux",
  "spot",
  "prise",
  "prise_specialisee",
  "interrupteur",
];

const pageKey = (p: { file: number; page: number }) => `${p.file}-${p.page}`;

/**
 * Symboles comptés sur les plans d'électricité (F-159 lot 7, ADR 0336-0337), maquette du lot 55 :
 * le plan avec chaque symbole posé (le type choisi numéroté, les autres en points pâles), les
 * comptes par type, le groupe « à vérifier », la convention de dessin reconnue et le compte par
 * pièce. Un clic ajoute ou retire un symbole ; un symbole touché change de type.
 */
export function PlanSymbols({
  tenderId,
  symbols,
  pages,
  files,
  traces,
  hasDpgf,
}: {
  tenderId: string;
  symbols: PlanSymbolItem[];
  pages: PlanSymbolPage[];
  files: PlanFileLink[];
  traces: PlanTrace[];
  hasDpgf: boolean;
}) {
  const [state, formAction, pending] = useActionState(savePlanSymbols, initialFormState);
  const [current, setCurrent] = useState(pages[0] ? pageKey(pages[0]) : "");
  const [family, setFamily] = useState("prise");
  const [mode, setMode] = useState<"voir" | "ajouter" | "retirer">("voir");
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [added, setAdded] = useState(0);
  const initial = useMemo(() => {
    const byPage: Record<string, Draft[]> = {};
    symbols.forEach((s, i) => {
      (byPage[pageKey(s)] ??= []).push({
        key: `s${i}`,
        type: s.type,
        x: s.x,
        y: s.y,
        room: s.room,
        doubt: s.doubt,
      });
    });
    return byPage;
  }, [symbols]);
  const [drafts, setDrafts] = useState(initial);
  const [base, setBase] = useState(symbols);
  if (symbols !== base) {
    setBase(symbols);
    setDrafts(initial);
    setDirty(false);
  }

  const page = pages.find((p) => pageKey(p) === current) ?? pages[0];
  if (!page) return null;
  const items = drafts[pageKey(page)] ?? [];
  const link = files[page.file - 1];
  const image =
    link?.kind === "pdf"
      ? (link.pages?.find((p) => p.page === page.page)?.url ?? null)
      : (link?.url ?? null);
  const active = FAMILIES.find((f) => f.key === family) ?? FAMILIES[2];
  const counts = symbolCounts(
    Object.values(drafts)
      .flat()
      .filter((s) => ELECTRICAL_SYMBOLS.includes(s.type)),
  );
  const familyCount = (f: (typeof FAMILIES)[number]) =>
    f.kinds.reduce((n, k) => n + (counts[k]?.total ?? 0), 0);
  const doubts = items.filter((s) => s.doubt);
  const radius = Math.max(page.width, page.height) * 0.012;
  const rooms = [
    ...new Set(
      Object.values(drafts)
        .flat()
        .map((s) => s.room ?? ""),
    ),
  ].sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b, "fr")));
  const selectedItem = items.find((s) => s.key === selected) ?? null;

  const change = (next: Draft[]) => {
    setDirty(true);
    setDrafts((all) => ({ ...all, [pageKey(page)]: next }));
  };

  function place(event: MouseEvent<SVGSVGElement>) {
    if (mode !== "ajouter" || !page || !active) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.round(((event.clientX - box.left) / box.width) * page.width);
    const y = Math.round(((event.clientY - box.top) / box.height) * page.height);
    const kind = active.kinds[0] as SymbolKind;
    const [withRoom] = symbolsInRooms(
      [{ file: page.file, page: page.page, x, y, room: null as string | null }],
      traces,
    );
    setAdded((n) => n + 1);
    change([
      ...items,
      { key: `n${added}`, type: kind, x, y, room: withRoom?.room ?? null, doubt: false },
    ]);
  }

  function touch(item: Draft) {
    if (mode === "retirer") {
      change(items.filter((s) => s.key !== item.key));
      return;
    }
    if (mode === "voir") setSelected(item.key);
  }

  // Numéro de chaque symbole du type choisi, dans l'ordre de la page.
  const numbers = new Map(
    items.filter((s) => familyOf(s.type).key === family).map((s, i) => [s.key, i + 1] as const),
  );
  const tool = (on: boolean) =>
    `inline-flex h-9 items-center gap-1.5 rounded-input px-3 text-sm font-semibold ${
      on ? "bg-foreground text-surface" : "border border-border bg-surface hover:bg-background"
    }`;

  return (
    <form
      action={(formData) => {
        formData.set("tenderId", tenderId);
        formData.set("file", String(page.file));
        formData.set("page", String(page.page));
        formData.set(
          "symbols",
          JSON.stringify(items.map(({ type, x, y, room, doubt }) => ({ type, x, y, room, doubt }))),
        );
        formAction(formData);
      }}
      className="flex flex-col gap-5"
      aria-label={t.label}
    >
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && !dirty && <Alert tone="success">{state.success}</Alert>}
      <div className="flex flex-col items-start gap-5 lg:flex-row">
        <section className="flex w-full min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-3">
            {pages.map((p) => (
              <button
                key={pageKey(p)}
                type="button"
                aria-pressed={pageKey(p) === pageKey(page)}
                onClick={() => {
                  setCurrent(pageKey(p));
                  setSelected(null);
                }}
                className="max-w-56 truncate rounded-pill px-3.5 py-1.5 text-sm font-medium hover:bg-background aria-pressed:bg-foreground aria-pressed:font-semibold aria-pressed:text-surface"
              >
                {t.pageName(
                  files[p.file - 1]?.name ?? "",
                  p.page,
                  files[p.file - 1]?.kind === "pdf",
                )}
              </button>
            ))}
          </div>
          <div
            role="group"
            aria-label={t.familiesLabel}
            className="flex flex-wrap gap-2 border-b border-border px-3 py-3"
          >
            {FAMILIES.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={f.key === family}
                onClick={() => setFamily(f.key)}
                className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-border bg-surface px-3 text-[0.8125rem] font-semibold whitespace-nowrap aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-surface"
              >
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-full"
                  style={{ background: f.color }}
                />
                {t.families[f.key]} · {familyCount(f)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
            <button
              type="button"
              aria-pressed={mode === "ajouter"}
              onClick={() => setMode(mode === "ajouter" ? "voir" : "ajouter")}
              className={tool(mode === "ajouter")}
            >
              <Plus aria-hidden="true" className="size-4" />
              {t.add(t.families[family] ?? "")}
            </button>
            <button
              type="button"
              aria-pressed={mode === "retirer"}
              onClick={() => setMode(mode === "retirer" ? "voir" : "retirer")}
              className={tool(mode === "retirer")}
            >
              <X aria-hidden="true" className="size-4" />
              {t.remove}
            </button>
            {selectedItem && mode === "voir" ? (
              <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                {t.changeType}
                <select
                  value={selectedItem.type}
                  aria-label={t.changeType}
                  onChange={(e) =>
                    change(
                      items.map((s) =>
                        s.key === selectedItem.key
                          ? { ...s, type: e.target.value as SymbolKind, doubt: false }
                          : s,
                      ),
                    )
                  }
                  className="h-9 rounded-input border border-border bg-surface px-2 text-sm text-foreground"
                >
                  {ELECTRICAL_SYMBOLS.map((k) => (
                    <option key={k} value={k}>
                      {t.names[k]}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="ml-auto text-sm text-muted-foreground">
                {mode === "ajouter" ? t.hintAdd : mode === "retirer" ? t.hintRemove : t.hint}
              </span>
            )}
          </div>
          <div className="bg-background p-3">
            {image ? (
              <div
                className="relative mx-auto w-full"
                style={{
                  aspectRatio: `${page.width} / ${page.height}`,
                  maxWidth: `calc(36rem * ${page.width / page.height})`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- lien signé du stockage privé. */}
                <img
                  src={image}
                  alt={t.planAlt(link?.name ?? "")}
                  className="absolute inset-0 size-full"
                />
                <svg
                  viewBox={`0 0 ${page.width} ${page.height}`}
                  onClick={place}
                  className={`absolute inset-0 size-full ${mode === "ajouter" ? "cursor-crosshair" : ""}`}
                  role="img"
                  aria-label={t.overlayLabel}
                >
                  {items.map((s) => {
                    const f = familyOf(s.type);
                    const number = numbers.get(s.key);
                    const on = number !== undefined;
                    const label = `${t.names[s.type]} ${number ?? ""}`.trim();
                    return (
                      <g
                        key={s.key}
                        role="button"
                        aria-label={label}
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          touch(s);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            touch(s);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        {s.doubt && (
                          <circle
                            cx={s.x}
                            cy={s.y}
                            r={radius * 1.7}
                            fill="none"
                            className="stroke-warning"
                            strokeWidth={radius * 0.3}
                            strokeDasharray={`${radius * 0.6} ${radius * 0.4}`}
                          />
                        )}
                        {on ? (
                          <>
                            <circle
                              cx={s.x}
                              cy={s.y}
                              r={radius}
                              fill={f.color}
                              stroke={selected === s.key ? "#111827" : "none"}
                              strokeWidth={radius * 0.3}
                            />
                            <text
                              x={s.x}
                              y={s.y + radius * 0.38}
                              textAnchor="middle"
                              fontSize={radius * 1.05}
                              fontWeight={700}
                              fill="#fff"
                            >
                              {number}
                            </text>
                          </>
                        ) : (
                          <circle
                            cx={s.x}
                            cy={s.y}
                            r={radius * 0.45}
                            fill={f.color}
                            fillOpacity={0.6}
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">{t.noImage}</p>
            )}
          </div>
          <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">{t.note}</p>
        </section>

        <aside className="flex w-full flex-col gap-4 lg:w-[22rem] lg:shrink-0">
          <section className="flex flex-col gap-1 rounded-card border border-border bg-surface p-5 shadow-card">
            <h2 className="mb-1 text-lg font-semibold">{t.countedTitle}</h2>
            <ul className="flex flex-col">
              {FAMILIES.map((f) => (
                <li
                  key={f.key}
                  className="flex items-center gap-2.5 border-t border-border py-2 text-sm"
                >
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-full"
                    style={{ background: f.color }}
                  />
                  <span className="flex-1">{t.families[f.key]}</span>
                  <b className="tabular-nums">{familyCount(f)}</b>
                </li>
              ))}
            </ul>
            <p className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
              <HelpCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {t.countedNote}
            </p>
          </section>
          {doubts.length > 0 && (
            <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <TriangleAlert aria-hidden="true" className="size-5 text-warning" />
                {t.doubtTitle(doubts.length)}
              </h2>
              <p className="text-sm text-muted-foreground">{t.doubtText}</p>
              <button
                type="button"
                onClick={() => change(items.map((s) => ({ ...s, doubt: false })))}
                className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-primary-strong"
              >
                <CheckCircle2 aria-hidden="true" className="size-4" />
                {t.doubtDone}
              </button>
            </section>
          )}
          {page.lines.length > 0 && (
            <section className="flex flex-col gap-1 rounded-card border border-border bg-surface p-5 shadow-card">
              <h2 className="mb-1 text-lg font-semibold">{t.legendTitle}</h2>
              <ul className="flex flex-col">
                {page.lines.map((line) => (
                  <li key={line} className="border-t border-border py-1.5 text-sm text-label">
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-sm text-muted-foreground">{t.legendNote}</p>
            </section>
          )}
        </aside>
      </div>

      <div className="flex flex-col items-start gap-5 lg:flex-row">
        <section className="w-full min-w-0 flex-1 overflow-hidden rounded-card border border-border bg-surface shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <h2 className="text-lg font-semibold">{t.byRoomTitle}</h2>
            <span className="text-sm text-muted-foreground">{t.byRoomOrigin}</span>
          </div>
          <div className="overflow-x-auto">
            <table
              aria-label={t.byRoomTitle}
              className="w-full min-w-[36rem] border-collapse text-sm"
            >
              <thead className="bg-background text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-5 py-2.5 text-left">{t.room}</th>
                  {COLUMNS.map((k) => (
                    <th key={k} className="px-2 py-2.5 text-right">
                      {t.short[k]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room || "-"} className="border-t border-border">
                    <td className="px-5 py-2.5 font-semibold">{room || t.noRoom}</td>
                    {COLUMNS.map((k) => {
                      const n = counts[k]?.rooms[room] ?? 0;
                      return (
                        <td
                          key={k}
                          className={`px-2 py-2.5 text-right tabular-nums ${n ? "font-bold" : "text-muted-foreground"}`}
                        >
                          {n || "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t-2 border-border bg-background">
                  <td className="px-5 py-2.5 font-bold">{t.total}</td>
                  {COLUMNS.map((k) => (
                    <td key={k} className="px-2 py-2.5 text-right font-bold tabular-nums">
                      {counts[k]?.total ?? 0}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <aside className="flex w-full flex-col gap-4 lg:w-[22rem] lg:shrink-0">
          <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card">
            <h2 className="text-lg font-semibold">{t.okTitle}</h2>
            <p className="text-sm text-muted-foreground">{t.okText}</p>
            {hasDpgf && dirty && <p className="text-sm text-warning">{t.recreate}</p>}
            <Button type="submit" variant="secondary" disabled={pending || !dirty}>
              {pending ? t.saving : t.save}
            </Button>
          </section>
        </aside>
      </div>
    </form>
  );
}
