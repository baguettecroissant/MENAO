"use client";

import {
  formatQuantity,
  PLAN_COUNT_KEYS,
  parseQuantity,
  planNameKey,
  type PlanTrace,
} from "@menao/core";
import { HelpCircle, Plus, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useActionState, useMemo, useState, type ReactNode } from "react";
import { Alert, Button, StatusBadge, buttonClasses, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  PlanViewer,
  type PlanFileLink,
  type PlanOverlay,
  type PlanView,
} from "@/components/pro/plan-viewer";
import { savePlanRooms } from "@/lib/artisan/tender-actions";
import type { TenderRoom } from "@/lib/artisan/tenders";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.tenders.plan;

type Draft = {
  key: string;
  room: TenderRoom | null;
  level: string;
  name: string;
  area: string;
  perimeter: string;
  height: string;
  wet: boolean;
  habitable: boolean;
};

const metres = (milli: number | null) => (milli === null ? "" : formatQuantity(milli));

function toDraft(room: TenderRoom): Draft {
  return {
    key: room.id,
    room,
    level: room.level ?? "",
    name: room.name,
    // cm² → millièmes de m² (formatQuantity : 3 décimales au plus).
    area: room.area_cm2 === null ? "" : metres(Math.round(room.area_cm2 / 10)),
    perimeter: metres(room.perimeter_mm),
    height: metres(room.height_mm),
    wet: room.wet,
    habitable: room.habitable,
  };
}

/** Mesure saisie (en mètres) en entier ; null si vide, undefined si invalide. */
function measure(
  value: string,
  factor: number,
  min: number,
  max: number,
): number | null | undefined {
  if (!value.trim()) return null;
  const milli = parseQuantity(value);
  if (milli === null) return undefined;
  const result = milli * factor;
  return result >= min && result <= max ? result : undefined;
}

function parse(d: Draft) {
  return {
    id: d.room?.id ?? null,
    level: d.level.trim() || null,
    name: d.name.trim(),
    // Surface non retouchée : la valeur enregistrée, au cm² près. L'écran n'en montre que trois
    // décimales ; la relire ferait passer en « Saisi » une surface calculée ou estimée (113 803 cm²).
    areaCm2:
      d.room && d.area === toDraft(d.room).area
        ? d.room.area_cm2
        : measure(d.area, 10, 1, 100_000_000),
    perimeterMm: measure(d.perimeter, 1, 1, 2_000_000),
    heightMm: measure(d.height, 1, 1500, 10_000),
    wet: d.wet,
    habitable: d.habitable,
  };
}

function changed(d: Draft): boolean {
  if (!d.room) return true;
  const p = parse(d);
  const r = d.room;
  return (
    p.level !== r.level ||
    p.name !== r.name ||
    p.areaCm2 !== r.area_cm2 ||
    p.perimeterMm !== r.perimeter_mm ||
    p.heightMm !== r.height_mm ||
    p.wet !== r.wet ||
    p.habitable !== r.habitable
  );
}

/**
 * Relevé des plans (F-140, ADR 0291), maquette du lot 35 (écran 2) : le plan à gauche, un onglet
 * par fichier ; à droite ce que MENAO a lu et les éléments comptés ; dessous les pièces (surface,
 * périmètre, hauteur) avec l'origine de chaque mesure, modifiables, puis « Choisir les
 * revêtements ». Cliquer une pièce affiche la page du plan où elle a été lue.
 */
export function PlanReleve({
  tenderId,
  rooms,
  counts,
  files,
  summary,
  traces = [],
}: {
  tenderId: string;
  rooms: TenderRoom[];
  counts: Record<string, number | null>;
  files: PlanFileLink[];
  /** « MENAO a lu vos plans » (rendu par la page). */
  summary: ReactNode;
  /** Contours tracés sur les photos (mesure à l'échelle, F-159 lot 2). */
  traces?: PlanTrace[];
}) {
  const [state, formAction, pending] = useActionState(savePlanRooms, initialFormState);
  const [drafts, setDrafts] = useState<Draft[]>(() => rooms.map(toDraft));
  const [countDrafts, setCountDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(PLAN_COUNT_KEYS.map((k) => [k, counts[k] == null ? "" : String(counts[k])])),
  );
  const [dirty, setDirty] = useState(false);
  const [added, setAdded] = useState(0);
  const [selected, setSelected] = useState<string | null>(rooms[0]?.id ?? null);
  const [view, setView] = useState<PlanView>(() => ({
    file: Math.max(0, (rooms[0]?.file_index ?? 1) - 1),
    page: rooms[0]?.page ?? 1,
  }));
  // Relevé enregistré : la page renvoie les pièces de la base (identifiants des pièces ajoutées,
  // origines « saisi ») ; le brouillon repart de là.
  const [shown, setShown] = useState(rooms);
  if (rooms !== shown) {
    setShown(rooms);
    setDrafts(rooms.map(toDraft));
  }

  const parsed = useMemo(() => drafts.map(parse), [drafts]);
  const invalid =
    parsed.some(
      (p) =>
        !p.name ||
        p.areaCm2 === undefined ||
        p.perimeterMm === undefined ||
        p.heightMm === undefined,
    ) || Object.values(countDrafts).some((v) => v.trim() !== "" && !/^\d{1,3}$/.test(v.trim()));

  const update = (key: string, patch: Partial<Draft>) => {
    setDirty(true);
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  };

  function select(d: Draft) {
    setSelected(d.key);
    if (d.room?.file_index) setView({ file: d.room.file_index - 1, page: d.room.page ?? 1 });
  }

  function submit(formData: FormData) {
    formData.set("tenderId", tenderId);
    formData.set("rooms", JSON.stringify(parsed));
    formData.set(
      "counts",
      JSON.stringify(
        Object.fromEntries(
          Object.entries(countDrafts).map(([k, v]) => [k, v.trim() ? Number(v.trim()) : null]),
        ),
      ),
    );
    setDirty(false);
    formAction(formData);
  }

  function badge(d: Draft) {
    if (changed(d)) return <StatusBadge tone="neutral">{t.source.saisi}</StatusBadge>;
    const r = d.room;
    if (!r) return null;
    if (r.area_cm2 === null) return <StatusBadge tone="warning">{t.source.missing}</StatusBadge>;
    if (r.source === "estime") return <StatusBadge tone="warning">{t.source.estime}</StatusBadge>;
    if (r.source === "photo") return <StatusBadge tone="warning">{t.source.photo}</StatusBadge>;
    if (r.uncertain) return <StatusBadge tone="warning">{t.source.uncertain}</StatusBadge>;
    if (r.source === "cotes") return <StatusBadge tone="primary">{t.source.cotes}</StatusBadge>;
    if (r.source === "saisi") return <StatusBadge tone="neutral">{t.source.saisi}</StatusBadge>;
    return <StatusBadge tone="success">{t.source.plan(r.page)}</StatusBadge>;
  }

  // Contours du plan affiché : en ambre les pièces estimées, en bleu celles mesurées par ailleurs.
  const trace = traces.find((x) => x.file === view.file + 1);
  const overlay: PlanOverlay | null =
    trace && files[view.file]?.kind !== "pdf"
      ? {
          width: trace.width,
          height: trace.height,
          anchors: trace.anchors,
          shapes: trace.rooms.map((traced, i) => {
            const draft = drafts.find((d) => planNameKey(d.name) === planNameKey(traced.name));
            return {
              key: `${i}-${traced.name}`,
              points: traced.contour,
              tone: draft?.room?.source === "estime" && !changed(draft) ? "estimated" : "measured",
              selected: !!draft && draft.key === selected,
            };
          }),
        }
      : null;
  const cell = "px-2 py-2 align-middle";
  const numberInput = `${inputClasses} !min-h-10 !w-24 px-2.5 text-right tabular-nums`;
  const side = "flex w-full flex-col gap-4 lg:w-[22rem] lg:shrink-0";

  return (
    <form action={submit} className="flex flex-col gap-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && !dirty && <Alert tone="success">{state.success}</Alert>}

      <div className="flex flex-col items-start gap-5 lg:flex-row">
        <PlanViewer
          files={files}
          view={view}
          onView={setView}
          hint={t.viewerHint}
          overlay={overlay}
          note={
            overlay && (
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {(
                  [
                    ["border-primary bg-primary-soft", t.measure.legendMeasured],
                    ["border-dashed border-warning bg-warning-soft", t.measure.legendEstimated],
                    ["border-success bg-surface", t.measure.legendAnchor],
                  ] as const
                ).map(([style, label]) => (
                  <span key={label} className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className={`size-3.5 rounded-sm border-2 ${style}`} />
                    {label}
                  </span>
                ))}
              </span>
            )
          }
        />

        <div className={side}>
          {summary}
          <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card">
            <h2 className="text-lg font-semibold">{t.countsTitle}</h2>
            <div className="grid grid-cols-2 gap-x-4">
              {PLAN_COUNT_KEYS.map((k) => (
                <label
                  key={k}
                  className="flex items-center justify-between gap-2 border-t border-border py-1.5 text-sm"
                >
                  <span className="text-muted-foreground">{t.counts[k]}</span>
                  <input
                    value={countDrafts[k] ?? ""}
                    inputMode="numeric"
                    maxLength={3}
                    aria-invalid={
                      (countDrafts[k] ?? "").trim() !== "" &&
                      !/^\d{1,3}$/.test((countDrafts[k] ?? "").trim())
                        ? true
                        : undefined
                    }
                    onChange={(e) => {
                      setDirty(true);
                      setCountDrafts((c) => ({ ...c, [k]: e.target.value }));
                    }}
                    className="w-12 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-right font-semibold tabular-nums hover:border-border focus:border-primary focus:outline-none"
                  />
                </label>
              ))}
            </div>
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <HelpCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {t.countsHint}
            </p>
          </section>
        </div>
      </div>

      <div className="flex flex-col items-start gap-5 lg:flex-row">
        <section className="w-full min-w-0 flex-1 overflow-hidden rounded-card border border-border bg-surface shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <h2 className="text-lg font-semibold">{t.roomsTitle(drafts.length)}</h2>
            <button
              type="button"
              onClick={() => {
                const key = `nouvelle-${added}`;
                setAdded((n) => n + 1);
                setDirty(true);
                setDrafts((list) => [
                  ...list,
                  {
                    key,
                    room: null,
                    level: list.at(-1)?.level ?? "",
                    name: "",
                    area: "",
                    perimeter: "",
                    height: list.at(-1)?.height ?? "",
                    wet: false,
                    habitable: true,
                  },
                ]);
              }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-strong"
            >
              <Plus aria-hidden="true" className="size-4" />
              {t.addRoom}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table
              aria-label={t.roomsLabel}
              className="w-full min-w-[54rem] border-collapse text-sm"
            >
              <thead className="bg-background text-left text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5">{t.columns.name}</th>
                  <th className="px-2 py-2.5">{t.columns.level}</th>
                  <th className="px-2 py-2.5 text-right">{t.columns.area}</th>
                  <th className="px-2 py-2.5 text-right">{t.columns.perimeter}</th>
                  <th className="px-2 py-2.5 text-right">{t.columns.height}</th>
                  <th className="px-2 py-2.5">{t.columns.wet}</th>
                  <th className="px-2 py-2.5">{t.columns.habitable}</th>
                  <th className="px-2 py-2.5">{t.columns.source}</th>
                  <th className="px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {drafts.map((d, i) => {
                  const p = parsed[i];
                  const name = d.name || t.columns.name;
                  const warn =
                    d.room && !changed(d) && (d.room.source === "photo" || d.room.uncertain);
                  return (
                    <tr
                      key={d.key}
                      onClick={() => select(d)}
                      className={`border-t border-border ${
                        selected === d.key ? "bg-primary-softer" : warn ? "bg-warning-soft/50" : ""
                      }`}
                    >
                      <td className="py-2 pr-2 pl-5 align-middle">
                        <input
                          value={d.name}
                          maxLength={80}
                          required
                          aria-label={t.fieldOf(t.columns.name, name)}
                          aria-invalid={!p?.name || undefined}
                          onFocus={() => select(d)}
                          onChange={(e) => update(d.key, { name: e.target.value })}
                          className={`${inputClasses} !min-h-10 min-w-40 px-2.5 font-semibold`}
                        />
                      </td>
                      <td className={cell}>
                        <input
                          value={d.level}
                          maxLength={40}
                          aria-label={t.fieldOf(t.columns.level, name)}
                          onChange={(e) => update(d.key, { level: e.target.value })}
                          className={`${inputClasses} !min-h-10 !w-20 px-2.5`}
                        />
                      </td>
                      {(
                        [
                          ["area", t.columns.area, p?.areaCm2],
                          ["perimeter", t.columns.perimeter, p?.perimeterMm],
                          ["height", t.columns.height, p?.heightMm],
                        ] as const
                      ).map(([field, label, value]) => (
                        <td key={field} className={`${cell} text-right`}>
                          <input
                            value={d[field]}
                            inputMode="decimal"
                            aria-label={t.fieldOf(label, name)}
                            aria-invalid={value === undefined || undefined}
                            onChange={(e) =>
                              update(d.key, { [field]: e.target.value } as Partial<Draft>)
                            }
                            className={numberInput}
                          />
                        </td>
                      ))}
                      <td className={cell}>
                        <input
                          type="checkbox"
                          checked={d.wet}
                          aria-label={t.fieldOf(t.columns.wet, name)}
                          onChange={(e) => update(d.key, { wet: e.target.checked })}
                          className="size-[1.125rem] accent-primary"
                        />
                      </td>
                      <td className={cell}>
                        <input
                          type="checkbox"
                          checked={d.habitable}
                          aria-label={t.fieldOf(t.columns.habitable, name)}
                          onChange={(e) => update(d.key, { habitable: e.target.checked })}
                          className="size-[1.125rem] accent-primary"
                        />
                      </td>
                      <td className={`${cell} whitespace-nowrap`}>{badge(d)}</td>
                      <td className="py-2 pr-4 pl-2 align-middle">
                        <button
                          type="button"
                          aria-label={t.removeRoom(d.name)}
                          onClick={() => {
                            setDirty(true);
                            setDrafts((list) => list.filter((x) => x.key !== d.key));
                          }}
                          className="rounded-full p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                        >
                          <X aria-hidden="true" className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            {t.roomsNote}
            {traces.length > 0 && ` ${t.measure.note}`}
          </p>
        </section>

        <aside className={side}>
          <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card">
            <h2 className="text-lg font-semibold">{t.okTitle}</h2>
            <p className="text-sm text-muted-foreground">{t.okText}</p>
            {invalid && <p className="text-sm text-danger">{t.invalid}</p>}
            {dirty ? (
              <>
                <Button type="submit" name="next" value="revetements" disabled={pending || invalid}>
                  {t.toFinishes}
                </Button>
                <Button type="submit" variant="secondary" disabled={pending || invalid}>
                  {t.save}
                </Button>
              </>
            ) : (
              <Link
                href={`/pro/demandes/appels-offres/${tenderId}?etape=revetements` as Route}
                className={buttonClasses()}
              >
                {t.toFinishes}
              </Link>
            )}
          </section>
        </aside>
      </div>
    </form>
  );
}
