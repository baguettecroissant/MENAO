"use client";

import {
  componentAmounts,
  type ComponentKind,
  formatCoefficient,
  formatEurosInput,
  formatQuantity,
  formatRateBp,
  type LibrarySettings,
  type LibrarySupply,
  parseEuros,
  parseQuantity,
  QUOTE_UNITS,
  type QuoteUnit,
  type WorkComponent,
  workPricing,
} from "@menao/core";
import { EyeOff, Plus, X } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { Alert, Button, Card, CardTitle, Field, StatusBadge, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { saveWork } from "@/lib/artisan/library-actions";
import type { ComponentRow, SupplyRow, WorkRow } from "@/lib/artisan/library";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.library.work;
const q = fr.pro.quote;
const units = q.unitsShort as Record<string, string>;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);
const VAT = [2000, 1000, 550, 0] as const;
const LINE_TYPES = ["materiel", "main_oeuvre", "autre"] as const;

type Draft = {
  key: string;
  kind: ComponentKind;
  supplyId: string;
  label: string;
  quantity: string;
  cost: string;
};

const toDraft = (c: ComponentRow, i: number): Draft => ({
  key: `c${i}`,
  kind: c.kind,
  supplyId: c.supply_id ?? "",
  label: c.label ?? "",
  quantity: formatQuantity(c.quantity_milli),
  cost: c.cost_cents === null ? "" : formatEurosInput(c.cost_cents),
});

/**
 * Un ouvrage de la bibliothèque (F-141, ADR 0293) : ce que voit le client, la composition privée
 * (fournitures, heures, autres frais), puis coût, prix de vente et marge recalculés à la frappe.
 */
export function WorkEditor({
  work,
  components,
  supplies,
  settings,
}: {
  work: WorkRow | null;
  components: ComponentRow[];
  supplies: SupplyRow[];
  settings: LibrarySettings;
}) {
  const [state, formAction, pending] = useActionState(saveWork, initialFormState);
  const [designation, setDesignation] = useState(work?.designation ?? "");
  const [description, setDescription] = useState(work?.description ?? "");
  const [unit, setUnit] = useState<QuoteUnit>(work?.unit ?? "u");
  const [lineType, setLineType] = useState<(typeof LINE_TYPES)[number]>(work?.line_type ?? "autre");
  const [vat, setVat] = useState<number>(work?.vat_rate_bp ?? 1000);
  const [detailed, setDetailed] = useState(work?.detailed ?? false);
  const [manual, setManual] = useState<string | null>(
    work?.manual_price_cents == null ? null : formatEurosInput(work.manual_price_cents),
  );
  const [drafts, setDrafts] = useState<Draft[]>(() => components.map(toDraft));
  const [added, setAdded] = useState(0);

  const bySupply = useMemo(
    () =>
      new Map<string, LibrarySupply>(
        supplies.map((s) => [
          s.id,
          { id: s.id, purchasePriceCents: s.purchase_price_cents, wasteBp: s.waste_bp },
        ]),
      ),
    [supplies],
  );
  const parsed = drafts.map((d) => ({
    d,
    quantityMilli: parseQuantity(d.quantity),
    costCents: d.kind === "frais" ? parseEuros(d.cost) : null,
  }));
  const manualCents = manual === null ? null : parseEuros(manual);
  const comps: WorkComponent[] = parsed
    .filter((p) => p.quantityMilli !== null && p.quantityMilli > 0)
    .map((p) => ({
      kind: p.d.kind,
      supplyId: p.d.kind === "fourniture" ? p.d.supplyId || null : null,
      quantityMilli: p.quantityMilli ?? 0,
      costCents: p.costCents,
    }));
  const pricing = workPricing(manualCents, comps, settings, bySupply);
  const invalid =
    !designation.trim() ||
    (manual !== null && manualCents === null) ||
    parsed.some(
      (p) =>
        p.quantityMilli === null ||
        p.quantityMilli <= 0 ||
        (p.d.kind === "fourniture" && !p.d.supplyId) ||
        (p.d.kind === "frais" && (!p.d.label.trim() || p.costCents === null)),
    );

  const payload = JSON.stringify({
    work: {
      designation: designation.trim(),
      description: description.trim(),
      unit,
      lineType,
      vatRateBp: vat,
      detailed,
      manualPriceCents: manualCents,
    },
    components: parsed.map((p) =>
      p.d.kind === "fourniture"
        ? { kind: "fourniture", supplyId: p.d.supplyId, quantityMilli: p.quantityMilli }
        : p.d.kind === "heures"
          ? { kind: "heures", quantityMilli: p.quantityMilli }
          : {
              kind: "frais",
              label: p.d.label.trim(),
              quantityMilli: p.quantityMilli,
              costCents: p.costCents,
            },
    ),
  });

  const add = (kind: ComponentKind) => {
    setDrafts((list) => [
      ...list,
      {
        key: `n${added}`,
        kind,
        supplyId: "",
        label: "",
        quantity: kind === "heures" ? "1" : "1",
        cost: "",
      },
    ]);
    setAdded((n) => n + 1);
  };
  const set = (key: string, patch: Partial<Draft>) =>
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const coef = formatCoefficient(settings.supplyCoefBp);
  const hoursMissing =
    drafts.some((d) => d.kind === "heures") &&
    (settings.hourCostCents === null || settings.hourPriceCents === null);
  const select = `${inputClasses} !min-h-10 px-2.5`;
  const name = (d: Draft): string =>
    (d.kind === "fourniture"
      ? supplies.find((s) => s.id === d.supplyId)?.designation
      : d.kind === "frais"
        ? d.label
        : undefined) ||
    (t.kinds[d.kind] ?? "");

  return (
    <form
      action={(formData) => {
        formData.set("id", work?.id ?? "");
        formData.set("payload", payload);
        formAction(formData);
      }}
      className="grid items-start gap-5 lg:grid-cols-[1fr_20rem]"
    >
      <div className="flex min-w-0 flex-col gap-5">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.success && <Alert tone="success">{state.success}</Alert>}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle title={t.clientTitle} />
            <StatusBadge tone="primary">{t.clientBadge}</StatusBadge>
          </div>
          <Field
            label={t.designation}
            name="designation"
            required
            maxLength={200}
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
          />
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            <span>
              {t.description}{" "}
              <span className="font-normal text-subtle-foreground">{t.descriptionNote}</span>
            </span>
            <textarea
              value={description}
              maxLength={1000}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClasses} py-3 font-normal`}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t.unit}
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as QuoteUnit)}
                className={inputClasses}
              >
                {QUOTE_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {(q.units as Record<string, string>)[u] ?? u}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t.vat}
              <select
                value={vat}
                onChange={(e) => setVat(Number(e.target.value))}
                className={inputClasses}
              >
                {VAT.map((rate) => (
                  <option key={rate} value={rate}>
                    {fr.pro.tenders.vatOptions[rate]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t.lineType}
              <select
                value={lineType}
                onChange={(e) => setLineType(e.target.value as (typeof LINE_TYPES)[number])}
                className={inputClasses}
              >
                {LINE_TYPES.map((lt) => (
                  <option key={lt} value={lt}>
                    {q.types[lt]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">{t.display}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  [false, t.displayLine, t.displayLineHint],
                  [true, t.displayDetail, t.displayDetailHint],
                ] as const
              ).map(([value, label, hint]) => (
                <label
                  key={label}
                  className="flex cursor-pointer items-start gap-3 rounded-input border border-border bg-surface p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-softer"
                >
                  <input
                    type="radio"
                    name="display"
                    checked={detailed === value}
                    onChange={() => setDetailed(value)}
                    className="mt-0.5 size-[1.125rem] accent-primary"
                  />
                  <span className="flex flex-col">
                    <span className="font-semibold">{label}</span>
                    <span className="text-xs text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{t.displayNote}</p>
          </fieldset>
        </Card>

        <Card className="flex flex-col gap-0 overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <h2 className="text-lg font-semibold">{t.compoTitle}</h2>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <EyeOff aria-hidden="true" className="size-4" />
              {t.private}
            </span>
          </div>
          {drafts.length > 0 && (
            <ul className="flex flex-col">
              {parsed.map(({ d, quantityMilli, costCents }) => {
                const amounts =
                  quantityMilli !== null && quantityMilli > 0
                    ? componentAmounts(
                        {
                          kind: d.kind,
                          supplyId: d.kind === "fourniture" ? d.supplyId || null : null,
                          quantityMilli,
                          costCents,
                        },
                        settings,
                        bySupply,
                      )
                    : null;
                return (
                  <li
                    key={d.key}
                    className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3"
                  >
                    <span className="w-28 shrink-0 text-xs font-semibold text-muted-foreground">
                      {t.kinds[d.kind]}
                    </span>
                    {d.kind === "fourniture" ? (
                      <select
                        value={d.supplyId}
                        aria-label={t.fieldOf(t.element, name(d))}
                        onChange={(e) => set(d.key, { supplyId: e.target.value })}
                        className={`${select} min-w-48 flex-1`}
                      >
                        <option value="">{supplies.length ? t.chooseSupply : t.noSupplies}</option>
                        {supplies.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.designation} · {money(s.purchase_price_cents)} /{" "}
                            {units[s.unit] ?? s.unit}
                          </option>
                        ))}
                      </select>
                    ) : d.kind === "frais" ? (
                      <input
                        value={d.label}
                        maxLength={200}
                        placeholder={t.otherLabel}
                        aria-label={t.fieldOf(t.element, name(d))}
                        onChange={(e) => set(d.key, { label: e.target.value })}
                        className={`${select} min-w-48 flex-1`}
                      />
                    ) : (
                      <span className="min-w-48 flex-1 text-sm text-muted-foreground">
                        {t.hourCost}
                        {settings.hourCostCents !== null &&
                          ` · ${money(settings.hourCostCents)} / h`}
                      </span>
                    )}
                    <input
                      value={d.quantity}
                      inputMode="decimal"
                      aria-label={t.fieldOf(t.quantity, name(d))}
                      aria-invalid={quantityMilli === null || quantityMilli <= 0 || undefined}
                      onChange={(e) => set(d.key, { quantity: e.target.value })}
                      className={`${select} !w-20 text-right tabular-nums`}
                    />
                    {d.kind === "frais" && (
                      <input
                        value={d.cost}
                        inputMode="decimal"
                        placeholder={t.unitCost}
                        aria-label={t.fieldOf(t.unitCost, name(d))}
                        onChange={(e) => set(d.key, { cost: e.target.value })}
                        className={`${select} !w-24 text-right tabular-nums`}
                      />
                    )}
                    <span className="w-24 text-right text-sm font-semibold tabular-nums">
                      {amounts?.costCents == null ? "—" : money(amounts.costCents)}
                    </span>
                    <button
                      type="button"
                      aria-label={t.removeComponent(name(d))}
                      onClick={() => setDrafts((list) => list.filter((x) => x.key !== d.key))}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap gap-4 border-t border-border px-5 py-3 text-sm font-semibold text-primary-strong">
            {(
              [
                ["fourniture", t.addSupply],
                ["heures", t.addHours],
                ["frais", t.addOther],
              ] as const
            ).map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                onClick={() => add(kind)}
                className="inline-flex items-center gap-1.5"
              >
                <Plus aria-hidden="true" className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-6">
        <Card className="flex flex-col gap-3">
          <CardTitle title={t.pricingTitle} />
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t.costLine}</dt>
              <dd className="font-semibold tabular-nums">
                {pricing.costCents === null ? "—" : money(pricing.costCents)}
              </dd>
            </div>
            {pricing.supplies.costCents ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  {t.suppliesLine(money(pricing.supplies.costCents), coef)}
                </dt>
                <dd className="font-semibold tabular-nums">
                  {pricing.supplies.saleCents === null ? "—" : money(pricing.supplies.saleCents)}
                </dd>
              </div>
            ) : null}
            {pricing.labor.hoursMilli > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  {t.hoursLine(
                    formatQuantity(pricing.labor.hoursMilli),
                    settings.hourPriceCents === null ? "—" : money(settings.hourPriceCents),
                  )}
                </dt>
                <dd className="font-semibold tabular-nums">
                  {pricing.labor.saleCents === null ? "—" : money(pricing.labor.saleCents)}
                </dd>
              </div>
            )}
            {pricing.other.costCents ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  {t.otherLine(money(pricing.other.costCents), coef)}
                </dt>
                <dd className="font-semibold tabular-nums">
                  {pricing.other.saleCents === null ? "—" : money(pricing.other.saleCents)}
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
            <span className="font-semibold">{t.salePrice}</span>
            <span className="text-2xl font-bold tabular-nums" aria-live="polite">
              {pricing.priceCents === null ? "—" : money(pricing.priceCents)}
            </span>
          </div>
          {pricing.marginCents !== null && pricing.markupBp !== null ? (
            <p
              className={`flex items-center justify-between gap-3 rounded-input px-3 py-2.5 text-sm font-semibold ${
                pricing.marginCents < 0
                  ? "bg-danger-soft text-danger"
                  : "bg-success-soft text-success"
              }`}
            >
              <span>{pricing.marginCents < 0 ? t.loss : t.margin(money(pricing.marginCents))}</span>
              <span>{t.rate(formatRateBp(pricing.markupBp))}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{t.unknownCost}</p>
          )}
          {hoursMissing && <p className="text-sm text-warning">{t.missingSettings}</p>}
          {manual === null ? (
            <button
              type="button"
              onClick={() =>
                setManual(pricing.priceCents === null ? "" : formatEurosInput(pricing.priceCents))
              }
              className="self-start text-sm font-semibold text-primary-strong"
            >
              {t.manual}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <Field
                label={t.manualLabel}
                name="manual"
                inputMode="decimal"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
              />
              {comps.length > 0 && (
                <button
                  type="button"
                  onClick={() => setManual(null)}
                  className="self-start text-sm font-semibold text-primary-strong"
                >
                  {t.computed}
                </button>
              )}
            </div>
          )}
          {pricing.marginCents !== null && pricing.costCents ? (
            <p className="text-xs text-muted-foreground">
              {t.rateNote(
                formatRateBp(Math.round((pricing.marginCents * 10_000) / pricing.costCents)),
              )}
            </p>
          ) : null}
        </Card>
        {invalid && designation.trim() && <p className="text-sm text-danger">{t.invalid}</p>}
        <Button type="submit" disabled={pending || invalid}>
          {t.save}
        </Button>
      </div>
    </form>
  );
}
