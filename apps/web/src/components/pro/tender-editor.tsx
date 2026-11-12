"use client";

import {
  formatEurosInput,
  formatQuantity,
  lineTotalHtCents,
  parseEuros,
  parseQuantity,
  tenderGaps,
  tenderTotals,
} from "@menao/core";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { type ReactNode, useActionState, useMemo, useState } from "react";
import { MoneyFigures } from "@/components/pro/money-figures";
import { Alert, Button, Card, CardTitle, StatusBadge, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { saveTender } from "@/lib/artisan/tender-actions";
import type { TenderLine } from "@/lib/artisan/tenders";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.tenders;
const QUANTITY_TONES = {
  plan: "success",
  calcul: "primary",
  photo: "warning",
  manque: "warning",
  saisi: "neutral",
} as const;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);

type Draft = { quantity: string; price: string };

/**
 * DPGF chiffré (ADR 0287) : quantité de l'architecte, quantité retenue et prix unitaire de chaque
 * poste, avec l'origine du prix (ancien devis ou saisi), totaux et écarts recalculés à la frappe.
 */
export function TenderEditor({
  tenderId,
  lines,
  vatRateBp,
  vatOptions,
  sourceKind,
  exportLocked = false,
  checkSlot,
}: {
  tenderId: string;
  lines: TenderLine[];
  vatRateBp: number;
  vatOptions: readonly number[];
  /**
   * Fichier de l'architecte : Excel (réécrit tel quel) ou PDF (classeur MENAO, ADR 0288) ; ou DPGF
   * créé depuis les plans (ADR 0292) : origine et calcul de chaque quantité.
   */
  sourceKind: "xlsx" | "pdf" | "plan" | null;
  /** Export bloqué tant que l'artisan n'a pas vérifié les quantités (DPGF créé depuis les plans). */
  exportLocked?: boolean;
  /** Case « J'ai vérifié les quantités », affichée avec l'export. */
  checkSlot?: ReactNode;
}) {
  const fromPlan = sourceKind === "plan";
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

  const parsed = useMemo(
    () =>
      lines.map((l) => {
        const d = drafts[l.id];
        const quantityMilli = d ? (d.quantity.trim() ? parseQuantity(d.quantity) : null) : null;
        const unitPriceHtCents = d ? (d.price.trim() ? parseEuros(d.price) : null) : null;
        return { line: l, quantityMilli, unitPriceHtCents };
      }),
    [lines, drafts],
  );
  const amounts = parsed.map((p) => ({
    kind: p.line.kind,
    quantityMilli: p.quantityMilli,
    architectQuantityMilli: p.line.architect_quantity_milli,
    unitPriceHtCents: p.unitPriceHtCents,
  }));
  const totals = tenderTotals(amounts, vat);
  const gaps = tenderGaps(amounts);
  const missingQuantities = parsed.filter(
    (p) => p.line.kind === "poste" && p.quantityMilli === null,
  ).length;
  const invalid = parsed.some(
    (p) =>
      p.line.kind === "poste" &&
      ((drafts[p.line.id]?.quantity.trim() && p.quantityMilli === null) ||
        (drafts[p.line.id]?.price.trim() && p.unitPriceHtCents === null)),
  );

  const change = (id: string, field: keyof Draft, value: string) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id]!, [field]: value } }));
    setDirty(true);
  };
  const payload = JSON.stringify(
    parsed
      .filter((p) => p.line.kind === "poste")
      .map((p) => ({
        id: p.line.id,
        quantityMilli: p.quantityMilli,
        unitPriceHtCents: p.unitPriceHtCents,
      })),
  );
  const base = `/pro/demandes/appels-offres/${tenderId}`;

  return (
    <div className="flex flex-col gap-6">
      <MoneyFigures
        label={t.figuresLabel}
        cells={[
          {
            label: t.figures.posts,
            value: String(totals.posts),
            hint: t.figures.priced(totals.priced),
          },
          {
            label: t.figures.toPrice,
            value: String(totals.toPrice),
            hint: t.figures.toPriceHint(totals.toPrice),
            tone: totals.toPrice > 0 ? "danger" : undefined,
          },
          {
            label: t.figures.totalHt,
            value: money(totals.totalHtCents),
            hint: t.figures.totalTtc(money(totals.totalTtcCents)),
          },
          fromPlan
            ? {
                label: t.plan.figureMissing,
                value: String(missingQuantities),
                hint: t.plan.figureMissingHint,
                tone: missingQuantities > 0 ? "danger" : undefined,
              }
            : {
                label: t.figures.gaps,
                value: String(gaps.changed),
                hint: t.figures.gapsHint(
                  gaps.underestimatedHtCents > 0 ? money(gaps.underestimatedHtCents) : null,
                ),
              },
        ]}
      />

      <form
        action={(formData) => {
          setDirty(false);
          formAction(formData);
        }}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="tenderId" value={tenderId} />
        <input type="hidden" name="lines" value={payload} />
        <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <caption className="sr-only">{t.table.label}</caption>
            <thead className="border-b border-border bg-background text-[0.8125rem] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t.table.code}
                </th>
                <th scope="col" className="px-2 py-3 font-semibold">
                  {t.table.designation}
                </th>
                <th scope="col" className="px-2 py-3 font-semibold">
                  {t.table.unit}
                </th>
                <th
                  scope="col"
                  className={`px-2 py-3 font-semibold ${fromPlan ? "text-left" : "text-right"}`}
                >
                  {fromPlan ? t.plan.origin : t.table.architectQuantity}
                </th>
                <th scope="col" className="px-2 py-3 text-right font-semibold">
                  {t.table.quantity}
                </th>
                <th scope="col" className="px-2 py-3 text-right font-semibold">
                  {t.table.unitPrice}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  {t.table.total}
                </th>
              </tr>
            </thead>
            <tbody>
              {parsed.map(({ line, quantityMilli, unitPriceHtCents }) => {
                if (line.kind === "titre") {
                  return (
                    <tr key={line.id} className="border-t border-border bg-background">
                      <th
                        scope="colgroup"
                        colSpan={7}
                        className="px-4 py-2.5 text-left font-semibold"
                      >
                        {[line.code, line.designation].filter(Boolean).join(" ")}
                      </th>
                    </tr>
                  );
                }
                const d = drafts[line.id]!;
                const changed =
                  quantityMilli !== null &&
                  line.architect_quantity_milli !== null &&
                  quantityMilli !== line.architect_quantity_milli;
                const fromQuote =
                  line.price_source === "devis" && unitPriceHtCents === line.unit_price_ht_cents;
                const total =
                  quantityMilli !== null && unitPriceHtCents !== null
                    ? lineTotalHtCents(quantityMilli, unitPriceHtCents)
                    : null;
                return (
                  <tr
                    key={line.id}
                    className={`border-t border-border align-top ${changed ? "bg-warning-soft/60" : ""}`}
                  >
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{line.code}</td>
                    <td className="px-2 py-3">
                      <span className="font-medium">{line.designation}</span>
                      {fromPlan && line.quantity_detail && (
                        <details className="mt-1 text-xs text-muted-foreground">
                          <summary className="cursor-pointer font-semibold text-primary-strong">
                            {t.plan.detail}
                          </summary>
                          <p className="mt-1 max-w-md leading-relaxed">{line.quantity_detail}</p>
                        </details>
                      )}
                      <span className="mt-1 flex">
                        {unitPriceHtCents === null ? (
                          <StatusBadge tone="warning">{t.source.none}</StatusBadge>
                        ) : fromQuote ? (
                          <span
                            title={
                              line.price_reference
                                ? t.source.reference(line.price_reference)
                                : undefined
                            }
                          >
                            <StatusBadge tone="success">{t.source.devis}</StatusBadge>
                          </span>
                        ) : (
                          <StatusBadge tone="primary">{t.source.manuel}</StatusBadge>
                        )}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">{line.unit_label}</td>
                    {fromPlan ? (
                      <td className="px-2 py-3 whitespace-nowrap">
                        {(() => {
                          const source =
                            quantityMilli !== line.quantity_milli
                              ? "saisi"
                              : (line.quantity_source ?? "manque");
                          return (
                            <StatusBadge tone={QUANTITY_TONES[source]}>
                              {t.plan.quantitySource[source]}
                            </StatusBadge>
                          );
                        })()}
                      </td>
                    ) : (
                      <td className="px-2 py-3 text-right text-muted-foreground tabular-nums">
                        {line.architect_quantity_milli === null
                          ? "—"
                          : formatQuantity(line.architect_quantity_milli)}
                      </td>
                    )}
                    <td className="px-2 py-2 text-right">
                      <input
                        inputMode="decimal"
                        aria-label={t.table.quantityOf(line.designation)}
                        value={d.quantity}
                        onChange={(e) => change(line.id, "quantity", e.target.value)}
                        aria-invalid={
                          d.quantity.trim() !== "" && quantityMilli === null ? true : undefined
                        }
                        className={`${inputClasses} !min-h-10 !w-24 text-right tabular-nums ${changed ? "font-semibold text-warning" : ""}`}
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        inputMode="decimal"
                        aria-label={t.table.priceOf(line.designation)}
                        value={d.price}
                        onChange={(e) => change(line.id, "price", e.target.value)}
                        aria-invalid={
                          d.price.trim() !== "" && unitPriceHtCents === null ? true : undefined
                        }
                        className={`${inputClasses} !min-h-10 !w-28 text-right tabular-nums`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {total === null ? "—" : money(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
      </form>

      <Card className="flex flex-col gap-4">
        <CardTitle
          title={fromPlan ? t.plan.check.title : t.exportTitle}
          description={dirty ? t.saveFirst : undefined}
        />
        {checkSlot}
        {exportLocked && <p className="text-sm text-muted-foreground">{t.plan.check.locked}</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {sourceKind && (
            <a
              href={`${base}/excel`}
              aria-disabled={dirty || exportLocked || undefined}
              className="flex items-start gap-3 rounded-input border border-border p-4 hover:border-primary/40 aria-disabled:pointer-events-none aria-disabled:opacity-50"
            >
              <FileSpreadsheet
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-primary-strong"
              />
              <span className="flex flex-1 flex-col gap-1">
                <span className="font-semibold">
                  {fromPlan
                    ? t.plan.excel
                    : sourceKind === "pdf"
                      ? t.exportExcelMenao
                      : t.exportExcel}
                </span>
                <span className="text-sm text-muted-foreground">
                  {fromPlan
                    ? t.plan.excelHint
                    : sourceKind === "pdf"
                      ? t.exportExcelMenaoHint
                      : t.exportExcelHint}
                </span>
              </span>
              <Download aria-label={t.download} className="size-4 shrink-0" />
            </a>
          )}
          <a
            href={`${base}/pdf`}
            target="_blank"
            rel="noreferrer"
            aria-disabled={dirty || exportLocked || undefined}
            className="flex items-start gap-3 rounded-input border border-border p-4 hover:border-primary/40 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            <FileText aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary-strong" />
            <span className="flex flex-1 flex-col gap-1">
              <span className="font-semibold">{t.exportPdf}</span>
              <span className="text-sm text-muted-foreground">{t.exportPdfHint}</span>
            </span>
            <Download aria-label={t.download} className="size-4 shrink-0" />
          </a>
        </div>
        <p className="text-sm text-muted-foreground">
          {fromPlan ? t.plan.check.stillOpen : t.responsibility}
        </p>
      </Card>
    </div>
  );
}
