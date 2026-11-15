"use client";

import {
  formatPlanMeasure,
  formatQuantity,
  PLAN_COUNT_KEYS,
  parseQuantity,
  planNameKey,
  type PlanTrace,
} from "@menao/core";
import { Check, ChevronDown, HelpCircle, Plus, Ruler, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useActionState, useMemo, useState, type ReactNode } from "react";
import { GuideBar, GuideState, type GuideStateKind } from "@/components/pro/plan-guide";
import { Alert, Button, buttonClasses, inputClasses } from "@/components/ui";
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
const g = t.guide;

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
    // cm² → m² à deux décimales ; une surface non retouchée garde sa valeur enregistrée (parse).
    area: room.area_cm2 === null ? "" : formatPlanMeasure(Math.round(room.area_cm2 / 10)),
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

/** État d'une pièce, trois seulement (lot 56) : lu sur le plan, votre valeur, estimé, à compléter. */
function stateOf(d: Draft): GuideStateKind {
  if (changed(d)) return "mine";
  const r = d.room;
  if (!r || r.area_cm2 === null) return "todo";
  if (r.source === "saisi" || r.source === "trace") return "mine";
  if (r.source === "estime" || r.source === "photo" || r.uncertain) return "est";
  return "ok";
}

/** Détail d'une mesure, au survol de sa pastille. */
function detailOf(d: Draft): string | undefined {
  const r = d.room;
  if (!r || changed(d)) return undefined;
  if (r.source === "cotes") return t.source.cotes;
  if (r.source === "estime") return t.source.estime;
  if (r.source === "photo") return t.source.photo;
  if (r.source === "trace") return t.source.trace;
  if (r.source === "plan") return t.source.plan(r.page);
  return undefined;
}

/**
 * Étape « Mes pièces » du parcours guidé (maquette du lot 56) : le plan à gauche avec ses contours,
 * à droite la liste compacte des pièces (nom, état, surface). Une pièce touchée s'ouvre pour être
 * corrigée et s'enregistre en la fermant ; les éléments comptés et le détail de la lecture restent
 * à un clic. La barre du bas porte un seul bouton « Continuer », qui enregistre ce qui reste.
 */
export function PlanReleve({
  tenderId,
  rooms,
  counts,
  files,
  details,
  traces = [],
  canMeasure = false,
}: {
  tenderId: string;
  rooms: TenderRoom[];
  counts: Record<string, number | null>;
  files: PlanFileLink[];
  /** Détail de la lecture (rendu par la page), replié. */
  details: ReactNode;
  /** Contours tracés sur les photos (mesure à l'échelle, F-159 lot 2). */
  traces?: PlanTrace[];
  /** Une image de plan est déposée : le métré à la main est proposé (lot 3). */
  canMeasure?: boolean;
}) {
  const [state, formAction, pending] = useActionState(savePlanRooms, initialFormState);
  const [drafts, setDrafts] = useState<Draft[]>(() => rooms.map(toDraft));
  const [countDrafts, setCountDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(PLAN_COUNT_KEYS.map((k) => [k, counts[k] == null ? "" : String(counts[k])])),
  );
  const [dirty, setDirty] = useState(false);
  const [added, setAdded] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
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
    setOpen(null);
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

  // Contours du plan affiché : en ambre les pièces estimées, en bleu celles mesurées par ailleurs.
  // Une photo n'a qu'une page ; un PDF affiche la page choisie.
  const shownPage = files[view.file]?.kind === "pdf" ? view.page : 1;
  const trace = traces.find((x) => x.file === view.file + 1 && (x.page ?? 1) === shownPage);
  const overlay: PlanOverlay | null = trace
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

  // Hauteur la plus fréquente, rappelée en tête de liste.
  const heights = drafts.map((d) => d.height).filter(Boolean);
  const usualHeight =
    heights.sort(
      (a, b) => heights.filter((h) => h === b).length - heights.filter((h) => h === a).length,
    )[0] ?? null;
  const estimated = drafts.filter((d) => stateOf(d) === "est").length;
  const missing = drafts.filter((d) => stateOf(d) === "todo").length;
  const countSummary = PLAN_COUNT_KEYS.filter((k) =>
    /^\d{1,3}$/.test((countDrafts[k] ?? "").trim()),
  )
    .map((k) => g.countShort[k]?.(Number(countDrafts[k])) ?? "")
    .filter(Boolean)
    .join(" · ");
  const field = `${inputClasses} !min-h-10 w-full px-2.5 text-sm`;
  const caption = "flex flex-col gap-1 text-xs font-semibold text-muted-foreground";

  return (
    <form action={submit} className="flex flex-col gap-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && !dirty && <Alert tone="success">{state.success}</Alert>}

      <div className="flex flex-col items-start gap-5 lg:flex-row">
        <PlanViewer
          files={files}
          view={view}
          onView={setView}
          hint={g.roomsHint}
          overlay={overlay}
          note={
            overlay && (
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {(
                  [
                    ["border-primary bg-primary-soft", t.measure.legendMeasured],
                    ["border-dashed border-warning bg-warning-soft", t.measure.legendEstimated],
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

        <aside className="flex w-full flex-col gap-4 lg:w-[24rem] lg:shrink-0">
          <section className="flex flex-col rounded-card border border-border bg-surface p-5 shadow-card">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">{g.roomsTitle}</h2>
              {usualHeight && (
                <span className="text-[0.8125rem] text-muted-foreground">
                  {g.height(usualHeight)}
                </span>
              )}
            </div>
            <ul aria-label={t.roomsLabel} className="flex flex-col">
              {drafts.map((d, i) => {
                const p = parsed[i];
                const name = d.name || t.columns.name;
                const isOpen = open === d.key;
                return (
                  <li key={d.key} className="border-t border-border">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-label={g.editRoom(name)}
                      onClick={() => {
                        select(d);
                        setOpen(isOpen ? null : d.key);
                      }}
                      className={`flex w-full items-center gap-2.5 py-2.5 text-left ${
                        selected === d.key ? "bg-primary-softer" : ""
                      }`}
                    >
                      <b className="min-w-0 flex-1 text-[0.9375rem] leading-snug break-words">
                        {name}
                      </b>
                      <GuideState kind={stateOf(d)} title={detailOf(d)} />
                      <b className="w-[5.5rem] text-right tabular-nums">
                        {d.area ? `${d.area} m²` : "—"}
                      </b>
                    </button>
                    {isOpen && (
                      <div className="mb-3 flex flex-col gap-3 rounded-input bg-background p-3">
                        <label className={caption}>
                          {t.columns.name}
                          <input
                            value={d.name}
                            maxLength={80}
                            required
                            autoFocus
                            aria-label={t.fieldOf(t.columns.name, name)}
                            aria-invalid={!p?.name || undefined}
                            onChange={(e) => update(d.key, { name: e.target.value })}
                            className={`${field} font-semibold text-foreground`}
                          />
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(
                            [
                              ["area", t.columns.area, p?.areaCm2],
                              ["perimeter", t.columns.perimeter, p?.perimeterMm],
                              ["height", t.columns.height, p?.heightMm],
                            ] as const
                          ).map(([key, label, value]) => (
                            <label key={key} className={caption}>
                              {label}
                              <input
                                value={d[key]}
                                inputMode="decimal"
                                aria-label={t.fieldOf(label, name)}
                                aria-invalid={value === undefined || undefined}
                                onChange={(e) =>
                                  update(d.key, { [key]: e.target.value } as Partial<Draft>)
                                }
                                className={`${field} text-right text-foreground tabular-nums`}
                              />
                            </label>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={d.wet}
                              aria-label={t.fieldOf(t.columns.wet, name)}
                              onChange={(e) => update(d.key, { wet: e.target.checked })}
                              className="size-[1.125rem] accent-primary"
                            />
                            {t.columns.wet}
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={d.habitable}
                              aria-label={t.fieldOf(t.columns.habitable, name)}
                              onChange={(e) => update(d.key, { habitable: e.target.checked })}
                              className="size-[1.125rem] accent-primary"
                            />
                            {t.columns.habitable}
                          </label>
                          <label className="flex items-center gap-2">
                            {t.columns.level}
                            <input
                              value={d.level}
                              maxLength={40}
                              aria-label={t.fieldOf(t.columns.level, name)}
                              onChange={(e) => update(d.key, { level: e.target.value })}
                              className={`${inputClasses} !min-h-9 !w-20 px-2 text-sm`}
                            />
                          </label>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDirty(true);
                              setOpen(null);
                              setDrafts((list) => list.filter((x) => x.key !== d.key));
                            }}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
                          >
                            <X aria-hidden="true" className="size-4" />
                            {t.removeRoom(d.name)}
                          </button>
                          <Button
                            type="submit"
                            block={false}
                            disabled={pending || invalid}
                            onClick={() => setOpen(null)}
                          >
                            <Check aria-hidden="true" className="size-4" />
                            {g.doneRoom}
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
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
                  setOpen(key);
                  setSelected(key);
                }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-strong"
              >
                <Plus aria-hidden="true" className="size-4" />
                {t.addRoom}
              </button>
              <span className="text-[0.8125rem] text-muted-foreground">{g.touchHint}</span>
            </div>
            {invalid && <p className="mt-2 text-sm text-danger">{t.invalid}</p>}
          </section>

          <details className="group rounded-card border border-border bg-surface shadow-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
              <span className="flex flex-col">
                <b className="text-base">{t.countsTitle}</b>
                <span className="text-[0.8125rem] text-muted-foreground">
                  {countSummary || g.countsEmpty}
                </span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="flex flex-col gap-3 px-5 pb-5">
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
                      className="w-12 rounded-md border border-border bg-surface px-1.5 py-1 text-right font-semibold tabular-nums focus:border-primary focus:outline-none"
                    />
                  </label>
                ))}
              </div>
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <HelpCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {t.countsHint}
              </p>
            </div>
          </details>

          <details className="group rounded-card border border-border bg-surface shadow-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
              <b className="text-base">{g.details}</b>
              <ChevronDown
                aria-hidden="true"
                className="size-4 shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="flex flex-col gap-4 px-5 pb-5">{details}</div>
          </details>
        </aside>
      </div>

      <GuideBar
        text={
          missing ? g.roomsMissing(missing) : estimated ? g.roomsEstimated(estimated) : undefined
        }
      >
        {canMeasure && (
          <Link
            href={`/pro/demandes/appels-offres/${tenderId}?etape=mesure` as Route}
            className={buttonClasses({ variant: "secondary", block: false })}
          >
            <Ruler aria-hidden="true" className="size-4" />
            {t.measure.open}
          </Link>
        )}
        {dirty ? (
          <Button
            type="submit"
            name="next"
            value="ouvrages"
            block={false}
            disabled={pending || invalid}
          >
            {g.toWorks}
          </Button>
        ) : (
          <Link
            href={`/pro/demandes/appels-offres/${tenderId}?etape=ouvrages` as Route}
            className={buttonClasses({ block: false })}
          >
            {g.toWorks}
          </Link>
        )}
      </GuideBar>
    </form>
  );
}
