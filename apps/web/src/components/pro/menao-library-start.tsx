"use client";

import { formatCoefficient, formatEurosInput, parseCoefficient, parseEuros } from "@menao/core";
import { BookOpen, Check, FileText, Upload } from "lucide-react";
import { type ReactNode, useActionState, useState } from "react";
import { Alert, Button, Card, CardTitle, Field, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { startLibrary } from "@/lib/artisan/library-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.library.menao;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);
/** Repère MENAO de la cloison BA13 : 0,35 h de pose au m² (exemple du lot 41). */
const EXAMPLE_HOURS_MILLI = 350;

export type StartTrade = { code: string; label: string; count: number; mine: boolean };

/**
 * Premier passage dans la bibliothèque (F-147, lot 41) : bibliothèque MENAO pour les métiers de la
 * fiche, import du catalogue (bientôt) ou devis, et les deux réglages qui donnent les prix.
 */
export function MenaoLibraryStart({
  trades,
  devisCount,
  hourPriceCents,
  coef,
}: {
  trades: StartTrade[];
  devisCount: number;
  hourPriceCents: number | null;
  coef: string;
}) {
  const [state, formAction, pending] = useActionState(startLibrary, initialFormState);
  const [choice, setChoice] = useState<"menao" | "import" | "devis">("menao");
  const [picked, setPicked] = useState<Set<string>>(() => {
    const mine = trades.filter((tr) => tr.mine).map((tr) => tr.code);
    return new Set(mine.length ? mine : []);
  });
  const [hourPrice, setHourPrice] = useState(
    hourPriceCents === null ? "" : formatEurosInput(hourPriceCents),
  );
  const [coefText, setCoefText] = useState(coef);
  const hourCents = parseEuros(hourPrice);
  const coefBp = parseCoefficient(coefText);
  const count = trades.filter((tr) => picked.has(tr.code)).reduce((s, tr) => s + tr.count, 0);
  const toggle = (code: string) =>
    setPicked((set) => {
      const next = new Set(set);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  return (
    <form action={formAction} className="grid items-start gap-5 lg:grid-cols-[1fr_21rem]">
      <Card className="flex flex-col gap-3.5">
        <CardTitle title={t.startTitle} description={t.startLead} />
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <div role="radiogroup" aria-label={t.choiceLabel} className="flex flex-col gap-3.5">
          <Choice
            icon={<BookOpen aria-hidden="true" className="size-[1.1875rem]" />}
            title={t.menaoTitle}
            text={t.menaoText}
            value="menao"
            checked={choice === "menao"}
            onChange={() => setChoice("menao")}
          >
            <fieldset className="ml-8 flex flex-col gap-2.5">
              <legend className="mb-2.5 text-[0.8125rem] font-semibold text-label">
                {t.tradesLabel}
              </legend>
              <div className="flex flex-wrap gap-2">
                {trades.map((tr) => (
                  <label
                    key={tr.code}
                    className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-input border border-border bg-background px-3 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary"
                  >
                    <input
                      type="checkbox"
                      name="trade"
                      value={tr.code}
                      checked={picked.has(tr.code)}
                      onChange={() => toggle(tr.code)}
                      disabled={choice !== "menao"}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className="inline-flex size-4 items-center justify-center rounded-[4px] border-[1.5px] border-border-strong text-surface peer-checked:border-foreground peer-checked:bg-foreground"
                    >
                      <Check className="size-[0.6875rem]" strokeWidth={3} />
                    </span>
                    {tr.label}
                    <span className="font-medium text-muted-foreground">{tr.count}</span>
                  </label>
                ))}
              </div>
              <span className="text-[0.8125rem] text-muted-foreground">{t.tradesHint(count)}</span>
            </fieldset>
          </Choice>
          <Choice
            icon={<Upload aria-hidden="true" className="size-[1.1875rem]" />}
            title={t.importTitle}
            text={t.importText}
            value="import"
            checked={choice === "import"}
            onChange={() => setChoice("import")}
          />
          <Choice
            icon={<FileText aria-hidden="true" className="size-[1.1875rem]" />}
            title={t.devisTitle}
            text={t.devisText(devisCount)}
            value="devis"
            checked={choice === "devis"}
            onChange={() => setChoice("devis")}
          />
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <CardTitle title={t.settingsTitle} description={t.settingsLead} />
          <Field
            label={fr.pro.library.settings.hourPrice}
            name="hourPrice"
            inputMode="decimal"
            value={hourPrice}
            onChange={(e) => setHourPrice(e.target.value)}
            required={choice === "menao"}
          />
          <Field
            label={fr.pro.library.settings.coef}
            name="coef"
            inputMode="decimal"
            value={coefText}
            onChange={(e) => setCoefText(e.target.value)}
          />
          <p className="rounded-input bg-background px-3 py-2.5 text-sm text-muted-foreground">
            {t.settingsNote}
          </p>
          <Button type="submit" disabled={pending || (choice === "menao" && picked.size === 0)}>
            {t.create}
          </Button>
        </Card>
        <Card className="flex flex-col gap-2">
          <CardTitle title={t.exampleTitle} />
          <dl className="flex flex-col text-sm">
            <div className="flex justify-between gap-3 border-t border-border py-1.5">
              <dt className="text-muted-foreground">
                {t.examplePose(hourCents === null ? "—" : money(hourCents))}
              </dt>
              <dd className="font-bold whitespace-nowrap tabular-nums">
                {hourCents === null
                  ? "—"
                  : money(Math.round((hourCents * EXAMPLE_HOURS_MILLI) / 1000))}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-border py-1.5">
              <dt className="text-muted-foreground">
                {t.exampleSupplies(coefBp === null ? "—" : formatCoefficient(coefBp))}
              </dt>
              <dd className="font-bold whitespace-nowrap">{t.exampleSuppliesValue}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </form>
  );
}

function Choice({
  icon,
  title,
  text,
  value,
  checked,
  onChange,
  disabled = false,
  badge,
  children,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  value: string;
  checked: boolean;
  onChange?: () => void;
  disabled?: boolean;
  badge?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-card bg-surface p-[1.125rem] ${
        checked ? "border-2 border-foreground" : "border border-border"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <label className={`flex items-start gap-3.5 ${disabled ? "" : "cursor-pointer"}`}>
        <input
          type="radio"
          name="choice"
          value={value}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="mt-[0.1875rem] size-[1.125rem] shrink-0 accent-foreground"
        />
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-input bg-background">
          {icon}
        </span>
        <span className="flex flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <b className="text-base">{title}</b>
            {badge && <StatusBadge tone="neutral">{badge}</StatusBadge>}
          </span>
          <span className="text-[0.84375rem] leading-[1.45] text-muted-foreground">{text}</span>
        </span>
      </label>
      {checked && children}
    </div>
  );
}
