"use client";

import {
  DEFAULT_UNIT,
  QUOTE_LINE_TYPES,
  QUOTE_UNITS,
  allowedVatRates,
  formatQuantity,
  lineTotalHtCents,
  lineTtcCents,
  parseEuros,
  parseQuantity,
  quoteTotals,
  type QuoteLineType,
  type QuoteUnit,
} from "@menao/core";
import { quoteLineFormSchema, type QuoteLineInput } from "@menao/validation";
import { Euro, Mic, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Drawer } from "@/components/drawer";
import { Alert, Button, FieldError, Hint, Select, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  saveQuoteDraft,
  searchPreviousLines,
  type PreviousLine,
} from "@/lib/artisan/quote-actions";
import { QuoteDictation } from "./quote-dictation";

const t = fr.pro.quote;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);
const vatLabel = (bp: number) => `${(bp / 100).toLocaleString("fr-FR")} %`;
const priceInput = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, useGrouping: false });

/** `generated` : ligne proposée par la dictée, à vérifier (non enregistré). */
type Line = QuoteLineInput & { key: string; generated?: boolean };

const withoutKey = (l: Line): QuoteLineInput => ({
  type: l.type,
  designation: l.designation,
  description: l.description,
  quantityMilli: l.quantityMilli,
  unit: l.unit,
  unitPriceHtCents: l.unitPriceHtCents,
  vatRateBp: l.vatRateBp,
});

/**
 * Éditeur de devis (F-19), maquettes « Vue d'une génération de devis » : lignes typées, ajout et
 * modification dans la page, totaux en direct (calculs de @menao/core), statut d'enregistrement
 * (Brouillon, Modifications apportées, Enregistré et à jour). La base recalcule à l'enregistrement.
 */
export function QuoteEditor({
  chantierId,
  initialLines,
  saved,
  assujettiTva,
  savedDictation,
}: {
  chantierId: string;
  initialLines: QuoteLineInput[];
  /** Un brouillon existe déjà en base. */
  saved: boolean;
  /** Dictée sauvegardée pour ce chantier (F-19). */
  savedDictation: string | null;
  assujettiTva: boolean;
}) {
  const counter = useRef(initialLines.length);
  const [lines, setLines] = useState<Line[]>(() =>
    initialLines.map((line, i) => ({ ...line, key: `l${i}` })),
  );
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(initialLines));
  const [hasSaved, setHasSaved] = useState(saved);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dictating, setDictating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [generating, startGenerating] = useTransition();
  const router = useRouter();
  // Ligne à remettre sous les yeux après validation (le formulaire se referme).
  const [reveal, setReveal] = useState<{ key: string } | null>(null);

  const plain: QuoteLineInput[] = lines.map(withoutKey);
  const dirty = JSON.stringify(plain) !== snapshot;
  const totals = quoteTotals(plain);
  const rates = allowedVatRates(assujettiTva);
  // Taux proposé : celui de la dernière ligne, sinon le taux normal (ou 0 % en franchise).
  const defaultVat = plain.at(-1)?.vatRateBp ?? rates.at(-1) ?? 0;
  const status = dirty ? "dirty" : hasSaved ? "saved" : "draft";

  useEffect(() => {
    if (reveal) document.getElementById(`ligne-${reveal.key}`)?.scrollIntoView({ block: "center" });
  }, [reveal]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function save() {
    setError(null);
    const toSave = plain;
    startTransition(async () => {
      const result = await saveQuoteDraft(chantierId, toSave);
      if (result.ok) {
        setSnapshot(JSON.stringify(toSave));
        setHasSaved(true);
      } else {
        setError(result.error);
      }
    });
  }

  /** « Générer le devis » : enregistre les modifications, puis ouvre l'aperçu (F-20). */
  function generate() {
    setError(null);
    const toSave = plain;
    startGenerating(async () => {
      if (dirty) {
        const result = await saveQuoteDraft(chantierId, toSave);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSnapshot(JSON.stringify(toSave));
        setHasSaved(true);
      }
      router.push(`/pro/chantiers/${chantierId}/devis/apercu` as Route);
    });
  }

  function addGenerated(generated: QuoteLineInput[]) {
    const added = generated.map((line) => ({
      ...line,
      key: `l${counter.current++}`,
      generated: true,
    }));
    setLines((current) => [...current, ...added]);
    setDictating(false);
    setNotice(t.dictation.generated(added.length));
    if (added[0]) setReveal({ key: added[0].key });
  }

  function upsert(key: string | null, line: QuoteLineInput) {
    const target = key ?? `l${counter.current++}`;
    setLines((current) =>
      key === null
        ? [...current, { ...line, key: target }]
        : current.map((l) => (l.key === key ? { ...line, key } : l)),
    );
    setEditing(null);
    setReveal({ key: target });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <span
            role="status"
            className={`inline-flex items-center rounded-chip px-2.5 py-1 text-xs font-medium ${
              status === "dirty"
                ? "bg-warning-soft text-warning"
                : status === "saved"
                  ? "bg-success-soft text-success"
                  : "bg-background text-muted-foreground"
            }`}
          >
            {status === "dirty"
              ? t.statusDirty
              : status === "saved"
                ? t.statusSaved
                : t.statusDraft}
          </span>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending || generating}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-pill px-2 text-sm font-medium text-primary-strong hover:bg-primary-softer focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none disabled:text-subtle-foreground disabled:hover:bg-transparent"
          >
            {pending ? t.saving : t.save}
            <Save aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-4 py-5 sm:px-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[0.9375rem] font-medium text-foreground/80">{t.lines}</h2>
          <span className="text-xs text-muted-foreground">{t.lineCount(lines.length)}</span>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {lines.length > 0 && (
          <ul className="flex flex-col gap-3">
            {lines.map((line) => (
              <li key={line.key} id={`ligne-${line.key}`} className="scroll-mt-24">
                {editing === line.key ? (
                  <LineForm
                    title={t.editLine}
                    initial={line}
                    rates={rates}
                    defaultVat={defaultVat}
                    onSubmit={(next) => upsert(line.key, next)}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <LineCard
                    line={line}
                    generated={line.generated}
                    assujettiTva={assujettiTva}
                    onEdit={() => setEditing(line.key)}
                    onDelete={() =>
                      setLines((current) => current.filter((l) => l.key !== line.key))
                    }
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        {editing === "new" ? (
          <LineForm
            title={t.addLine}
            initial={null}
            rates={rates}
            defaultVat={defaultVat}
            onSubmit={(next) => upsert(null, next)}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex min-h-14 items-center justify-center gap-2 rounded-card border border-dashed border-border-strong bg-surface/60 text-sm font-medium text-primary-strong hover:bg-surface focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
          >
            <Plus aria-hidden="true" className="size-4" />
            {t.addManual}
          </button>
        )}
      </div>

      <div className="sticky bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <dl className="flex flex-col gap-0.5">
            <div className="flex items-baseline justify-between text-xs text-muted-foreground">
              <dt>{t.totalHt}</dt>
              <dd>{lines.length ? money(totals.totalHtCents) : t.none}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-[0.9375rem]">{t.totalTtc}</dt>
              <dd className="text-xl font-medium text-primary">
                {lines.length ? money(totals.totalTtcCents) : t.none}
              </dd>
            </div>
          </dl>
          {!assujettiTva && <p className="text-xs text-muted-foreground">{t.vatExempt}</p>}
          <Button type="button" variant="outline" size="lg" onClick={() => setDictating(true)}>
            {t.dictation.open}
            <Mic aria-hidden="true" className="size-4" />
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={generate}
            disabled={lines.length === 0 || pending || generating}
          >
            {generating ? t.generating : t.generate}
          </Button>
        </div>
      </div>

      <Drawer
        open={dictating}
        onClose={() => setDictating(false)}
        title={t.dictation.title}
        backLabel={t.dictation.back}
      >
        {dictating && (
          <QuoteDictation
            chantierId={chantierId}
            savedTranscript={savedDictation}
            defaultVatBp={defaultVat}
            onLines={addGenerated}
          />
        )}
      </Drawer>
    </div>
  );
}

function LineCard({
  line,
  generated = false,
  assujettiTva,
  onEdit,
  onDelete,
}: {
  line: QuoteLineInput;
  generated?: boolean;
  assujettiTva: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <span className="flex flex-wrap gap-1.5">
          <span className="rounded-chip bg-background px-2 py-1 text-xs text-muted-foreground">
            {t.types[line.type]}
          </span>
          {generated && (
            <span className="rounded-chip bg-warning-soft px-2 py-1 text-xs font-medium text-warning">
              {t.toReview}
            </span>
          )}
        </span>
        <div className="-mt-1 -mr-1 flex">
          <button
            type="button"
            onClick={onEdit}
            aria-label={t.edit(line.designation)}
            className="inline-flex size-9 items-center justify-center rounded-full text-primary hover:bg-primary-softer focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
          >
            <Pencil aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t.remove(line.designation)}
            className="inline-flex size-9 items-center justify-center rounded-full text-danger hover:bg-danger-soft focus-visible:ring-4 focus-visible:ring-danger/20 focus-visible:outline-none"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
      <p className="font-medium">{line.designation}</p>
      {line.description && <p className="text-xs text-muted-foreground">{line.description}</p>}
      <div className="flex flex-wrap items-end justify-between gap-3 text-xs">
        <dl className="flex gap-8">
          <div>
            <dt className="font-medium">{t.quantity}</dt>
            <dd className="text-muted-foreground">{formatQuantity(line.quantityMilli)}</dd>
          </div>
          <div>
            <dt className="font-medium">{t.unit}</dt>
            <dd className="text-muted-foreground">{t.units[line.unit]}</dd>
          </div>
        </dl>
        <p>
          <span className="text-base font-medium">{money(lineTtcCents(line))}</span>{" "}
          <span className="text-muted-foreground">{assujettiTva ? t.ttc : "HT"}</span>
        </p>
      </div>
    </article>
  );
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 rounded-pill bg-background p-1">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className="min-h-8 flex-1 rounded-pill px-3 text-xs font-medium whitespace-nowrap text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none aria-pressed:bg-surface aria-pressed:text-primary-strong aria-pressed:shadow-card"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function LineForm({
  title,
  initial,
  rates,
  defaultVat,
  onSubmit,
  onCancel,
}: {
  title: string;
  initial: QuoteLineInput | null;
  rates: readonly number[];
  defaultVat: number;
  onSubmit: (line: QuoteLineInput) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [type, setType] = useState<QuoteLineType>(initial?.type ?? "materiel");
  const [designation, setDesignation] = useState(initial?.designation ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [quantity, setQuantity] = useState(initial ? formatQuantity(initial.quantityMilli) : "1");
  const [unit, setUnit] = useState<QuoteUnit>(initial?.unit ?? DEFAULT_UNIT.materiel);
  const [price, setPrice] = useState(initial ? priceInput(initial.unitPriceHtCents) : "");
  const [vat, setVat] = useState(
    initial && rates.includes(initial.vatRateBp) ? initial.vatRateBp : defaultVat,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);

  const quantityMilli = parseQuantity(quantity);
  const unitPrice = parseEuros(price);
  const ht =
    quantityMilli !== null && unitPrice !== null
      ? lineTotalHtCents(quantityMilli, unitPrice)
      : null;
  const ttc =
    quantityMilli !== null && unitPrice !== null
      ? lineTtcCents({ quantityMilli, unitPriceHtCents: unitPrice, vatRateBp: vat })
      : null;
  const priceLabel =
    type === "autre"
      ? t.price
      : type === "main_oeuvre" && unit === "h"
        ? t.hourlyRate
        : t.unitPrice;

  function changeType(next: QuoteLineType) {
    // L'unité suit le type tant que l'artisan ne l'a pas changée.
    if (unit === DEFAULT_UNIT[type]) setUnit(DEFAULT_UNIT[next]);
    setType(next);
  }

  function pick(line: PreviousLine) {
    setType(line.type);
    setDesignation(line.designation);
    setDescription(line.description ?? "");
    if ((QUOTE_UNITS as readonly string[]).includes(line.unit)) setUnit(line.unit as QuoteUnit);
    setPrice(priceInput(line.unitPriceHtCents));
    if (rates.includes(line.vatRateBp)) setVat(line.vatRateBp);
    setSearching(false);
  }

  function submit() {
    const parsed = quoteLineFormSchema.safeParse({
      type,
      designation,
      description,
      quantity,
      unit,
      unitPrice: price,
      vatRateBp: vat,
    });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      return;
    }
    onSubmit(parsed.data);
  }

  const field = (name: string) => ({
    id: `${id}-${name}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${id}-${name}-error` : undefined,
  });
  const error = (name: string) =>
    errors[name] ? <FieldError id={`${id}-${name}-error`}>{errors[name]}</FieldError> : null;

  return (
    <section
      aria-label={title}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 shadow-card sm:p-5"
    >
      <p className="text-xs text-muted-foreground">{title}</p>
      <Segmented
        label={t.lineType}
        options={QUOTE_LINE_TYPES.map((value) => ({ value, label: t.types[value] }))}
        value={type}
        onChange={changeType}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-designation`} className="text-sm font-medium">
          {t.designation}
        </label>
        <input
          {...field("designation")}
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          maxLength={200}
          autoFocus={initial === null}
          className={inputClasses}
        />
        {error("designation")}
        <button
          type="button"
          onClick={() => setSearching(!searching)}
          aria-expanded={searching}
          className="inline-flex items-center gap-1 self-end rounded-md text-xs text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          {searching ? t.closeSearch : t.search}
          {searching ? (
            <X aria-hidden="true" className="size-3.5" />
          ) : (
            <Search aria-hidden="true" className="size-3.5" />
          )}
        </button>
        {searching && <ArticleSearch initialQuery={designation} onPick={pick} />}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-description`} className="text-sm font-medium">
          {t.description} <span className="font-normal text-subtle-foreground">{t.optional}</span>
        </label>
        <input
          {...field("description")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          className={inputClasses}
        />
        {error("description")}
      </div>

      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-quantity`} className="text-sm font-medium">
            {t.quantity}
          </label>
          <input
            {...field("quantity")}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            inputMode="decimal"
            className={inputClasses}
          />
          {error("quantity")}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-unit`} className="text-sm font-medium">
            {t.unit}
          </label>
          <Select
            id={`${id}-unit`}
            value={unit}
            onChange={(e) => setUnit(e.target.value as QuoteUnit)}
          >
            {QUOTE_UNITS.map((value) => (
              <option key={value} value={value}>
                {t.units[value]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-unitPrice`} className="text-sm font-medium">
          {priceLabel}
        </label>
        <div className="relative">
          <input
            {...field("unitPrice")}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className={`${inputClasses} pr-11`}
          />
          <Euro
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted-foreground"
          />
        </div>
        {error("unitPrice")}
      </div>

      <dl className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
        <div className="flex items-center justify-between">
          <dt>{t.totalHt}</dt>
          <dd>{ht !== null ? money(ht) : t.none}</dd>
        </div>
        {rates.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <dt>{t.vat}</dt>
              <dd className="w-44">
                <Segmented
                  label={t.vat}
                  options={rates.map((value) => ({ value, label: vatLabel(value) }))}
                  value={vat}
                  onChange={setVat}
                />
              </dd>
            </div>
            {/* TODO(legal) : conditions des taux réduits à faire valider par l'expert-comptable. */}
            {vat !== 2000 && <Hint>{t.vatHint}</Hint>}
            {error("vatRateBp")}
          </div>
        )}
        <div className="flex items-center justify-between font-medium">
          <dt>{t.totalTtc}</dt>
          <dd>{ttc !== null ? money(ttc) : t.none}</dd>
        </div>
      </dl>

      <div className="flex flex-col items-stretch gap-1">
        <Button type="button" variant="outline" onClick={submit}>
          {t.validate}
        </Button>
        <Button type="button" variant="danger-text" size="sm" onClick={onCancel}>
          {t.cancelLine}
        </Button>
      </div>
    </section>
  );
}

/** « Rechercher l'article » : lignes déjà utilisées dans les devis de l'artisan. */
function ArticleSearch({
  initialQuery,
  onPick,
}: {
  initialQuery: string;
  onPick: (line: PreviousLine) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PreviousLine[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      searchPreviousLines(query).then((found) => {
        if (!cancelled) setResults(found);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="flex flex-col gap-2 rounded-input border border-border bg-background p-3">
      <label htmlFor={id} className="text-xs font-medium">
        {t.searchLabel}
      </label>
      <input
        id={id}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={`${inputClasses} min-h-10 bg-surface`}
      />
      {results?.length === 0 && <p className="text-xs text-muted-foreground">{t.noResult}</p>}
      {results && results.length > 0 && (
        <ul className="flex flex-col gap-1">
          {results.map((line) => (
            <li key={`${line.designation}-${line.unitPriceHtCents}`}>
              <button
                type="button"
                onClick={() => onPick(line)}
                className="flex w-full items-center justify-between gap-3 rounded-input bg-surface px-3 py-2 text-left text-sm hover:bg-primary-softer focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
              >
                <span className="min-w-0 truncate">{line.designation}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {money(line.unitPriceHtCents)} HT
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
