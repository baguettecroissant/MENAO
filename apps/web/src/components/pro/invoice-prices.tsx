"use client";

import {
  type InvoiceNewSupply,
  type InvoicePriceChange,
  PRICE_JUMP_BP,
  type SupplyDependentWork,
  worksRecalculated,
} from "@menao/core";
import { AlertTriangle, Check, CircleHelp, ReceiptText } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { applyInvoicePrices } from "@/lib/artisan/library-invoice-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.library.invoices;
const units = fr.pro.quote.unitsShort as Record<string, string>;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);
const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const percent = (bp: number) =>
  `${bp > 0 ? "+" : ""}${(bp / 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;

export type InvoiceChangeView = InvoicePriceChange & {
  designation: string;
  reference: string | null;
};

/** Case à cocher de la maquette : carré bleu nuit coché, bordure grise sinon. */
function Box({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="relative inline-flex size-[1.125rem] cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2">
      <input
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="inline-flex size-[1.125rem] items-center justify-center rounded-[5px] border-[1.5px] border-border-strong bg-surface text-surface peer-checked:border-foreground peer-checked:bg-foreground"
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    </label>
  );
}

/**
 * Prix d'achat repérés dans les factures (F-149, ADR 0311, maquette lot 43) : prix changés
 * (cochés sauf écart de plus de 30 %), articles inconnus à ajouter, bilan et mise à jour d'un geste.
 */
export function InvoicePrices({
  changes,
  fresh,
  since,
  works,
}: {
  changes: InvoiceChangeView[];
  fresh: InvoiceNewSupply[];
  since: string | null;
  works: SupplyDependentWork[];
}) {
  const [state, formAction, pending] = useActionState(applyInvoicePrices, initialFormState);
  const [updates, setUpdates] = useState(
    () => new Set(changes.filter((c) => c.checked).map((c) => c.supplyId)),
  );
  const [adds, setAdds] = useState(() => new Set<string>());
  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };
  const recalculated = worksRecalculated(works, updates);
  const jumps = changes.some((c) => c.deltaBp !== null && Math.abs(c.deltaBp) > PRICE_JUMP_BP);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <p className="flex items-center gap-3.5 rounded-[0.875rem] bg-primary-soft px-[1.125rem] py-3.5 text-[0.90625rem] leading-[1.45]">
        <ReceiptText aria-hidden="true" className="size-[1.375rem] shrink-0 text-primary-strong" />
        <span className="flex-1">
          {t.intro[0]}
          <b>{t.intro[1]}</b>
          {t.intro[2]}
        </span>
      </p>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {[...changes.map((c) => c.lineId), ...fresh.map((f) => f.lineId)].map((id) => (
        <input key={id} type="hidden" name="seen" value={id} />
      ))}
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="flex min-w-0 flex-col gap-[1.125rem]">
          {changes.length > 0 && (
            <section className="overflow-hidden rounded-card border border-border bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-2 p-4">
                <h2 className="text-[1.0625rem] font-bold tracking-tight">
                  {t.changedTitle(changes.length)}
                </h2>
                {since && (
                  <span className="text-[0.8125rem] text-muted-foreground">
                    {t.since(dayMonth(since))}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="bg-background text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="w-[1.125rem] px-4 py-2.5">
                        <span className="sr-only">{t.summary.updated}</span>
                      </th>
                      <th scope="col" className="px-2 py-2.5 font-bold">
                        {t.columns.supply}
                      </th>
                      <th scope="col" className="px-2 py-2.5 font-bold">
                        {t.columns.invoice}
                      </th>
                      <th scope="col" className="px-2 py-2.5 text-right font-bold">
                        {t.columns.current}
                      </th>
                      <th scope="col" className="px-2 py-2.5 text-right font-bold">
                        {t.columns.next}
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-bold">
                        {t.columns.delta}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((c) => (
                      <tr key={c.supplyId} className="border-t border-border">
                        <td className="px-4 py-[0.8125rem]">
                          <Box
                            name="update"
                            value={`${c.supplyId}:${c.lineId}`}
                            checked={updates.has(c.supplyId)}
                            onChange={() => setUpdates((s) => toggle(s, c.supplyId))}
                            label={t.select(c.designation)}
                          />
                        </td>
                        <td className="px-2 py-[0.8125rem]">
                          <b>{c.designation}</b>
                          <span className="block text-[0.78125rem] text-muted-foreground">
                            {c.matchedBy === "reference" && c.reference
                              ? t.matched.reference(c.reference)
                              : t.matched.designation}
                          </span>
                        </td>
                        <td className="px-2 py-[0.8125rem] text-[0.84375rem] text-muted-foreground">
                          {t.source(c.supplier, dayMonth(c.issuedOn))}
                        </td>
                        <td className="px-2 py-[0.8125rem] text-right whitespace-nowrap text-muted-foreground tabular-nums">
                          {c.oldCents === null ? t.noPrice : money(c.oldCents)}
                        </td>
                        <td className="px-2 py-[0.8125rem] text-right font-bold whitespace-nowrap tabular-nums">
                          {money(c.newCents)}
                        </td>
                        <td className="px-4 py-[0.8125rem]">
                          {c.deltaBp !== null && (
                            <span
                              className={`inline-flex h-6 items-center rounded-[7px] px-2 text-[0.78125rem] font-bold whitespace-nowrap ${
                                c.deltaBp > 0
                                  ? "bg-warning-soft text-warning"
                                  : "bg-success-soft text-success"
                              }`}
                            >
                              {percent(c.deltaBp)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {jumps && (
                <p className="flex items-center gap-2.5 border-t border-border px-4 py-3 text-[0.8125rem] text-warning">
                  <AlertTriangle aria-hidden="true" className="size-[0.9375rem] shrink-0" />
                  {t.jump}
                </p>
              )}
            </section>
          )}
          {fresh.length > 0 && (
            <section className="overflow-hidden rounded-card border border-border bg-surface">
              <div className="p-4">
                <h2 className="text-[1.0625rem] font-bold tracking-tight">
                  {t.freshTitle(fresh.length)}
                </h2>
                <p className="mt-1 text-[0.84375rem] text-muted-foreground">{t.freshLead}</p>
              </div>
              <table className="w-full text-left text-sm">
                <tbody>
                  {fresh.map((f) => (
                    <tr key={f.lineId} className="border-t border-border">
                      <td className="w-[1.125rem] px-4 py-3">
                        <Box
                          name="add"
                          value={f.lineId}
                          checked={adds.has(f.lineId)}
                          onChange={() => setAdds((s) => toggle(s, f.lineId))}
                          label={t.add(f.designation)}
                        />
                      </td>
                      <td className="px-2 py-3">
                        <b>{f.designation}</b>
                        {f.supplier && (
                          <span className="block text-[0.78125rem] text-muted-foreground">
                            {f.supplier}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">{units[f.unit] ?? f.unit}</td>
                      <td className="px-4 py-3 text-right font-bold whitespace-nowrap tabular-nums">
                        {money(f.priceCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
        <section className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-5 lg:sticky lg:top-6">
          <h2 className="text-base font-bold tracking-tight">{t.summaryTitle}</h2>
          <p className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.summary.updated}</span>
            <b>{updates.size}</b>
          </p>
          <p className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.summary.added}</span>
            <b>{adds.size}</b>
          </p>
          <p className="flex justify-between border-t border-border pt-2.5 text-sm">
            <span className="text-muted-foreground">{t.summary.works}</span>
            <b>{recalculated}</b>
          </p>
          <Button
            type="submit"
            disabled={pending}
            variant={updates.size + adds.size > 0 ? "primary" : "secondary"}
            className="!min-h-12 !rounded-pill"
          >
            {t.button(updates.size, adds.size)}
          </Button>
          <p className="flex items-start gap-2 text-[0.8125rem] leading-normal text-muted-foreground">
            <CircleHelp aria-hidden="true" className="mt-0.5 size-[0.9375rem] shrink-0" />
            {t.note}
          </p>
        </section>
      </div>
    </form>
  );
}
