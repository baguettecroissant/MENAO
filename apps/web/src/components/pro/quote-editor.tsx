"use client";

import {
  DEFAULT_UNIT,
  QUOTE_LINE_TYPES,
  QUOTE_UNITS,
  allowedVatRates,
  belowMarginAlert,
  formatQuantity,
  formatRateBp,
  lineCostCents,
  markupRateBp,
  quoteMargin,
  lineTotalHtCents,
  lineTtcCents,
  parseEuros,
  parseQuantity,
  quoteTotals,
  type QuoteLineType,
  type QuoteUnit,
} from "@menao/core";
import { quoteLineFormSchema, type QuoteLineInput } from "@menao/validation";
import {
  BookOpen,
  Check,
  EyeOff,
  Euro,
  Headset,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Drawer } from "@/components/drawer";
import { Alert, Button, FieldError, Hint, Select, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  type LibrarySearchResult,
  saveQuoteDraft,
  searchLibraryWorks,
  searchPreviousLines,
  settleVoiceQuoteDrafts,
  type PreviousLine,
} from "@/lib/artisan/quote-actions";
import { tenderLinesForQuote } from "@/lib/artisan/tender-actions";
import { QuoteConversation } from "./quote-conversation";
import { QuoteDictation } from "./quote-dictation";

const t = fr.pro.quote;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);
const vatLabel = (bp: number) => `${(bp / 100).toLocaleString("fr-FR")} %`;
const priceInput = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, useGrouping: false });

/** Coût privé d'une ligne (bibliothèque d'ouvrages, ADR 0294) : jamais montré au client. */
type LineCost = { unitCostCents: number | null; workId: string | null };

/** `generated` : ligne proposée par la dictée, à vérifier (non enregistré). */
type Line = QuoteLineInput & { key: string; generated?: boolean } & Partial<LineCost>;

const lineCost = (l: Line): LineCost => ({
  unitCostCents: l.unitCostCents ?? null,
  workId: l.workId ?? null,
});

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
  conversation = false,
  voiceDraft = null,
  tenders = [],
  initialCosts = [],
  margin = null,
}: {
  chantierId: string;
  initialLines: QuoteLineInput[];
  /** Un brouillon existe déjà en base. */
  saved: boolean;
  /** Dictée sauvegardée pour ce chantier (F-19). */
  savedDictation: string | null;
  assujettiTva: boolean;
  /** « Dicter avec Manon » inclus dans la formule (ADR 0234). */
  conversation?: boolean;
  /** Lignes d'un appel précédent avec Manon, pas encore reprises ni écartées. */
  voiceDraft?: QuoteLineInput[] | null;
  /** Appels d'offres chiffrés de l'entreprise, à reprendre dans le devis (ADR 0289). */
  tenders?: readonly { id: string; name: string }[];
  /** Coût privé de chaque ligne enregistrée, dans l'ordre (ADR 0294). */
  initialCosts?: readonly (LineCost | null)[];
  /** Marge affichée (patron et chef d'équipe) et seuil d'alerte facultatif ; null : masquée. */
  margin?: { alertBp: number | null } | null;
}) {
  const counter = useRef(initialLines.length);
  const [lines, setLines] = useState<Line[]>(() =>
    initialLines.map((line, i) => ({ ...line, ...(initialCosts[i] ?? {}), key: `l${i}` })),
  );
  const [snapshot, setSnapshot] = useState(() =>
    JSON.stringify([
      initialLines,
      initialLines.map((_, i) => initialCosts[i] ?? { unitCostCents: null, workId: null }),
    ]),
  );
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
  // Devis avec Manon (ADR 0234) : lignes de l'appel en cours, remplacées à chaque proposition ;
  // brouillon à clore dès que le devis est enregistré.
  const camille = useRef<Set<string>>(new Set());
  const voiceUsed = useRef(false);
  const [pendingDraft, setPendingDraft] = useState(voiceDraft?.length ? voiceDraft : null);
  const [tenderId, setTenderId] = useState(tenders[0]?.id ?? "");

  const plain: QuoteLineInput[] = lines.map(withoutKey);
  const costs: LineCost[] = lines.map(lineCost);
  const dirty = JSON.stringify([plain, costs]) !== snapshot;
  const marginOf = quoteMargin(
    lines.map((l) => ({
      totalHtCents: lineTotalHtCents(l.quantityMilli, l.unitPriceHtCents),
      costCents: lineCostCents(l.unitCostCents ?? null, l.quantityMilli),
    })),
  );
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
    const toSaveCosts = costs;
    startTransition(async () => {
      const result = await saveQuoteDraft(chantierId, toSave, toSaveCosts);
      if (result.ok) {
        setSnapshot(JSON.stringify([toSave, toSaveCosts]));
        setHasSaved(true);
        settleVoiceDraft();
      } else {
        setError(result.error);
      }
    });
  }

  /** « Générer le devis » : enregistre les modifications, puis ouvre l'aperçu (F-20). */
  function generate() {
    setError(null);
    const toSave = plain;
    const toSaveCosts = costs;
    startGenerating(async () => {
      if (dirty) {
        const result = await saveQuoteDraft(chantierId, toSave, toSaveCosts);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSnapshot(JSON.stringify([toSave, toSaveCosts]));
        setHasSaved(true);
        settleVoiceDraft();
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

  /** Postes chiffrés d'un DPGF (ADR 0289), ajoutés en lignes à relire. */
  function addTender() {
    if (!tenderId) return;
    startGenerating(async () => {
      const result = await tenderLinesForQuote(tenderId, lines.length);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.lines.length === 0) {
        setNotice(t.fromTender.none);
        return;
      }
      addGenerated(result.lines.map((line) => ({ ...line, description: line.description ?? "" })));
      setNotice(t.fromTender.added(result.lines.length, result.skipped, result.truncated));
    });
  }

  /** Lignes proposées par Manon : la liste de l'appel en cours remplace la précédente. */
  function setCamilleLines(next: QuoteLineInput[]) {
    const previous = camille.current;
    const added = next.map((line) => ({
      ...line,
      key: `l${counter.current++}`,
      generated: true,
    }));
    camille.current = new Set(added.map((line) => line.key));
    voiceUsed.current = true;
    setLines((current) => [...current.filter((l) => !previous.has(l.key)), ...added]);
    setNotice(t.conversation.updated(added.length));
    const last = added.at(-1);
    if (last) setReveal({ key: last.key });
  }

  /** Brouillon d'un appel précédent : ajouté au devis, ou écarté. */
  function resumeDraft(add: boolean) {
    if (add && pendingDraft) {
      addGenerated(pendingDraft);
      voiceUsed.current = true;
    } else {
      void settleVoiceQuoteDrafts(chantierId);
    }
    setPendingDraft(null);
  }

  function settleVoiceDraft() {
    if (!voiceUsed.current) return;
    voiceUsed.current = false;
    void settleVoiceQuoteDrafts(chantierId);
  }

  function upsert(key: string | null, line: QuoteLineInput, cost?: LineCost) {
    const target = key ?? `l${counter.current++}`;
    setLines((current) =>
      key === null
        ? [...current, { ...line, ...cost, key: target }]
        : current.map((l) => (l.key === key ? { ...line, ...(cost ?? lineCost(l)), key } : l)),
    );
    setEditing(null);
    setReveal({ key: target });
  }

  /** Ouvrage « détaillé » de la bibliothèque : ses lignes ajoutées d'un coup (ADR 0294). */
  function addMany(added: LibrarySearchResult["lines"]) {
    const next = added.map((l) => ({
      type: l.type,
      designation: l.designation,
      description: l.description,
      quantityMilli: 1000,
      unit: l.unit as QuoteUnit,
      unitPriceHtCents: l.unitPriceHtCents,
      vatRateBp: rates.includes(l.vatRateBp) ? l.vatRateBp : defaultVat,
      unitCostCents: l.unitCostCents,
      workId: l.workId,
      key: `l${counter.current++}`,
    }));
    setLines((current) => [...current, ...next]);
    setEditing(null);
    if (next[0]) setReveal({ key: next[0].key });
  }

  const statusChip = (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-xs font-bold ${
        status === "dirty"
          ? "bg-warning-soft text-warning"
          : status === "saved"
            ? "bg-success-soft text-success"
            : "bg-border/70 text-label"
      }`}
    >
      {status === "saved" ? (
        <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
      ) : (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      )}
      {status === "dirty" ? t.statusDirty : status === "saved" ? t.statusSaved : t.statusDraft}
    </span>
  );
  const quick =
    "flex items-center gap-3 rounded-card border border-border bg-surface p-4 text-left shadow-card transition-colors hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none lg:flex-col lg:items-start";

  // Refonte « Nette » (ADR 0247) : cartes pour créer vite, lignes dans une carte, total à droite
  // en grand écran et collé en bas de l'écran sur téléphone (un seul bloc, déplacé en CSS).
  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 px-4 pt-6 pb-0 sm:px-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:px-10 lg:pb-12">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">{statusChip}</div>
        <div className={`grid gap-3 ${conversation ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
          <button type="button" onClick={() => setDictating(true)} className={quick}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
              <Sparkles aria-hidden="true" className="size-5" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-semibold">{t.dictation.open}</span>
              <span className="text-[0.8125rem] text-muted-foreground">
                {fr.pro.sheet.quick.dictation}
              </span>
            </span>
          </button>
          {conversation && (
            <QuoteConversation
              chantierId={chantierId}
              assujettiTva={assujettiTva}
              onStart={() => {
                camille.current = new Set();
              }}
              onLines={setCamilleLines}
              trigger={(start) => (
                <button type="button" onClick={start} className={`${quick} w-full flex-1`}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                    <Headset aria-hidden="true" className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-semibold">{t.conversation.start}</span>
                    <span className="text-[0.8125rem] text-muted-foreground first-letter:uppercase">
                      {t.conversation.hint}
                    </span>
                  </span>
                </button>
              )}
            />
          )}
          <button type="button" onClick={() => setEditing("search")} className={quick}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background text-label">
              <Search aria-hidden="true" className="size-5" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-semibold">{fr.pro.sheet.quick.articles}</span>
              <span className="text-[0.8125rem] text-muted-foreground">
                {fr.pro.sheet.quick.articlesHint}
              </span>
            </span>
          </button>
        </div>
        {tenders.length > 0 && (
          <div className="flex flex-col gap-3 rounded-card border border-border bg-surface px-4 py-3 shadow-card">
            <span className="flex min-w-0 flex-1 flex-col">
              <label htmlFor="quote-tender" className="font-semibold">
                {t.fromTender.label}
              </label>
              <span className="text-[0.8125rem] text-muted-foreground">{t.fromTender.hint}</span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                id="quote-tender"
                aria-label={t.fromTender.select}
                value={tenderId}
                onChange={(e) => setTenderId(e.target.value)}
                className="min-w-0 flex-1"
              >
                {tenders.map((tender) => (
                  <option key={tender.id} value={tender.id}>
                    {tender.name}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                block={false}
                disabled={generating || !tenderId}
                onClick={addTender}
              >
                {t.fromTender.add}
              </Button>
            </div>
          </div>
        )}
        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {pendingDraft && (
          <div className="flex flex-col gap-3 rounded-card border border-primary/30 bg-primary-softer px-4 py-3">
            <p className="text-sm text-primary-strong">
              {t.conversation.draft(pendingDraft.length)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" block={false} onClick={() => resumeDraft(true)}>
                {t.conversation.draftAdd}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                block={false}
                onClick={() => resumeDraft(false)}
              >
                {t.conversation.draftDiscard}
              </Button>
            </div>
          </div>
        )}
        <section
          aria-labelledby="lignes-du-devis"
          className="overflow-hidden rounded-card border border-border bg-surface shadow-card"
        >
          <div className="flex items-baseline justify-between gap-3 px-4 pt-5 pb-2 sm:px-5">
            <h2 id="lignes-du-devis" className="text-lg sm:text-xl">
              {t.lines}
            </h2>
            <span className="text-sm text-muted-foreground">{t.lineCount(lines.length)}</span>
          </div>
          {lines.length > 0 && (
            <ul className="divide-y divide-border">
              {lines.map((line) => (
                <li key={line.key} id={`ligne-${line.key}`} className="scroll-mt-24">
                  {editing === line.key ? (
                    <div className="p-3 sm:p-4">
                      <LineForm
                        title={t.editLine}
                        initial={line}
                        initialCost={lineCost(line)}
                        rates={rates}
                        defaultVat={defaultVat}
                        library={margin !== null}
                        onSubmit={(next, cost) => upsert(line.key, next, cost)}
                        onSubmitMany={addMany}
                        onCancel={() => setEditing(null)}
                      />
                    </div>
                  ) : (
                    <LineCard
                      line={line}
                      generated={line.generated}
                      assujettiTva={assujettiTva}
                      costCents={
                        margin === null
                          ? undefined
                          : lineCostCents(line.unitCostCents ?? null, line.quantityMilli)
                      }
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
          <div className="border-t border-border p-3 sm:p-4">
            {editing === "new" || editing === "search" ? (
              <LineForm
                title={t.addLine}
                initial={null}
                initialCost={null}
                rates={rates}
                defaultVat={defaultVat}
                library={margin !== null}
                startSearching={editing === "search"}
                onSubmit={(next, cost) => upsert(null, next, cost)}
                onSubmitMany={addMany}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditing("new")}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-input border-[1.5px] border-dashed border-border-strong text-[0.9375rem] font-semibold text-primary-strong hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
              >
                <Plus aria-hidden="true" className="size-4" strokeWidth={2.4} />
                {t.addManual}
              </button>
            )}
          </div>
        </section>
      </div>

      <aside
        aria-label={t.totalTtc}
        className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 lg:top-24 lg:bottom-auto lg:mx-0 lg:flex lg:flex-col lg:gap-4 lg:rounded-card lg:border lg:bg-surface lg:p-6 lg:shadow-card lg:backdrop-blur-none"
      >
        <div className="flex items-center gap-4 lg:flex-col lg:items-stretch lg:gap-3">
          <dl className="flex min-w-0 flex-1 flex-col lg:gap-3">
            <div className="flex flex-col lg:gap-1">
              <dt className="text-[0.8125rem] text-muted-foreground lg:text-sm lg:font-semibold lg:text-label">
                {t.totalTtc}
              </dt>
              <dd className="font-display text-2xl leading-tight font-bold tracking-[-0.02em] tabular-nums lg:text-[2.375rem] lg:leading-none lg:tracking-[-0.03em]">
                {lines.length ? money(totals.totalTtcCents) : t.none}
              </dd>
            </div>
            <div className="hidden flex-col lg:flex">
              <div className="flex justify-between border-t border-border py-2 text-[0.9375rem]">
                <dt className="text-muted-foreground">{t.totalHt}</dt>
                <dd className="font-semibold tabular-nums">
                  {lines.length ? money(totals.totalHtCents) : t.none}
                </dd>
              </div>
              {totals.vat.map((v) => (
                <div
                  key={v.rateBp}
                  className="flex justify-between border-t border-border py-2 text-[0.9375rem]"
                >
                  <dt className="text-muted-foreground">
                    {t.vat} {vatLabel(v.rateBp)}
                  </dt>
                  <dd className="font-semibold tabular-nums">{money(v.tvaCents)}</dd>
                </div>
              ))}
            </div>
          </dl>
          <div className="flex shrink-0 items-center gap-2 lg:flex-col lg:items-stretch">
            <button
              type="button"
              onClick={save}
              disabled={!dirty || pending || generating}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-pill border border-border-strong bg-surface px-3 text-sm font-semibold text-foreground hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none disabled:text-subtle-foreground disabled:hover:bg-surface sm:px-4 lg:order-last"
            >
              <Save aria-hidden="true" className="size-4" />
              <span className="sr-only sm:not-sr-only">{pending ? t.saving : t.save}</span>
            </button>
            <Button
              type="button"
              size="lg"
              block={false}
              className="lg:w-full"
              onClick={generate}
              disabled={lines.length === 0 || pending || generating}
            >
              {generating ? t.generating : t.generate}
            </Button>
          </div>
        </div>
        {margin !== null && lines.length > 0 && (
          <MarginPanel margin={marginOf} alertBp={margin.alertBp} />
        )}
        {!assujettiTva && (
          <p className="hidden text-xs text-muted-foreground lg:block">{t.vatExempt}</p>
        )}
        <p className="hidden text-[0.8125rem] text-muted-foreground lg:block">
          {fr.pro.sheet.quick.nextSteps}
        </p>
      </aside>

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
  costCents,
  onEdit,
  onDelete,
}: {
  line: QuoteLineInput;
  generated?: boolean;
  assujettiTva: boolean;
  /** Coût de la ligne (privé) ; undefined : marge masquée, null : coût inconnu. */
  costCents?: number | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ht = lineTotalHtCents(line.quantityMilli, line.unitPriceHtCents);
  const rate = costCents == null ? null : markupRateBp(ht, costCents);
  const typeTone =
    line.type === "materiel"
      ? "bg-primary-soft text-primary-strong"
      : line.type === "main_oeuvre"
        ? "bg-success-soft text-success"
        : "bg-border/70 text-label";
  return (
    <article className="flex items-start gap-4 px-4 py-4 sm:px-5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap gap-1.5">
          <span className={`rounded-chip px-2 py-0.5 text-xs font-bold ${typeTone}`}>
            {t.types[line.type]}
          </span>
          {generated && (
            <span className="inline-flex items-center gap-1.5 rounded-chip bg-warning-soft px-2 py-0.5 text-xs font-bold text-warning">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
              {t.toReview}
            </span>
          )}
          {costCents !== undefined && (
            <span
              className={`rounded-chip px-2 py-0.5 text-xs font-bold ${
                rate === null
                  ? "bg-border/70 text-label"
                  : rate < 0
                    ? "bg-danger-soft text-danger"
                    : "bg-success-soft text-success"
              }`}
            >
              {rate === null
                ? t.library.unknownCost
                : rate < 0
                  ? t.library.loss
                  : t.library.lineMargin(formatRateBp(rate))}
            </span>
          )}
        </span>
        <p className="text-base font-semibold">{line.designation}</p>
        {line.description && <p className="text-sm text-muted-foreground">{line.description}</p>}
        <p className="text-sm text-label">
          {formatQuantity(line.quantityMilli)} {t.unitsShort[line.unit]} ×{" "}
          {money(line.unitPriceHtCents)} HT
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <p className="text-right">
          <span className="font-display block text-[1.0625rem] font-bold tabular-nums">
            {money(lineTtcCents(line))}
          </span>
          <span className="text-xs text-muted-foreground">{assujettiTva ? t.ttc : "HT"}</span>
        </p>
        <div className="-mr-2 flex">
          <button
            type="button"
            onClick={onEdit}
            aria-label={t.edit(line.designation)}
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
          >
            <Pencil aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t.remove(line.designation)}
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-danger-soft hover:text-danger focus-visible:ring-4 focus-visible:ring-danger/20 focus-visible:outline-none"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
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
  initialCost,
  rates,
  defaultVat,
  library = false,
  startSearching = false,
  onSubmit,
  onSubmitMany,
  onCancel,
}: {
  title: string;
  initial: QuoteLineInput | null;
  /** Coût privé de la ligne modifiée (ADR 0294). */
  initialCost: LineCost | null;
  rates: readonly number[];
  defaultVat: number;
  /** Ouvrages de la bibliothèque proposés dans la recherche (patron et chef d'équipe). */
  library?: boolean;
  /** « Mes articles » : la recherche des articles déjà chiffrés s'ouvre tout de suite. */
  startSearching?: boolean;
  onSubmit: (line: QuoteLineInput, cost?: LineCost) => void;
  /** Ouvrage détaillé : plusieurs lignes ajoutées d'un coup. */
  onSubmitMany: (lines: LibrarySearchResult["lines"]) => void;
  onCancel: () => void;
}) {
  const [cost, setCost] = useState<LineCost | null>(initialCost);
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
  const [searching, setSearching] = useState(startSearching);

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

  /** Ouvrage de la bibliothèque : la ligne arrive avec son coût privé. */
  function pickWork(work: LibrarySearchResult) {
    if (work.lines.length > 1) {
      onSubmitMany(work.lines);
      return;
    }
    const line = work.lines[0];
    if (!line) return;
    setType(line.type);
    setDesignation(line.designation);
    setDescription(line.description);
    if ((QUOTE_UNITS as readonly string[]).includes(line.unit)) setUnit(line.unit as QuoteUnit);
    setPrice(priceInput(line.unitPriceHtCents));
    if (rates.includes(line.vatRateBp)) setVat(line.vatRateBp);
    setCost({ unitCostCents: line.unitCostCents, workId: line.workId });
    setSearching(false);
  }

  function pick(line: PreviousLine) {
    setCost({ unitCostCents: null, workId: null });
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
    onSubmit(parsed.data, cost ?? undefined);
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
        {searching && (
          <ArticleSearch
            initialQuery={designation}
            library={library}
            onPick={pick}
            onPickWork={pickWork}
          />
        )}
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
  library,
  onPick,
  onPickWork,
}: {
  initialQuery: string;
  library: boolean;
  onPick: (line: PreviousLine) => void;
  onPickWork: (work: LibrarySearchResult) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PreviousLine[] | null>(null);
  const [works, setWorks] = useState<LibrarySearchResult[]>([]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      searchPreviousLines(query).then((found) => {
        if (!cancelled) setResults(found);
      });
      if (library) {
        searchLibraryWorks(query).then((found) => {
          if (!cancelled) setWorks(found);
        });
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, library]);

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
      {works.length > 0 && (
        <>
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            {t.library.heading}
          </p>
          <ul className="flex flex-col gap-1">
            {works.map((work) => (
              <li key={work.workId}>
                <button
                  type="button"
                  onClick={() => onPickWork(work)}
                  className="flex w-full items-center gap-3 rounded-input bg-surface px-3 py-2 text-left text-sm hover:bg-primary-softer focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
                >
                  <BookOpen aria-hidden="true" className="size-4 shrink-0 text-primary-strong" />
                  <span className="min-w-0 flex-1 truncate">
                    {work.designation}
                    {work.detailed && (
                      <span className="text-xs text-muted-foreground"> · {t.library.detailed}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {money(work.priceCents)} HT
                  </span>
                  {work.markupBp !== null && (
                    <span className="shrink-0 rounded-chip bg-success-soft px-1.5 py-0.5 text-xs font-bold text-success">
                      {formatRateBp(work.markupBp)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {results && results.length > 0 && (
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              {t.library.previous}
            </p>
          )}
        </>
      )}
      {results?.length === 0 && works.length === 0 && (
        <p className="text-xs text-muted-foreground">{t.noResult}</p>
      )}
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

/** « Votre marge » (ADR 0294) : pour l'artisan seul, sur les lignes dont le coût est connu. */
function MarginPanel({
  margin,
  alertBp,
}: {
  margin: ReturnType<typeof quoteMargin>;
  alertBp: number | null;
}) {
  const below = belowMarginAlert(margin.markupBp, alertBp);
  return (
    <section
      aria-label={t.library.marginTitle}
      className="hidden flex-col gap-2 rounded-input border border-border p-3 lg:flex"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t.library.marginTitle}</h3>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <EyeOff aria-hidden="true" className="size-3.5" />
          {t.library.private}
        </span>
      </div>
      {margin.marginCents === null || margin.markupBp === null ? (
        <p className="text-sm text-muted-foreground">{t.library.none}</p>
      ) : (
        <>
          <p className="flex items-baseline gap-2">
            <span className="font-display text-xl font-bold tabular-nums">
              {money(margin.marginCents)}
            </span>
            <span
              className={`text-sm font-bold ${margin.markupBp < 0 || below ? "text-danger" : "text-success"}`}
            >
              {formatRateBp(margin.markupBp)}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {t.library.counted(margin.counted, margin.lines)}
            {alertBp !== null && ` ${t.library.threshold(formatRateBp(alertBp))}.`}
          </p>
          {below && alertBp !== null && (
            <p
              role="status"
              className="rounded-input bg-warning-soft px-3 py-2 text-xs text-warning"
            >
              {t.library.below(formatRateBp(margin.markupBp), formatRateBp(alertBp))}
            </p>
          )}
        </>
      )}
    </section>
  );
}
