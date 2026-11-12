"use client";

import { formatEurosInput, QUOTE_UNITS, supplyPriceIsOld } from "@menao/core";
import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert, Button, StatusBadge, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { deleteSupply, saveSupply } from "@/lib/artisan/library-actions";
import type { SupplyRow } from "@/lib/artisan/library";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.library.supplies;
const units = fr.pro.quote.unitsShort as Record<string, string>;
const cell = `${inputClasses} !min-h-10 px-2.5 font-normal`;
const cap = "flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted-foreground";

function SupplyForm({
  supply,
  old,
  onDone,
}: {
  supply: SupplyRow | null;
  old: boolean;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: typeof initialFormState, data: FormData) => {
      const result = await saveSupply(prev, data);
      if (result.success && !supply) onDone?.();
      return result;
    },
    initialFormState,
  );
  const [removeState, removeAction, removing] = useActionState(deleteSupply, initialFormState);
  const name = supply?.designation ?? t.designation;
  const of = (label: string) => fr.pro.library.work.fieldOf(label, name);
  return (
    <li className="flex flex-col gap-2 border-t border-border px-4 py-3 first:border-t-0">
      <form action={formAction} className="grid items-end gap-x-2 gap-y-2.5 sm:grid-cols-6">
        <input type="hidden" name="id" value={supply?.id ?? ""} />
        <label className={`${cap} sm:col-span-3`}>
          {t.designation}
          <input
            name="designation"
            required
            maxLength={200}
            defaultValue={supply?.designation}
            aria-label={of(t.designation)}
            className={`${cell} font-semibold`}
          />
        </label>
        <label className={cap}>
          {t.reference}
          <input
            name="reference"
            maxLength={80}
            defaultValue={supply?.reference ?? ""}
            aria-label={of(t.reference)}
            className={cell}
          />
        </label>
        <label className={`${cap} sm:col-span-2`}>
          {t.supplier}
          <input
            name="supplier"
            maxLength={120}
            defaultValue={supply?.supplier ?? ""}
            aria-label={of(t.supplier)}
            className={cell}
          />
        </label>
        <label className={cap}>
          {t.unit}
          <select
            name="unit"
            defaultValue={supply?.unit ?? "u"}
            aria-label={of(t.unit)}
            className={cell}
          >
            {QUOTE_UNITS.map((u) => (
              <option key={u} value={u}>
                {units[u] ?? u}
              </option>
            ))}
          </select>
        </label>
        <label className={cap}>
          {t.price}
          <input
            name="price"
            required
            inputMode="decimal"
            defaultValue={supply ? formatEurosInput(supply.purchase_price_cents) : ""}
            aria-label={of(t.price)}
            className={`${cell} text-right tabular-nums`}
          />
        </label>
        <label className={`${cap} sm:col-span-2`}>
          {t.priceOn}
          <input
            name="priceOn"
            type="date"
            defaultValue={supply?.price_on ?? ""}
            aria-label={of(t.priceOn)}
            className={cell}
          />
        </label>
        <label className={cap}>
          {t.waste}
          <input
            name="waste"
            inputMode="decimal"
            defaultValue={
              supply && supply.waste_bp ? String(supply.waste_bp / 100).replace(".", ",") : ""
            }
            aria-label={of(t.waste)}
            className={`${cell} text-right`}
          />
        </label>
        <Button
          type="submit"
          size="sm"
          variant={supply ? "secondary" : "primary"}
          disabled={pending}
          block={false}
          className="min-h-10"
        >
          {supply ? t.save : t.add}
        </Button>
      </form>
      {supply && (
        <div className="flex flex-wrap items-center gap-3">
          {old && <StatusBadge tone="warning">{t.old}</StatusBadge>}
          <form action={removeAction}>
            <input type="hidden" name="id" value={supply.id} />
            <button
              type="submit"
              disabled={removing}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-danger"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              {t.remove(supply.designation)}
            </button>
          </form>
        </div>
      )}
      {(state.error ?? removeState.error) && (
        <Alert tone="error">{state.error ?? removeState.error}</Alert>
      )}
      {state.success && supply && <Alert tone="success">{state.success}</Alert>}
    </li>
  );
}

/** Fournitures de la bibliothèque (F-141, ADR 0293) : prix d'achat privés, modifiables sur place. */
export function LibrarySupplies({
  supplies,
  today,
  maxAgeMonths,
}: {
  supplies: SupplyRow[];
  today: string;
  maxAgeMonths: number;
}) {
  const [adding, setAdding] = useState(0);
  return (
    <section aria-label={t.title} className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t.lead}</p>
      <ul className="flex flex-col rounded-card border border-border bg-surface shadow-card">
        {supplies.length === 0 && (
          <li className="px-4 py-4 text-sm text-muted-foreground">{t.empty}</li>
        )}
        {supplies.map((s) => (
          <SupplyForm
            key={`${s.id}-${s.purchase_price_cents}-${s.price_on}`}
            supply={s}
            old={supplyPriceIsOld(s.price_on, today, maxAgeMonths)}
          />
        ))}
      </ul>
      <ul className="flex flex-col rounded-card border border-dashed border-border-strong bg-surface">
        <li className="flex items-center gap-2 px-4 pt-3 text-sm font-semibold">
          <Plus aria-hidden="true" className="size-4" />
          {t.add}
        </li>
        <SupplyForm key={adding} supply={null} old={false} onDone={() => setAdding((n) => n + 1)} />
      </ul>
    </section>
  );
}
