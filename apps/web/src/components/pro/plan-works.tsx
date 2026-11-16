"use client";

import {
  DEMOLITION_LOT,
  formatPlanMeasure,
  isWrittenWork,
  joineryParts,
  noteMeasureHint,
  parseQuantity,
  PLAN_WORK_KINDS,
  type PlanWorkKind,
} from "@menao/core";
import { Check, Pencil, Plus, Ruler, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useActionState, useMemo, useState, useTransition, type ReactNode } from "react";
import { GuideBar, GuideState, type GuideStateKind } from "@/components/pro/plan-guide";
import { PlanViewer, type PlanFileLink, type PlanView } from "@/components/pro/plan-viewer";
import { Alert, Button, StatusBadge, buttonClasses, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { savePlanWorks, setPlanLots } from "@/lib/artisan/tender-actions";
import type { TenderWork } from "@/lib/artisan/tenders";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.tenders.plan;
const w = t.works;
const n = w.notes;
/** Menuiseries affichées avant « Voir les N menuiseries ». */
const JOINERY_SHOWN = 5;

type Draft = {
  key: string;
  work: TenderWork | null;
  name: string;
  kind: PlanWorkKind;
  quantity: string;
  trade: string;
};

export type PlanPageInfo = { file: number; page: number; type: string };
export type PlanLotChoice = { code: string; label: string; checked: boolean };

/** Lot où va un ouvrage : « Démolition » pour une dépose, sinon son métier ("" : hors lot). */
const lotOf = (d: Draft) => (d.work?.removal ? DEMOLITION_LOT : d.trade);

/** Quantité affichée : un nombre d'unités sans décimales, une mesure à deux décimales. */
const shown = (kind: PlanWorkKind, milli: number | null) =>
  milli === null ? "" : kind === "nombre" ? String(milli / 1000) : formatPlanMeasure(milli);

const toDraft = (work: TenderWork): Draft => ({
  key: work.id,
  work,
  name: work.name,
  kind: work.kind,
  quantity: shown(work.kind, work.quantity_milli),
  trade: work.trade_code ?? "",
});

/**
 * Quantité saisie en millièmes ; null si vide, undefined si invalide. Texte inchangé : la valeur
 * enregistrée est gardée telle quelle (une surface à trois décimales s'affiche arrondie à deux et
 * ne doit pas passer pour « Saisi », ni être réécrite à l'enregistrement).
 */
function quantityOf(d: Draft): number | null | undefined {
  if (d.work && d.kind === d.work.kind && d.quantity === shown(d.kind, d.work.quantity_milli)) {
    return d.work.quantity_milli;
  }
  if (!d.quantity.trim()) return null;
  const milli = parseQuantity(d.quantity);
  if (milli === null || milli > 10_000_000_000) return undefined;
  return d.kind === "nombre" && milli % 1000 !== 0 ? undefined : milli;
}

/** La mesure ou la quantité a changé (ou l'ouvrage est ajouté) : origine « Saisi ». */
function changed(d: Draft): boolean {
  if (!d.work) return true;
  return d.kind !== d.work.kind || quantityOf(d) !== d.work.quantity_milli;
}

/**
 * Relevé des ouvrages mesurés d'un plan de terrain (F-158, ADR 0322), maquette du lot 52 : le plan
 * à gauche ; à droite ce que MENAO a lu et les lots préparés ; dessous le tableau des ouvrages
 * (mesure, quantité, unité, origine, lot), modifiables d'un clic, puis « Préparer le DPGF ».
 * `withViewer` faux : le tableau seul, sous le relevé des pièces qui affiche déjà les plans.
 * Ouvrages écrits sur les plans (F-159 lot 6, ADR 0330), maquette du lot 54 : un onglet par lot,
 * la pièce de chaque ouvrage et l'origine de sa quantité ; à droite les lots proposés d'après les
 * plans, à décocher, et les menuiseries à repère.
 * Parcours guidé (lot 56) : étape « Ce qu'il y a à faire » — un lot à la fois, l'électricité est
 * un lot comme les autres (`electricity`), trois états, « Mesurer » sur la ligne, une ligne
 * terminée s'enregistre, et la barre du bas porte un seul « Continuer ».
 */
const ELECTRICITY = "__electricite";
export function PlanWorks({
  tenderId,
  works,
  trades,
  workTrades,
  lotChoices,
  symbolCounts = {},
  electricity,
  backHref,
  nextHref,
  measureHref,
  files,
  pages,
  summary,
  withViewer,
  hasDpgf,
  verify,
}: {
  tenderId: string;
  works: TenderWork[];
  /** Métiers de l'appel d'offres : lots possibles d'un ouvrage. */
  trades: { code: string; label: string }[];
  /** Métiers possibles d'un ouvrage (tous les métiers, cochés ou non). */
  workTrades: { code: string; label: string }[];
  /** Lots de l'appel d'offres et lots demandés par les ouvrages écrits, à cocher. */
  lotChoices: PlanLotChoice[];
  /** Symboles électriques comptés par type (ADR 0336) : le lot de l'électricien n'est pas vide. */
  symbolCounts?: Record<string, number>;
  /** Symboles comptés (écran du lot 55), affichés comme un lot « Électricité ». */
  electricity?: { count: number; doubt: boolean; node: ReactNode } | null;
  /** Parcours guidé : retour à « Mes pièces » et étape suivante (revêtements). */
  backHref?: string;
  nextHref?: string;
  measureHref: string;
  files: PlanFileLink[];
  pages: PlanPageInfo[];
  /** « MENAO a lu vos plans » (rendu par la page). */
  summary: ReactNode;
  withViewer: boolean;
  hasDpgf: boolean;
  /** Carte « À vérifier » du parcours guidé (lot 56, rendue par la page). */
  verify?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(savePlanWorks, initialFormState);
  const [drafts, setDrafts] = useState<Draft[]>(() => works.map(toDraft));
  const [dirty, setDirty] = useState(false);
  const [added, setAdded] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(works[0]?.id ?? null);
  const [view, setView] = useState<PlanView>(() => ({
    file: Math.max(0, (works[0]?.file_index ?? 1) - 1),
    page: works[0]?.page ?? 1,
  }));
  // Ouvrages enregistrés : la page renvoie ceux de la base (identifiants, origines « saisi »).
  const [base, setBase] = useState(works);
  if (works !== base) {
    setBase(works);
    setDrafts(works.map(toDraft));
    setEditing(null);
  }

  // Ouvrages écrits sur les plans : onglets par lot, pièce et origine de la quantité.
  const notes = works.some(isWrittenWork);
  const [lot, setLot] = useState<string | null>(null);
  const [allJoinery, setAllJoinery] = useState(false);
  const [checked, setChecked] = useState(() =>
    lotChoices.filter((c) => c.checked).map((c) => c.code),
  );
  const [lotsError, setLotsError] = useState<string | null>(null);
  const [savingLots, startLots] = useTransition();
  const electricalCount = Object.values(symbolCounts).reduce((sum, v) => sum + v, 0);

  const quantities = useMemo(() => drafts.map(quantityOf), [drafts]);
  const invalid = drafts.some((d, i) => !d.name.trim() || quantities[i] === undefined);
  const tradeLabels = useMemo(
    () => new Map([...workTrades, ...trades].map((x) => [x.code, x.label])),
    [trades, workTrades],
  );
  // Onglets : les lots qui ont des ouvrages, la démolition d'abord, « Hors lot » à la fin.
  const tabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of drafts) counts.set(lotOf(d), (counts.get(lotOf(d)) ?? 0) + 1);
    const order = [
      DEMOLITION_LOT,
      ...lotChoices.map((c) => c.code),
      ...workTrades.map((x) => x.code),
      "",
    ];
    const todo = new Map<string, number>();
    drafts.forEach((d, i) => {
      if (quantities[i] === null) todo.set(lotOf(d), (todo.get(lotOf(d)) ?? 0) + 1);
    });
    const list = [...new Set(order)]
      .filter((code) => counts.has(code))
      .map((code) => ({
        code,
        label:
          code === DEMOLITION_LOT ? n.demolition : code ? (tradeLabels.get(code) ?? code) : n.noLot,
        count: counts.get(code) ?? 0,
        todo: todo.get(code) ?? 0,
      }));
    // Électricité : un lot comme les autres, juste après la démolition.
    if (electricity) {
      const at = list[0]?.code === DEMOLITION_LOT ? 1 : 0;
      list.splice(at, 0, {
        code: ELECTRICITY,
        label: n.electricity,
        count: electricity.count,
        todo: electricity.doubt ? 1 : 0,
      });
    }
    return list;
  }, [drafts, quantities, lotChoices, workTrades, tradeLabels, electricity]);
  const activeLot =
    notes || electricity ? (tabs.find((x) => x.code === lot) ?? tabs[0] ?? null) : null;
  const guided = !withViewer && !!nextHref;
  const simple = guided && notes;
  const missingCount = quantities.filter((q) => q === null).length;
  const joinery = useMemo(
    () =>
      notes
        ? drafts.flatMap((d) => {
            const parts = d.work && isWrittenWork(d.work) ? joineryParts(d.name) : null;
            return parts ? [{ key: d.key, ...parts }] : [];
          })
        : [],
    [drafts, notes],
  );

  function toggleLot(code: string) {
    const next = checked.includes(code) ? checked.filter((c) => c !== code) : [...checked, code];
    if (next.length === 0) {
      setLotsError(n.lotsError);
      return;
    }
    setChecked(next);
    setLotsError(null);
    startLots(async () => {
      const result = await setPlanLots(tenderId, next);
      if (result.error) setLotsError(result.error);
    });
  }

  const update = (key: string, patch: Partial<Draft>) => {
    setDirty(true);
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  };

  function select(d: Draft) {
    setSelected(d.key);
    if (d.work?.file_index) setView({ file: d.work.file_index - 1, page: d.work.page ?? 1 });
  }

  function submit(formData: FormData) {
    formData.set("tenderId", tenderId);
    formData.set(
      "works",
      JSON.stringify(
        drafts.map((d, i) => ({
          id: d.work?.id ?? null,
          name: d.name.trim(),
          kind: d.kind,
          quantityMilli: quantities[i] ?? null,
          trade: d.trade || null,
        })),
      ),
    );
    setDirty(false);
    setEditing(null);
    formAction(formData);
  }

  /** État d'un ouvrage écrit (parcours guidé) : trois états, le détail au survol. */
  function stateOf(d: Draft, quantity: number | null | undefined): GuideStateKind {
    const work = d.work;
    if (quantity === null || quantity === undefined) return "todo";
    if (!work || changed(d) || work.source === "saisi" || work.source === "trace") return "mine";
    if (work.uncertain || work.source === "photo") return "est";
    return "ok";
  }
  function stateTitle(d: Draft): string | undefined {
    const work = d.work;
    if (!work || changed(d)) return undefined;
    if (work.source === "calcul") return work.detail ?? n.source.room;
    if (work.source === "unite") return n.source.unit;
    return undefined;
  }

  /** Origine d'une quantité : pastille, puis page ou calcul. */
  function origin(d: Draft, quantity: number | null | undefined) {
    const item = (
      tone: "success" | "primary" | "neutral" | "warning",
      label: string,
      detail?: string | null,
    ) => (
      <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <StatusBadge tone={tone}>{label}</StatusBadge>
        {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      </span>
    );
    const work = d.work;
    if (work && isWrittenWork(work) && !changed(d)) {
      // Ouvrage écrit sur le plan : d'où vient sa quantité (maquette du lot 54).
      if (quantity === null || quantity === undefined) {
        const hint = noteMeasureHint(d.name, d.kind);
        return item("warning", n.source.toMeasure, hint ? n.detail[hint] : null);
      }
      if (work.source === "calcul") {
        return work.uncertain
          ? item("warning", n.source.room, n.detail.estimated)
          : item("primary", n.source.room);
      }
      if (work.source === "unite") return item("neutral", n.source.unit);
      if (work.source === "plan") return item("success", n.source.written);
    }
    if (quantity === null || quantity === undefined) {
      return item("warning", w.source.missing, work && !changed(d) ? w.detail.missing : null);
    }
    if (work && !changed(d) && work.source === "trace") {
      return item("neutral", t.source.trace);
    }
    if (!work || changed(d) || work.source === "saisi") return item("neutral", w.source.saisi);
    if (work.source === "photo") return item("warning", w.source.check, w.detail.photo(work.page));
    if (work.source === "calcul") {
      return item(work.uncertain ? "warning" : "primary", w.source.calcul, work.detail);
    }
    const page = work.page ? w.detail.page(work.page) : null;
    if (work.uncertain) return item("warning", w.source.check, page);
    if (work.source === "compte") {
      return item("neutral", w.source.compte, w.detail.counted(work.page));
    }
    return item("success", w.source.plan, page);
  }

  const current = pages.find((p) => p.file === view.file + 1 && p.page === view.page);
  const lots = trades.map((trade) => ({
    ...trade,
    count: drafts.filter((d) => d.trade === trade.code).length,
  }));
  const side = "flex w-full flex-col gap-4 lg:w-[22rem] lg:shrink-0";
  const head = "px-2 py-2.5";
  const cell = "px-2 py-2.5 align-middle";
  const field = `${inputClasses} !min-h-10 w-full px-2.5 text-sm`;
  const caption = "flex flex-col gap-1 text-xs font-semibold text-muted-foreground";

  const table = (
    <section className="w-full min-w-0 flex-1 overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-lg font-semibold">
          {activeLot ? n.lotTitle(activeLot.label, activeLot.count) : w.title(drafts.length)}
        </h2>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {notes && (
            <Link
              href={measureHref as Route}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-strong"
            >
              <Ruler aria-hidden="true" className="size-4" />
              {n.measure}
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              const key = `nouveau-${added}`;
              setAdded((n) => n + 1);
              setDirty(true);
              setDrafts((list) => [
                ...list,
                {
                  key,
                  work: null,
                  name: "",
                  kind: "surface",
                  quantity: "",
                  trade: activeLot && activeLot.code !== DEMOLITION_LOT ? activeLot.code : "",
                },
              ]);
              setEditing(key);
              setSelected(key);
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-strong"
          >
            <Plus aria-hidden="true" className="size-4" />
            {w.add}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table aria-label={w.label} className="w-full min-w-[44rem] border-collapse text-sm">
          <thead className="bg-background text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-5 py-2.5">{notes ? n.columns.name : w.columns.name}</th>
              <th className={head}>{notes ? n.columns.room : w.columns.kind}</th>
              <th className={`${head} text-right`}>{w.columns.quantity}</th>
              {!simple && <th className={head}>{w.columns.unit}</th>}
              <th className={head}>
                {simple ? n.columns.state : notes ? n.columns.source : w.columns.source}
              </th>
              {!simple && <th className={head}>{notes ? n.columns.plan : w.columns.trade}</th>}
              <th className={head} />
            </tr>
          </thead>
          <tbody>
            {drafts.map((d, i) => {
              if (activeLot && lotOf(d) !== activeLot.code) return null;
              const quantity = quantities[i];
              const name = d.name || w.columns.name;
              if (editing === d.key) {
                // Ligne ouverte : les champs sur toute la largeur du tableau.
                return (
                  <tr key={d.key} className="border-t border-border bg-primary-softer">
                    <td colSpan={7} className="px-5 py-3">
                      <div className="flex flex-wrap items-end gap-3">
                        <label className={`${caption} min-w-48 flex-1`}>
                          {w.columns.name}
                          <input
                            value={d.name}
                            maxLength={120}
                            required
                            autoFocus
                            aria-label={t.fieldOf(w.columns.name, name)}
                            aria-invalid={!d.name.trim() || undefined}
                            onChange={(e) => update(d.key, { name: e.target.value })}
                            className={`${field} font-semibold text-foreground`}
                          />
                        </label>
                        <label className={`${caption} w-32`}>
                          {w.columns.kind}
                          <select
                            value={d.kind}
                            aria-label={t.fieldOf(w.columns.kind, name)}
                            onChange={(e) =>
                              update(d.key, { kind: e.target.value as PlanWorkKind })
                            }
                            className={`${field} text-foreground`}
                          >
                            {PLAN_WORK_KINDS.map((k) => (
                              <option key={k} value={k}>
                                {w.kinds[k]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className={`${caption} w-32`}>
                          {`${w.columns.quantity} (${w.units[d.kind]})`}
                          <input
                            value={d.quantity}
                            inputMode="decimal"
                            aria-label={t.fieldOf(w.columns.quantity, name)}
                            aria-invalid={quantity === undefined || undefined}
                            onChange={(e) => update(d.key, { quantity: e.target.value })}
                            className={`${field} text-right text-foreground tabular-nums`}
                          />
                        </label>
                        <label className={`${caption} w-40`}>
                          {w.columns.trade}
                          <select
                            value={d.trade}
                            aria-label={t.fieldOf(w.columns.trade, name)}
                            onChange={(e) => update(d.key, { trade: e.target.value })}
                            className={`${field} text-foreground`}
                          >
                            <option value="">{w.noTrade}</option>
                            {workTrades.map((x) => (
                              <option key={x.code} value={x.code}>
                                {x.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="flex items-center gap-1 pb-1">
                          <button
                            type={guided ? "submit" : "button"}
                            aria-label={w.done(d.name)}
                            onClick={() => {
                              if (!guided) setEditing(null);
                            }}
                            className="rounded-full p-2 text-primary-strong hover:bg-surface"
                          >
                            <Check aria-hidden="true" className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={w.remove(d.name)}
                            onClick={() => {
                              setDirty(true);
                              setEditing(null);
                              setDrafts((list) => list.filter((x) => x.key !== d.key));
                            }}
                            className="rounded-full p-2 text-muted-foreground hover:bg-surface hover:text-foreground"
                          >
                            <X aria-hidden="true" className="size-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }
              const tone =
                selected === d.key
                  ? "bg-primary-softer"
                  : quantity === null || quantity === undefined
                    ? "bg-warning-soft/50"
                    : "";
              return (
                <tr
                  key={d.key}
                  onClick={() => select(d)}
                  className={`border-t border-border ${tone}`}
                >
                  <td className="py-2.5 pr-2 pl-5 align-middle font-semibold">{d.name}</td>
                  <td className={`${cell} text-muted-foreground`}>
                    {notes ? (d.work?.room ?? "—") : w.kinds[d.kind]}
                  </td>
                  <td className={`${cell} text-right font-bold whitespace-nowrap tabular-nums`}>
                    {quantity
                      ? `${shown(d.kind, quantity)}${simple ? ` ${w.units[d.kind]}` : ""}`
                      : "—"}
                  </td>
                  {!simple && (
                    <td className={`${cell} text-muted-foreground`}>{w.units[d.kind]}</td>
                  )}
                  <td className={cell}>
                    {simple ? (
                      <GuideState kind={stateOf(d, quantity)} title={stateTitle(d)} />
                    ) : (
                      origin(d, quantity)
                    )}
                  </td>
                  {!simple && (
                    <td className={`${cell} text-label`}>
                      {notes
                        ? (files[(d.work?.file_index ?? 0) - 1]?.name.replace(
                            /\.[a-z0-9]+$/i,
                            "",
                          ) ?? "—")
                        : (tradeLabels.get(d.trade) ?? "—")}
                    </td>
                  )}
                  <td className="py-2 pr-4 pl-2 text-right align-middle">
                    {simple && (quantity === null || quantity === undefined) ? (
                      <Link
                        href={measureHref as Route}
                        aria-label={n.measureWork(d.name)}
                        className={`${buttonClasses({ variant: "secondary", size: "sm", block: false })} !min-h-8 whitespace-nowrap`}
                      >
                        <Ruler aria-hidden="true" className="size-3.5" />
                        {n.measureShort}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        aria-label={w.edit(d.name)}
                        onClick={() => {
                          select(d);
                          setEditing(d.key);
                        }}
                        className="rounded-full p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                      >
                        <Pencil aria-hidden="true" className="size-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
        {notes ? n.note : w.note}
      </p>
    </section>
  );

  // Onglets par lot (maquettes des lots 54 et 56) : le nom du lot, son nombre d'ouvrages et ce
  // qui reste à vérifier.
  const lotTabs = (notes || electricity) && (
    <div role="tablist" aria-label={n.tabs} className="flex flex-wrap gap-2.5">
      {tabs.map((tab) => {
        const on = tab.code === activeLot?.code;
        return (
          <button
            key={tab.code}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => {
              setLot(tab.code);
              setEditing(null);
            }}
            className={`inline-flex items-center gap-2 rounded-input px-3.5 py-2.5 text-left whitespace-nowrap ${
              on
                ? "border-2 border-primary bg-primary-softer"
                : "border border-border bg-surface hover:bg-background"
            }`}
          >
            <span className="text-sm font-bold">{tab.label}</span>
            <span className="text-xs text-muted-foreground">
              {tab.code === ELECTRICITY ? n.symbolCount(tab.count) : w.lotCount(tab.count)}
            </span>
            {tab.todo > 0 && (
              <span
                aria-label={n.toCheck(tab.todo)}
                className="inline-flex min-w-5 items-center justify-center rounded-pill bg-warning px-1.5 text-[0.6875rem] font-bold text-white"
              >
                {tab.todo}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  // Lots proposés d'après les plans : cochés par défaut, décochés par l'artisan.
  const lotsCard =
    notes && guided ? (
      <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card">
        <h2 className="text-lg font-semibold">{n.myLots}</h2>
        <p className="text-sm text-muted-foreground">{n.myLotsNote}</p>
        {lotsError && <p className="text-sm text-danger">{lotsError}</p>}
        <div className="flex flex-wrap gap-2">
          {lotChoices.map((choice) => {
            const on = checked.includes(choice.code);
            return (
              <label
                key={choice.code}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-pill border px-3 py-1.5 text-[0.8125rem] font-semibold ${
                  on
                    ? "border-primary/30 bg-primary-soft"
                    : "border-border bg-surface text-muted-foreground"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={savingLots}
                  aria-label={n.lotOf(choice.label)}
                  onChange={() => toggleLot(choice.code)}
                  className="size-4 accent-primary"
                />
                {choice.label}
              </label>
            );
          })}
        </div>
      </section>
    ) : (
      notes && (
        <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card">
          <h2 className="text-lg font-semibold">{n.lotsTitle}</h2>
          {lotsError && <p className="text-sm text-danger">{lotsError}</p>}
          <ul className="flex flex-col">
            {lotChoices.map((choice) => {
              const count = tabs.find((x) => x.code === choice.code)?.count ?? 0;
              const on = checked.includes(choice.code);
              return (
                <li key={choice.code} className="border-t border-border">
                  <label className="flex cursor-pointer items-center gap-2.5 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={savingLots}
                      aria-label={n.lotOf(choice.label)}
                      onChange={() => toggleLot(choice.code)}
                      className="size-4 accent-primary"
                    />
                    <span className={`flex-1 font-semibold ${on ? "" : "text-muted-foreground"}`}>
                      {choice.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {count
                        ? w.lotCount(count)
                        : choice.code === "electricien" && electricalCount
                          ? n.symbolsCounted(electricalCount)
                          : n.lotEmpty}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-muted-foreground">{n.lotsNote}</p>
        </section>
      )
    );

  const joineryCard = joinery.length > 0 && (
    <section className="flex flex-col gap-1.5 rounded-card border border-border bg-surface p-5 shadow-card">
      <h2 className="text-lg font-semibold">{n.joineryTitle(joinery.length)}</h2>
      <ul className="flex flex-col">
        {(allJoinery ? joinery : joinery.slice(0, JOINERY_SHOWN)).map((item) => (
          <li
            key={item.key}
            className="flex items-baseline gap-2.5 border-t border-border py-1.5 text-sm"
          >
            <b className="w-12 shrink-0">{item.mark}</b>
            <span className="flex-1 text-label">{item.label}</span>
            <b className="whitespace-nowrap tabular-nums">{item.size}</b>
          </li>
        ))}
      </ul>
      {!allJoinery && joinery.length > JOINERY_SHOWN && (
        <button
          type="button"
          onClick={() => setAllJoinery(true)}
          className="self-start text-sm font-semibold text-primary-strong"
        >
          {n.joineryAll(joinery.length)}
        </button>
      )}
    </section>
  );

  return (
    <form action={submit} className="flex flex-col gap-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && !dirty && <Alert tone="success">{state.success}</Alert>}

      {withViewer && (
        <div className="flex flex-col items-start gap-5 lg:flex-row">
          <PlanViewer
            files={files}
            view={view}
            onView={setView}
            hint={w.viewerHint}
            note={current && <span>{w.pageType(w.pageTypes[current.type] ?? current.type)}</span>}
          />
          <div className={side}>
            {summary}
            <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card">
              <h2 className="text-lg font-semibold">{w.lotsTitle}</h2>
              <ul className="flex flex-col">
                {lots.map((lot) => (
                  <li
                    key={lot.code}
                    className="flex items-center justify-between gap-3 border-t border-border py-2 text-sm"
                  >
                    <span className="font-semibold">{lot.label}</span>
                    <span className="text-muted-foreground">{w.lotCount(lot.count)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">{w.lotsNote}</p>
            </section>
          </div>
        </div>
      )}

      <div className="flex flex-col items-start gap-5 lg:flex-row">
        {notes || electricity ? (
          <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
            {lotTabs}
            {/* Symboles gardés montés : leur enregistrement automatique survit au changement
                d'onglet. */}
            {electricity && <div hidden={activeLot?.code !== ELECTRICITY}>{electricity.node}</div>}
            {activeLot?.code !== ELECTRICITY && table}
          </div>
        ) : (
          table
        )}
        <aside className={side}>
          {guided && verify}
          {lotsCard}
          {joineryCard}
          {!guided && (
            <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card">
              {withViewer ? (
                <>
                  <h2 className="text-lg font-semibold">{t.okTitle}</h2>
                  <p className="text-sm text-muted-foreground">{w.okText}</p>
                  {invalid && <p className="text-sm text-danger">{w.invalid}</p>}
                  {hasDpgf && <p className="text-sm text-warning">{t.finishes.recreateWarning}</p>}
                  <Button type="submit" name="next" value="dpgf" disabled={pending || invalid}>
                    {pending ? w.preparing : hasDpgf ? w.redoDpgf : w.toDpgf}
                  </Button>
                  {dirty && (
                    <Button type="submit" variant="secondary" disabled={pending || invalid}>
                      {w.save}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">{notes ? n.okTitle : w.lotsTitle}</h2>
                  <p className="text-sm text-muted-foreground">{notes ? n.okText : w.lotsNote}</p>
                  {invalid && <p className="text-sm text-danger">{w.invalid}</p>}
                  <Button type="submit" variant="secondary" disabled={pending || invalid || !dirty}>
                    {w.save}
                  </Button>
                </>
              )}
            </section>
          )}
          {guided && invalid && <p className="text-sm text-danger">{w.invalid}</p>}
        </aside>
      </div>
      {guided && (
        <GuideBar
          back={
            backHref && (
              <Link
                href={backHref as Route}
                className={buttonClasses({ variant: "secondary", block: false })}
              >
                {t.guide.backRooms}
              </Link>
            )
          }
          text={missingCount ? t.guide.worksToCheck(missingCount) : undefined}
        >
          {dirty ? (
            <Button
              type="submit"
              name="next"
              value="revetements"
              block={false}
              disabled={pending || invalid}
            >
              {t.guide.toFinishes}
            </Button>
          ) : (
            <Link href={nextHref as Route} className={buttonClasses({ block: false })}>
              {t.guide.toFinishes}
            </Link>
          )}
        </GuideBar>
      )}
    </form>
  );
}
