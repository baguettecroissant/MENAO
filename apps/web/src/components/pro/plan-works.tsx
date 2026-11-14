"use client";

import { formatPlanMeasure, parseQuantity, PLAN_WORK_KINDS, type PlanWorkKind } from "@menao/core";
import { Check, Pencil, Plus, X } from "lucide-react";
import { useActionState, useMemo, useState, type ReactNode } from "react";
import { PlanViewer, type PlanFileLink, type PlanView } from "@/components/pro/plan-viewer";
import { Alert, Button, StatusBadge, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { savePlanWorks } from "@/lib/artisan/tender-actions";
import type { TenderWork } from "@/lib/artisan/tenders";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.tenders.plan;
const w = t.works;

type Draft = {
  key: string;
  work: TenderWork | null;
  name: string;
  kind: PlanWorkKind;
  quantity: string;
  trade: string;
};

export type PlanPageInfo = { file: number; page: number; type: string };

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

/** Quantité saisie en millièmes ; null si vide, undefined si invalide. */
function quantityOf(d: Draft): number | null | undefined {
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
 */
export function PlanWorks({
  tenderId,
  works,
  trades,
  files,
  pages,
  summary,
  withViewer,
  hasDpgf,
}: {
  tenderId: string;
  works: TenderWork[];
  /** Métiers de l'appel d'offres : lots possibles d'un ouvrage. */
  trades: { code: string; label: string }[];
  files: PlanFileLink[];
  pages: PlanPageInfo[];
  /** « MENAO a lu vos plans » (rendu par la page). */
  summary: ReactNode;
  withViewer: boolean;
  hasDpgf: boolean;
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

  const quantities = useMemo(() => drafts.map(quantityOf), [drafts]);
  const invalid = drafts.some((d, i) => !d.name.trim() || quantities[i] === undefined);
  const tradeLabels = useMemo(() => new Map(trades.map((x) => [x.code, x.label])), [trades]);

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
    if (quantity === null || quantity === undefined) {
      return item("warning", w.source.missing, work && !changed(d) ? w.detail.missing : null);
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
        <h2 className="text-lg font-semibold">{w.title(drafts.length)}</h2>
        <button
          type="button"
          onClick={() => {
            const key = `nouveau-${added}`;
            setAdded((n) => n + 1);
            setDirty(true);
            setDrafts((list) => [
              ...list,
              { key, work: null, name: "", kind: "surface", quantity: "", trade: "" },
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
      <div className="overflow-x-auto">
        <table aria-label={w.label} className="w-full min-w-[44rem] border-collapse text-sm">
          <thead className="bg-background text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-5 py-2.5">{w.columns.name}</th>
              <th className={head}>{w.columns.kind}</th>
              <th className={`${head} text-right`}>{w.columns.quantity}</th>
              <th className={head}>{w.columns.unit}</th>
              <th className={head}>{w.columns.source}</th>
              <th className={head}>{w.columns.trade}</th>
              <th className={head} />
            </tr>
          </thead>
          <tbody>
            {drafts.map((d, i) => {
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
                            {trades.map((x) => (
                              <option key={x.code} value={x.code}>
                                {x.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="flex items-center gap-1 pb-1">
                          <button
                            type="button"
                            aria-label={w.done(d.name)}
                            onClick={() => setEditing(null)}
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
                  <td className={`${cell} text-muted-foreground`}>{w.kinds[d.kind]}</td>
                  <td className={`${cell} text-right font-bold tabular-nums`}>
                    {quantity ? shown(d.kind, quantity) : "—"}
                  </td>
                  <td className={`${cell} text-muted-foreground`}>{w.units[d.kind]}</td>
                  <td className={cell}>{origin(d, quantity)}</td>
                  <td className={`${cell} text-label`}>{tradeLabels.get(d.trade) ?? "—"}</td>
                  <td className="py-2 pr-4 pl-2 text-right align-middle">
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">{w.note}</p>
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
        {table}
        <aside className={side}>
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
                <h2 className="text-lg font-semibold">{w.lotsTitle}</h2>
                <p className="text-sm text-muted-foreground">{w.lotsNote}</p>
                {invalid && <p className="text-sm text-danger">{w.invalid}</p>}
                <Button type="submit" variant="secondary" disabled={pending || invalid || !dirty}>
                  {w.save}
                </Button>
              </>
            )}
          </section>
        </aside>
      </div>
    </form>
  );
}
