"use client";

import {
  formatEurosInput,
  formatQuantity,
  lineTotalHtCents,
  parseEuros,
  parseQuantity,
  tenderTotals,
} from "@menao/core";
import { Download, FileSpreadsheet, FileText, Lock, TriangleAlert } from "lucide-react";
import { useActionState, useMemo, useState, type ReactNode } from "react";
import { Alert, Button, StatusBadge, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { saveTender } from "@/lib/artisan/tender-actions";
import type { TenderLine } from "@/lib/artisan/tenders";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.tenders;
const p = t.plan;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);
const TONES = {
  plan: "success",
  calcul: "primary",
  photo: "warning",
  manque: "warning",
  saisi: "neutral",
} as const;

type Draft = { quantity: string; price: string };
type Lot = { key: string; code: string; name: string; posts: TenderLine[] };

/** Lots du DPGF : chaque titre ouvre un lot, ses postes le suivent. */
function lotsOf(lines: readonly TenderLine[]): Lot[] {
  const lots: Lot[] = [];
  for (const line of lines) {
    if (line.kind === "titre") {
      lots.push({ key: line.id, code: line.code ?? "", name: line.designation, posts: [] });
    } else {
      if (!lots.length) lots.push({ key: "sans-lot", code: "", name: "", posts: [] });
      lots.at(-1)?.posts.push(line);
    }
  }
  return lots;
}

const capitalize = (text: string) =>
  text ? text.charAt(0) + text.slice(1).toLocaleLowerCase("fr-FR") : text;

/**
 * DPGF créé depuis les plans (F-140, ADR 0292), maquette du lot 35 (écran 4) : les lots en
 * cartes (postes, « à compléter »), le tableau du lot choisi avec l'origine de chaque quantité, et
 * à droite le détail du calcul de la ligne choisie puis « Avant d'exporter » (case « J'ai vérifié
 * les quantités », Excel et PDF verrouillés tant qu'elle n'est pas cochée).
 */
export function PlanDpgfEditor({
  tenderId,
  lines,
  vatRateBp,
  vatOptions,
  exportLocked,
  checkSlot,
}: {
  tenderId: string;
  lines: TenderLine[];
  vatRateBp: number;
  vatOptions: readonly number[];
  exportLocked: boolean;
  checkSlot: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(saveTender, initialFormState);
  const [vat, setVat] = useState(vatRateBp);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      lines
        .filter((l) => l.kind === "poste")
        .map((l) => [
          l.id,
          {
            quantity: l.quantity_milli === null ? "" : formatQuantity(l.quantity_milli),
            price: l.unit_price_ht_cents === null ? "" : formatEurosInput(l.unit_price_ht_cents),
          },
        ]),
    ),
  );
  const [dirty, setDirty] = useState(false);
  const lots = useMemo(() => lotsOf(lines), [lines]);
  const [lotKey, setLotKey] = useState(lots[0]?.key ?? "");
  const [lineId, setLineId] = useState<string | null>(
    lots[0]?.posts.find((l) => l.quantity_detail)?.id ?? lots[0]?.posts[0]?.id ?? null,
  );

  const value = (l: TenderLine) => {
    const d = drafts[l.id];
    return {
      quantityMilli: d?.quantity.trim() ? parseQuantity(d.quantity) : null,
      unitPriceHtCents: d?.price.trim() ? parseEuros(d.price) : null,
    };
  };
  const posts = lines.filter((l) => l.kind === "poste");
  const totals = tenderTotals(
    lines.map((l) => ({ kind: l.kind, architectQuantityMilli: null, ...value(l) })),
    vat,
  );
  const missing = posts.filter((l) => value(l).quantityMilli === null).length;
  const photo = posts.filter((l) => l.quantity_source === "photo").length;
  const invalid = posts.some((l) => {
    const d = drafts[l.id];
    const v = value(l);
    return (
      (d?.quantity.trim() && v.quantityMilli === null) ||
      (d?.price.trim() && v.unitPriceHtCents === null)
    );
  });
  const change = (id: string, field: keyof Draft, next: string) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id]!, [field]: next } }));
    setDirty(true);
  };
  const payload = JSON.stringify(posts.map((l) => ({ id: l.id, ...value(l) })));
  const lot = lots.find((l) => l.key === lotKey) ?? lots[0];
  const selected = posts.find((l) => l.id === lineId) ?? null;
  const base = `/pro/demandes/appels-offres/${tenderId}`;
  const lotTotal = (lot?.posts ?? []).reduce((sum, l) => {
    const v = value(l);
    return v.quantityMilli !== null && v.unitPriceHtCents !== null
      ? sum + lineTotalHtCents(v.quantityMilli, v.unitPriceHtCents)
      : sum;
  }, 0);
  const sourceOf = (l: TenderLine) => {
    const v = value(l);
    return v.quantityMilli !== l.quantity_milli ? "saisi" : (l.quantity_source ?? "manque");
  };
  const locked = dirty || exportLocked;

  return (
    <form
      action={(formData) => {
        setDirty(false);
        formAction(formData);
      }}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="tenderId" value={tenderId} />
      <input type="hidden" name="lines" value={payload} />

      {/* Les lots, un par métier. */}
      <div
        role="tablist"
        aria-label={p.lotsLabel}
        className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5"
      >
        {lots.map((l) => {
          const lotMissing = l.posts.filter((x) => value(x).quantityMilli === null).length;
          const active = l.key === lot?.key;
          return (
            <button
              key={l.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setLotKey(l.key);
                setLineId(l.posts.find((x) => x.quantity_detail)?.id ?? l.posts[0]?.id ?? null);
              }}
              className={`flex flex-col gap-1.5 rounded-card px-3.5 py-3 text-left transition-colors ${
                active
                  ? "border-2 border-primary bg-primary-soft"
                  : "border border-border bg-surface hover:bg-background"
              }`}
            >
              <span className="text-xs font-bold text-muted-foreground">{l.code}</span>
              <span className="text-[0.9375rem] font-semibold">{capitalize(l.name)}</span>
              <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {p.lotPosts(l.posts.length)}
                {lotMissing ? (
                  <StatusBadge tone="warning">{p.lotMissing(lotMissing)}</StatusBadge>
                ) : (
                  <StatusBadge tone="success">{p.lotComplete}</StatusBadge>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-start gap-5 lg:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
          <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
              <h2 className="text-lg font-semibold">
                {[lot?.code, capitalize(lot?.name ?? "")].filter(Boolean).join(" — ")}
              </h2>
              <span className="text-sm text-muted-foreground">{p.tableHint}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-left text-sm">
                <caption className="sr-only">{t.table.label}</caption>
                <thead className="border-y border-border bg-background text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">
                      {t.table.code}
                    </th>
                    <th scope="col" className="px-2 py-2.5">
                      {t.table.designation}
                    </th>
                    <th scope="col" className="px-2 py-2.5">
                      {t.table.unit}
                    </th>
                    <th scope="col" className="px-2 py-2.5 text-right">
                      {p.quantity}
                    </th>
                    <th scope="col" className="px-2 py-2.5">
                      {p.origin}
                    </th>
                    <th scope="col" className="px-2 py-2.5 text-right">
                      {t.table.unitPrice}
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right">
                      {t.table.total}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(lot?.posts ?? []).map((line) => {
                    const d = drafts[line.id]!;
                    const v = value(line);
                    const source = sourceOf(line);
                    const fromLibrary =
                      (line.price_source === "devis" || line.price_source === "bibliotheque") &&
                      v.unitPriceHtCents === line.unit_price_ht_cents;
                    const total =
                      v.quantityMilli !== null && v.unitPriceHtCents !== null
                        ? lineTotalHtCents(v.quantityMilli, v.unitPriceHtCents)
                        : null;
                    return (
                      <tr
                        key={line.id}
                        onClick={() => setLineId(line.id)}
                        className={`border-t border-border align-middle ${
                          lineId === line.id ? "bg-primary-softer" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-muted-foreground tabular-nums">
                          {line.code}
                        </td>
                        <td className="px-2 py-3 font-semibold">{line.designation}</td>
                        <td className="px-2 py-3 text-muted-foreground">{line.unit_label}</td>
                        <td className="px-2 py-2 text-right">
                          <input
                            inputMode="decimal"
                            aria-label={t.table.quantityOf(line.designation)}
                            value={d.quantity}
                            onFocus={() => setLineId(line.id)}
                            onChange={(e) => change(line.id, "quantity", e.target.value)}
                            aria-invalid={
                              d.quantity.trim() !== "" && v.quantityMilli === null
                                ? true
                                : undefined
                            }
                            className={`${inputClasses} !min-h-10 !w-24 text-right tabular-nums ${
                              source === "manque" ? "border-dashed bg-warning-soft/60" : ""
                            }`}
                          />
                        </td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <StatusBadge tone={TONES[source]}>{p.quantitySource[source]}</StatusBadge>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <span className="inline-flex flex-col items-end gap-1">
                            <input
                              inputMode="decimal"
                              aria-label={t.table.priceOf(line.designation)}
                              value={d.price}
                              onChange={(e) => change(line.id, "price", e.target.value)}
                              aria-invalid={
                                d.price.trim() !== "" && v.unitPriceHtCents === null
                                  ? true
                                  : undefined
                              }
                              className={`${inputClasses} !min-h-10 !w-28 text-right tabular-nums`}
                            />
                            {v.unitPriceHtCents === null ? (
                              <StatusBadge tone="warning">{t.source.none}</StatusBadge>
                            ) : fromLibrary ? (
                              <span
                                title={
                                  line.price_reference
                                    ? t.source.reference(line.price_reference)
                                    : undefined
                                }
                              >
                                <StatusBadge
                                  tone={
                                    line.price_source === "bibliotheque" ? "primary" : "success"
                                  }
                                >
                                  {line.price_source === "bibliotheque"
                                    ? t.source.bibliotheque
                                    : t.source.devis}
                                </StatusBadge>
                              </span>
                            ) : (
                              <StatusBadge tone="neutral">{t.source.manuel}</StatusBadge>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                          {total === null ? "—" : money(total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td colSpan={6} className="px-4 py-3 text-right font-semibold">
                      {p.lotTotal(lot?.code ?? "")}
                    </td>
                    <td className="px-4 py-3 text-right text-base font-bold whitespace-nowrap tabular-nums">
                      {money(lotTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-3 text-sm font-semibold whitespace-nowrap">
              {t.vat}
              <select
                name="vat"
                value={vat}
                onChange={(e) => {
                  setVat(Number(e.target.value));
                  setDirty(true);
                }}
                className={`${inputClasses} !min-h-10 !w-auto`}
              >
                {vatOptions.map((rate) => (
                  <option key={rate} value={rate}>
                    {t.vatOptions[rate]}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-3">
              {dirty && <span className="text-sm text-warning">{t.unsaved}</span>}
              <Button type="submit" disabled={pending || invalid} block={false}>
                {t.save}
              </Button>
            </div>
          </div>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          {state.success && !dirty && <Alert tone="success">{state.success}</Alert>}
        </div>

        <aside className="flex w-full flex-col gap-4 lg:w-[19rem] lg:shrink-0">
          {selected && (
            <section
              aria-label={p.detailLabel}
              className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-5 shadow-card"
            >
              <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                {p.detailEyebrow(selected.code ?? "")}
              </span>
              <h2 className="text-lg leading-snug font-semibold">{selected.designation}</h2>
              <StatusBadge tone={TONES[sourceOf(selected)]}>
                {p.quantitySource[sourceOf(selected)]}
              </StatusBadge>
              <p className="text-sm leading-relaxed text-label">
                {selected.quantity_detail ?? p.noDetail}
              </p>
              <div className="flex items-baseline justify-between border-t-2 border-border pt-2.5">
                <span className="font-semibold">{p.quantity}</span>
                <span className="font-semibold tabular-nums">
                  {value(selected).quantityMilli === null
                    ? p.quantitySource.manque
                    : `${formatQuantity(value(selected).quantityMilli ?? 0)} ${selected.unit_label ?? ""}`}
                </span>
              </div>
            </section>
          )}
          <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card">
            <h2 className="text-lg font-semibold">{p.check.title}</h2>
            {(missing > 0 || photo > 0) && (
              <ul className="flex flex-col gap-1.5 text-sm">
                {missing > 0 && (
                  <li className="flex items-start gap-2">
                    <TriangleAlert
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-warning"
                    />
                    {p.checkMissing(missing, posts.length)}
                  </li>
                )}
                {photo > 0 && (
                  <li className="flex items-start gap-2">
                    <TriangleAlert
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-warning"
                    />
                    {p.checkPhoto(photo)}
                  </li>
                )}
              </ul>
            )}
            {checkSlot}
            {exportLocked && <p className="text-sm text-muted-foreground">{p.check.locked}</p>}
            {dirty && <p className="text-sm text-muted-foreground">{t.saveFirst}</p>}
            <div className="flex flex-col gap-2">
              {(
                [
                  [`${base}/excel`, p.excel, FileSpreadsheet, false],
                  [`${base}/pdf`, t.exportPdf, FileText, true],
                ] as const
              ).map(([href, label, Icon, blank]) => (
                <a
                  key={href}
                  href={href}
                  {...(blank ? { target: "_blank", rel: "noreferrer" } : {})}
                  aria-disabled={locked || undefined}
                  className="flex items-center gap-3 rounded-input border border-border px-4 py-3 text-sm font-semibold hover:border-primary/40 aria-disabled:pointer-events-none aria-disabled:opacity-50"
                >
                  {locked ? (
                    <Lock aria-hidden="true" className="size-4 shrink-0" />
                  ) : (
                    <Icon aria-hidden="true" className="size-4 shrink-0 text-primary-strong" />
                  )}
                  <span className="flex-1">{label}</span>
                  <Download aria-label={t.download} className="size-4 shrink-0" />
                </a>
              ))}
            </div>
            <dl className="flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t.figures.totalHt}</dt>
                <dd className="font-semibold tabular-nums">{money(totals.totalHtCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{p.totalTtc}</dt>
                <dd className="font-semibold tabular-nums">{money(totals.totalTtcCents)}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">{p.check.stillOpen}</p>
          </section>
        </aside>
      </div>
    </form>
  );
}
